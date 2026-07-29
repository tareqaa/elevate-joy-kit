-- 1) New order status
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';

-- 2) Refund audit log
CREATE TABLE IF NOT EXISTS public.refund_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_number TEXT,
  user_id UUID,
  admin_id UUID,
  admin_email TEXT,
  amount_jod NUMERIC NOT NULL DEFAULT 0,
  xp_removed INTEGER NOT NULL DEFAULT 0,
  coins_removed BIGINT NOT NULL DEFAULT 0,
  level_before TEXT,
  level_after TEXT,
  badges_removed INTEGER NOT NULL DEFAULT 0,
  avatars_locked INTEGER NOT NULL DEFAULT 0,
  coupons_revoked INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.refund_log TO authenticated;
GRANT ALL ON public.refund_log TO service_role;

ALTER TABLE public.refund_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view refund log" ON public.refund_log;
CREATE POLICY "Admins can view refund log"
  ON public.refund_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS refund_log_order_idx ON public.refund_log(order_id);
CREATE INDEX IF NOT EXISTS refund_log_user_idx ON public.refund_log(user_id);

-- 3) Revoke rewards the user is no longer eligible for
CREATE OR REPLACE FUNCTION public.revoke_ineligible_rewards(_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b RECORD;
  _orders INT; _spent NUMERIC; _lvl TEXT; _reviews INT; _ok BOOLEAN;
  _sort INT;
  _badges INT := 0; _avatars INT := 0; _coupons INT := 0;
  _n INT;
BEGIN
  SELECT count(*), COALESCE(sum(total_jod),0) INTO _orders, _spent
    FROM public.orders WHERE user_id = _user_id AND status = 'delivered';
  SELECT level_code INTO _lvl FROM public.profiles WHERE id = _user_id;
  SELECT count(*) INTO _reviews FROM public.reviews WHERE user_id = _user_id AND status = 'approved';
  SELECT COALESCE(sort_order, 0) INTO _sort FROM public.levels WHERE code = _lvl;
  _sort := COALESCE(_sort, 0);

  -- badges no longer earned
  FOR b IN
    SELECT bd.* FROM public.badges bd
    JOIN public.user_badges ub ON ub.badge_id = bd.id AND ub.user_id = _user_id
  LOOP
    _ok := false;
    IF b.criteria->>'type' = 'orders' THEN _ok := _orders >= COALESCE((b.criteria->>'count')::int, 1);
    ELSIF b.criteria->>'type' = 'spending' THEN _ok := _spent >= COALESCE((b.criteria->>'amount')::numeric, 0);
    ELSIF b.criteria->>'type' = 'level' THEN _ok := _lvl = (b.criteria->>'code');
    ELSIF b.criteria->>'type' = 'reviews' THEN _ok := _reviews >= COALESCE((b.criteria->>'count')::int, 1);
    ELSE _ok := true;
    END IF;
    IF NOT _ok THEN
      DELETE FROM public.user_badges WHERE user_id = _user_id AND badge_id = b.id;
      _badges := _badges + 1;
    END IF;
  END LOOP;

  -- avatars unlocked through a higher level
  WITH locked AS (
    DELETE FROM public.user_avatars ua
    USING public.avatars a, public.avatar_collections c, public.levels l
    WHERE ua.user_id = _user_id
      AND a.id = ua.avatar_id
      AND c.id = a.collection_id
      AND l.code = c.required_level_code
      AND l.sort_order > _sort
    RETURNING ua.avatar_id
  )
  SELECT count(*) INTO _n FROM locked;
  _avatars := COALESCE(_n, 0);

  -- unused level coupons above the new level
  WITH revoked AS (
    DELETE FROM public.user_coupons uc
    USING public.levels l
    WHERE uc.user_id = _user_id
      AND uc.used_at IS NULL
      AND l.code = uc.level_code
      AND l.sort_order > _sort
    RETURNING uc.id
  )
  SELECT count(*) INTO _n FROM revoked;
  _coupons := COALESCE(_n, 0);

  -- reset avatar selection if it got locked
  UPDATE public.profiles p
     SET avatar_id = NULL
   WHERE p.id = _user_id
     AND p.avatar_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_avatars ua WHERE ua.user_id = _user_id AND ua.avatar_id = p.avatar_id);

  RETURN jsonb_build_object('badges_removed', _badges, 'avatars_locked', _avatars, 'coupons_revoked', _coupons);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_ineligible_rewards(UUID) FROM PUBLIC, anon, authenticated;

-- 4) Transactional refund
CREATE OR REPLACE FUNCTION public.admin_refund_order(_order_id UUID, _amount NUMERIC, _reason TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders%ROWTYPE;
  _email TEXT;
  _xp INT := 0;
  _coins BIGINT := 0;
  _paid NUMERIC := 0;
  _level_before TEXT; _level_after TEXT;
  _bal NUMERIC;
  _cleanup jsonb := '{}'::jsonb;
  _log_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'غير مصرح');
  END IF;
  IF COALESCE(TRIM(_reason), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'سبب الاسترجاع مطلوب');
  END IF;
  IF _amount IS NULL OR _amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'أدخل مبلغاً صحيحاً');
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'الطلب غير موجود');
  END IF;
  IF o.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'تم استرجاع هذا الطلب مسبقاً');
  END IF;
  IF _amount > COALESCE(o.paid_jod, o.total_jod, 0) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'المبلغ أكبر من قيمة الطلب');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  IF o.user_id IS NOT NULL THEN
    SELECT level_code INTO _level_before FROM public.profiles WHERE id = o.user_id;

    -- store credit
    IF _amount > 0 THEN
      UPDATE public.profiles
         SET store_credit_jod = GREATEST(COALESCE(store_credit_jod,0) + _amount, 0)
       WHERE id = o.user_id
       RETURNING store_credit_jod INTO _bal;
      INSERT INTO public.store_credit_transactions (user_id, amount_jod, balance_after, kind, reason, order_id, actor_id)
      VALUES (o.user_id, _amount, _bal, 'refund',
              'استرجاع الطلب ' || o.order_number || ' — ' || TRIM(_reason), o.id, auth.uid());
    END IF;

    -- reverse loyalty gains from this order
    _xp := COALESCE(o.xp_awarded, 0);
    _coins := COALESCE(o.coins_awarded, 0);
    _paid := COALESCE(o.paid_jod, o.total_jod, 0);

    IF _xp > 0 OR _coins > 0 OR _paid > 0 THEN
      UPDATE public.profiles
         SET xp = GREATEST(COALESCE(xp,0) - _xp, 0),
             gx_coins = GREATEST(gx_coins - _coins, 0),
             total_spent = GREATEST(COALESCE(total_spent,0) - _paid, 0),
             orders_count = GREATEST(orders_count - 1, 0)
       WHERE id = o.user_id;
    END IF;

    IF _xp > 0 THEN
      INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id)
      VALUES (o.user_id, -_xp, (SELECT xp FROM public.profiles WHERE id = o.user_id), 'reversal',
              'استرجاع الطلب ' || o.order_number, o.id);
    END IF;
    IF _coins > 0 THEN
      INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id)
      VALUES (o.user_id, -_coins, (SELECT gx_coins FROM public.profiles WHERE id = o.user_id),
              'reversal', 'reversal', 'استرجاع الطلب ' || o.order_number, o.id);
    END IF;

    PERFORM public.sync_user_level(o.user_id);
    SELECT level_code INTO _level_after FROM public.profiles WHERE id = o.user_id;
    _cleanup := public.revoke_ineligible_rewards(o.user_id);
  END IF;

  UPDATE public.orders
     SET status = 'refunded',
         xp_awarded = 0,
         coins_awarded = 0,
         admin_notes = COALESCE(admin_notes, '') ||
           CASE WHEN COALESCE(admin_notes,'') = '' THEN '' ELSE E'\n' END ||
           'استرجاع ' || _amount::text || ' د.أ — ' || TRIM(_reason),
         updated_at = now()
   WHERE id = o.id;

  INSERT INTO public.refund_log (
    order_id, order_number, user_id, admin_id, admin_email, amount_jod,
    xp_removed, coins_removed, level_before, level_after,
    badges_removed, avatars_locked, coupons_revoked, reason
  ) VALUES (
    o.id, o.order_number, o.user_id, auth.uid(), _email, _amount,
    _xp, _coins, _level_before, _level_after,
    COALESCE((_cleanup->>'badges_removed')::int, 0),
    COALESCE((_cleanup->>'avatars_locked')::int, 0),
    COALESCE((_cleanup->>'coupons_revoked')::int, 0),
    TRIM(_reason)
  ) RETURNING id INTO _log_id;

  INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _email, 'order.refunded', 'order', o.id::text,
          jsonb_build_object('order_number', o.order_number, 'amount', _amount,
                             'xp_removed', _xp, 'coins_removed', _coins,
                             'level_before', _level_before, 'level_after', _level_after,
                             'cleanup', _cleanup, 'reason', TRIM(_reason)));

  IF o.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, body)
    VALUES (o.user_id, o.id, 'order_refunded', 'تم استرجاع طلبك 💸',
            'الطلب ' || o.order_number || ' تم استرجاعه بمبلغ ' || _amount::text || ' د.أ إلى رصيد المتجر.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'refund_id', _log_id, 'amount', _amount,
    'xp_removed', _xp, 'coins_removed', _coins,
    'level_before', _level_before, 'level_after', _level_after,
    'cleanup', _cleanup
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_refund_order(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_order(UUID, NUMERIC, TEXT) TO authenticated;