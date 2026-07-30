
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_refunded BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xp_reversed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_reversed BIGINT NOT NULL DEFAULT 0;

UPDATE public.orders
   SET subtotal_jod = COALESCE(total_jod,0) + COALESCE(discount_jod,0)
 WHERE subtotal_jod = 0;

UPDATE public.orders
   SET refunded_jod = COALESCE(paid_jod, total_jod, 0)
 WHERE status = 'refunded' AND refunded_jod = 0;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gx_coins_non_negative;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gx_coins_non_negative CHECK (gx_coins >= 0) NOT VALID;

-- Idempotent proportional return of the coins SPENT on an order.
CREATE OR REPLACE FUNCTION public.refund_order_coins(_order_id uuid, _ratio numeric)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE o public.orders%ROWTYPE; target BIGINT; delta BIGINT; after_bal BIGINT; r NUMERIC;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR o.user_id IS NULL THEN RETURN 0; END IF;
  IF COALESCE(o.coins_used,0) <= 0 THEN RETURN 0; END IF;

  r := LEAST(GREATEST(COALESCE(_ratio,0), 0), 1);
  target := LEAST(floor(o.coins_used * r)::bigint, o.coins_used::bigint);
  delta := target - COALESCE(o.coins_refunded,0);
  IF delta <= 0 THEN RETURN 0; END IF;

  UPDATE public.profiles SET gx_coins = gx_coins + delta WHERE id = o.user_id
    RETURNING gx_coins INTO after_bal;

  INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id, metadata)
  VALUES (o.user_id, delta, after_bal, 'refund', 'order_refund',
          'إرجاع GX Coins للطلب ' || o.order_number, o.id,
          jsonb_build_object('ratio', r, 'coins_used', o.coins_used, 'coins_refunded_total', target,
                             'balance_before', after_bal - delta));

  UPDATE public.orders SET coins_refunded = target, updated_at = now() WHERE id = o.id;
  RETURN delta;
END $$;

REVOKE ALL ON FUNCTION public.refund_order_coins(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Full/partial refund: money back + proportional coins back, never twice.
CREATE OR REPLACE FUNCTION public.admin_refund_order(_order_id uuid, _amount numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders%ROWTYPE;
  _email TEXT;
  _paid NUMERIC; _remaining NUMERIC; _ratio NUMERIC;
  _orig_xp INT; _orig_coins BIGINT;
  _xp_target INT; _coins_target BIGINT;
  _xp_del INT; _coins_del BIGINT;
  _coins_returned BIGINT := 0;
  _level_before TEXT; _level_after TEXT;
  _bal NUMERIC; _cbal BIGINT;
  _cleanup jsonb := '{}'::jsonb;
  _log_id UUID;
  _full BOOLEAN;
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
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'الطلب غير موجود'); END IF;

  _paid := COALESCE(o.paid_jod, o.total_jod, 0);
  _remaining := GREATEST(_paid - COALESCE(o.refunded_jod,0), 0);

  IF o.status::text = 'refunded' AND _remaining <= 0.0049 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'تم استرجاع هذا الطلب بالكامل مسبقاً');
  END IF;
  IF _paid > 0 AND _remaining <= 0.0049 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'تم استرجاع كامل قيمة الطلب مسبقاً');
  END IF;
  IF _amount > _remaining + 0.0049 THEN
    RETURN jsonb_build_object('ok', false, 'message',
      'المبلغ أكبر من المتبقي القابل للاسترجاع (' || round(_remaining,2)::text || ' د.أ)');
  END IF;

  _ratio := CASE WHEN _paid > 0 THEN LEAST((COALESCE(o.refunded_jod,0) + _amount) / _paid, 1) ELSE 1 END;
  _full := _ratio >= 0.9999;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  IF o.user_id IS NOT NULL THEN
    SELECT level_code INTO _level_before FROM public.profiles WHERE id = o.user_id;

    IF _amount > 0 THEN
      UPDATE public.profiles
         SET store_credit_jod = GREATEST(COALESCE(store_credit_jod,0) + _amount, 0)
       WHERE id = o.user_id
       RETURNING store_credit_jod INTO _bal;
      INSERT INTO public.store_credit_transactions (user_id, amount_jod, balance_after, kind, reason, order_id, actor_id)
      VALUES (o.user_id, _amount, _bal, 'refund',
              'استرجاع الطلب ' || o.order_number || ' — ' || TRIM(_reason), o.id, auth.uid());
    END IF;

    -- Return the coins the customer SPENT on this order (proportional, once).
    _coins_returned := public.refund_order_coins(o.id, _ratio);

    -- Reverse the loyalty EARNED by this order, proportionally.
    _orig_xp := COALESCE(o.xp_awarded,0) + COALESCE(o.xp_reversed,0);
    _orig_coins := COALESCE(o.coins_awarded,0) + COALESCE(o.coins_reversed,0);
    _xp_target := floor(_orig_xp * _ratio)::int;
    _coins_target := floor(_orig_coins * _ratio)::bigint;
    _xp_del := GREATEST(_xp_target - COALESCE(o.xp_reversed,0), 0);
    _coins_del := GREATEST(_coins_target - COALESCE(o.coins_reversed,0), 0);

    IF _xp_del > 0 OR _coins_del > 0 OR _amount > 0 THEN
      UPDATE public.profiles
         SET xp = GREATEST(COALESCE(xp,0) - _xp_del, 0),
             gx_coins = GREATEST(gx_coins - _coins_del, 0),
             total_spent = GREATEST(COALESCE(total_spent,0) - _amount, 0)
       WHERE id = o.user_id;
    END IF;

    IF _full THEN
      UPDATE public.profiles SET orders_count = GREATEST(orders_count - 1, 0) WHERE id = o.user_id;
    END IF;

    IF _xp_del > 0 THEN
      INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id)
      VALUES (o.user_id, -_xp_del, (SELECT xp FROM public.profiles WHERE id = o.user_id), 'reversal',
              'استرجاع الطلب ' || o.order_number, o.id);
    END IF;
    IF _coins_del > 0 THEN
      SELECT gx_coins INTO _cbal FROM public.profiles WHERE id = o.user_id;
      INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id, metadata)
      VALUES (o.user_id, -_coins_del, _cbal, 'reversal', 'order_refund',
              'سحب مكافأة الطلب ' || o.order_number, o.id,
              jsonb_build_object('ratio', _ratio, 'balance_before', _cbal + _coins_del));
    END IF;
  END IF;

  UPDATE public.orders
     SET status = CASE WHEN _full THEN 'refunded'::order_status ELSE status END,
         refunded_jod = COALESCE(refunded_jod,0) + _amount,
         refunded_at = CASE WHEN _full THEN now() ELSE refunded_at END,
         xp_awarded = GREATEST(COALESCE(xp_awarded,0) - _xp_del, 0),
         coins_awarded = GREATEST(COALESCE(coins_awarded,0) - _coins_del, 0),
         xp_reversed = COALESCE(xp_reversed,0) + _xp_del,
         coins_reversed = COALESCE(coins_reversed,0) + _coins_del,
         admin_notes = COALESCE(admin_notes, '') ||
           CASE WHEN COALESCE(admin_notes,'') = '' THEN '' ELSE E'\n' END ||
           CASE WHEN _full THEN 'استرجاع كامل ' ELSE 'استرجاع جزئي ' END
           || _amount::text || ' د.أ — ' || TRIM(_reason)
           || CASE WHEN _coins_returned > 0 THEN ' — إعادة ' || _coins_returned::text || ' GX Coins' ELSE '' END,
         updated_at = now()
   WHERE id = o.id;

  IF o.user_id IS NOT NULL THEN
    PERFORM public.sync_user_level(o.user_id);
    SELECT level_code INTO _level_after FROM public.profiles WHERE id = o.user_id;
    IF _full THEN _cleanup := public.revoke_ineligible_rewards(o.user_id); END IF;
  END IF;

  INSERT INTO public.refund_log (
    order_id, order_number, user_id, admin_id, admin_email, amount_jod,
    xp_removed, coins_removed, level_before, level_after,
    badges_removed, avatars_locked, coupons_revoked, reason
  ) VALUES (
    o.id, o.order_number, o.user_id, auth.uid(), _email, _amount,
    _xp_del, _coins_del, _level_before, _level_after,
    COALESCE((_cleanup->>'badges_removed')::int, 0),
    COALESCE((_cleanup->>'avatars_locked')::int, 0),
    COALESCE((_cleanup->>'coupons_revoked')::int, 0),
    TRIM(_reason) || CASE WHEN _coins_returned > 0 THEN ' — أُعيدت ' || _coins_returned::text || ' GX Coins' ELSE '' END
  ) RETURNING id INTO _log_id;

  INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _email, CASE WHEN _full THEN 'order.refunded' ELSE 'order.partially_refunded' END,
          'order', o.id::text,
          jsonb_build_object('order_number', o.order_number, 'amount', _amount, 'ratio', _ratio,
                             'coins_returned', _coins_returned, 'xp_removed', _xp_del,
                             'coins_removed', _coins_del, 'reason', TRIM(_reason)));

  IF o.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, body)
    VALUES (o.user_id, o.id, 'order_refunded', 'تم استرجاع مبلغ من طلبك 💸',
            'الطلب ' || o.order_number || ' تم استرجاع ' || _amount::text || ' د.أ إلى رصيد المتجر.'
            || CASE WHEN _coins_returned > 0 THEN ' وأُعيدت ' || _coins_returned::text || ' GX Coins.' ELSE '' END);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'refund_id', _log_id, 'amount', _amount, 'full', _full,
    'coins_returned', _coins_returned, 'xp_removed', _xp_del, 'coins_removed', _coins_del,
    'level_before', _level_before, 'level_after', _level_after, 'cleanup', _cleanup
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_refund_order(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_order(uuid, numeric, text) TO authenticated;

-- Cancelling an order must also return the coins spent on it (once).
CREATE OR REPLACE FUNCTION public.return_coins_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.user_id IS NOT NULL AND COALESCE(NEW.coins_used,0) > 0 THEN
    PERFORM public.refund_order_coins(NEW.id, 1);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_return_coins_on_cancel ON public.orders;
CREATE TRIGGER trg_return_coins_on_cancel
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.return_coins_on_cancel();

-- Admin edit of an order's amounts / coins usage, atomic and balance-safe.
CREATE OR REPLACE FUNCTION public.admin_set_order_amounts(
  _order_id uuid, _subtotal_jod numeric, _coins_used bigint, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o public.orders%ROWTYPE;
  _email TEXT;
  _coupon_disc NUMERIC; _coins_disc NUMERIC; _max_coins BIGINT;
  _delta BIGINT; _bal BIGINT; _after BIGINT;
  _total NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'غير مصرح');
  END IF;
  IF COALESCE(TRIM(_reason),'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'السبب مطلوب');
  END IF;
  IF _subtotal_jod IS NULL OR _subtotal_jod < 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'قيمة الطلب غير صحيحة');
  END IF;
  _coins_used := GREATEST(COALESCE(_coins_used,0), 0);

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'الطلب غير موجود'); END IF;
  IF o.status::text = 'refunded' OR COALESCE(o.refunded_jod,0) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'لا يمكن تعديل طلب تم استرجاعه');
  END IF;
  IF _coins_used > 0 AND o.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'الطلب بدون حساب مستخدم');
  END IF;

  -- GX Coins can cover at most 50% of the order value.
  _max_coins := floor(_subtotal_jod * 0.5 * 1000)::bigint;
  IF _coins_used > _max_coins THEN
    RETURN jsonb_build_object('ok', false, 'message',
      'الحد الأقصى للخصم 50% من قيمة الطلب (' || _max_coins::text || ' عملة)');
  END IF;
  _coins_disc := round((_coins_used / 1000.0)::numeric, 3);
  _coupon_disc := GREATEST(COALESCE(o.discount_jod,0) - COALESCE(o.coins_discount_jod,0), 0);
  _total := GREATEST(_subtotal_jod - _coupon_disc - _coins_disc, 0);

  _delta := _coins_used - COALESCE(o.coins_used,0)::bigint;

  IF _delta <> 0 AND o.user_id IS NOT NULL THEN
    SELECT gx_coins INTO _bal FROM public.profiles WHERE id = o.user_id FOR UPDATE;
    IF _delta > 0 AND COALESCE(_bal,0) < _delta THEN
      RETURN jsonb_build_object('ok', false, 'message',
        'رصيد العميل غير كافٍ: يحتاج ' || _delta::text || ' عملة والمتوفر ' || COALESCE(_bal,0)::text);
    END IF;
    _after := COALESCE(_bal,0) - _delta;
    UPDATE public.profiles SET gx_coins = _after WHERE id = o.user_id;
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id, metadata)
    VALUES (o.user_id, -_delta, _after,
            CASE WHEN _delta > 0 THEN 'spend' ELSE 'refund' END, 'admin_edit',
            'تعديل إداري للطلب ' || o.order_number || ' — ' || TRIM(_reason), o.id,
            jsonb_build_object('balance_before', COALESCE(_bal,0), 'coins_before', o.coins_used,
                               'coins_after', _coins_used));
  END IF;

  UPDATE public.orders
     SET subtotal_jod = _subtotal_jod,
         coins_used = _coins_used,
         coins_discount_jod = _coins_disc,
         discount_jod = _coupon_disc + _coins_disc,
         total_jod = _total,
         paid_jod = _total,
         admin_notes = COALESCE(admin_notes,'') ||
           CASE WHEN COALESCE(admin_notes,'') = '' THEN '' ELSE E'\n' END ||
           'تعديل القيمة إلى ' || _total::text || ' د.أ (عملات: ' || _coins_used::text || ') — ' || TRIM(_reason),
         updated_at = now()
   WHERE id = o.id;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _email, 'order.amounts_edited', 'order', o.id::text,
          jsonb_build_object('order_number', o.order_number, 'subtotal', _subtotal_jod,
                             'coins_before', o.coins_used, 'coins_after', _coins_used,
                             'total', _total, 'reason', TRIM(_reason)));

  RETURN jsonb_build_object('ok', true, 'total', _total, 'coins_used', _coins_used,
                            'coins_delta', _delta, 'coins_discount_jod', _coins_disc);
END $$;

REVOKE ALL ON FUNCTION public.admin_set_order_amounts(uuid, numeric, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_order_amounts(uuid, numeric, bigint, text) TO authenticated;
