
-- 1) allow bonus spins to bypass the one-per-day unique index
ALTER TABLE public.wheel_spins ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT false;
DROP INDEX IF EXISTS public.wheel_spins_user_amman_day_uniq;
CREATE UNIQUE INDEX wheel_spins_user_amman_day_uniq
  ON public.wheel_spins (user_id, (((spun_at AT TIME ZONE 'Asia/Amman'::text))::date))
  WHERE NOT is_bonus;

-- 2) bonus spin balances
CREATE TABLE IF NOT EXISTS public.wheel_bonus_spins (
  user_id UUID PRIMARY KEY,
  spins INTEGER NOT NULL DEFAULT 0 CHECK (spins >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wheel_bonus_spins TO authenticated;
GRANT ALL ON public.wheel_bonus_spins TO service_role;

ALTER TABLE public.wheel_bonus_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bonus spins"
  ON public.wheel_bonus_spins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wheel_bonus_spins_updated_at
  BEFORE UPDATE ON public.wheel_bonus_spins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) admin grant function
CREATE OR REPLACE FUNCTION public.admin_grant_wheel_spins(_target TEXT, _count INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid UUID; _spins INT; _email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  IF _count IS NULL OR _count = 0 OR abs(_count) > 100 THEN
    RAISE EXCEPTION 'عدد اللفات غير صالح';
  END IF;

  SELECT id, email INTO _uid, _email FROM public.profiles
   WHERE lower(email) = lower(trim(_target))
      OR lower(username) = lower(trim(_target))
      OR id::text = trim(_target)
   LIMIT 1;

  IF _uid IS NULL THEN RAISE EXCEPTION 'المستخدم غير موجود'; END IF;

  INSERT INTO public.wheel_bonus_spins (user_id, spins)
  VALUES (_uid, GREATEST(_count, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET spins = GREATEST(public.wheel_bonus_spins.spins + _count, 0)
  RETURNING spins INTO _spins;

  PERFORM public.log_admin_action('grant_wheel_spins', 'user', _uid::text,
    jsonb_build_object('count', _count, 'spins_after', _spins, 'email', _email));

  RETURN jsonb_build_object('ok', true, 'user_id', _uid, 'email', _email, 'spins', _spins);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_grant_wheel_spins(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_wheel_spins(TEXT, INTEGER) TO authenticated;

-- 4) status includes bonus spins
CREATE OR REPLACE FUNCTION public.get_wheel_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _last public.wheel_spins%ROWTYPE; _next TIMESTAMPTZ; _bonus INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'can_spin', false, 'message', 'سجّل الدخول للف العجلة');
  END IF;

  SELECT COALESCE(spins,0) INTO _bonus FROM public.wheel_bonus_spins WHERE user_id = auth.uid();
  _bonus := COALESCE(_bonus, 0);

  SELECT * INTO _last FROM public.wheel_spins
   WHERE user_id = auth.uid() ORDER BY spun_at DESC LIMIT 1;

  IF NOT FOUND OR NOT EXISTS (
      SELECT 1 FROM public.wheel_spins
       WHERE user_id = auth.uid() AND NOT is_bonus
         AND (spun_at AT TIME ZONE 'Asia/Amman')::date = (now() AT TIME ZONE 'Asia/Amman')::date
  ) THEN
    RETURN jsonb_build_object('ok', true, 'can_spin', true, 'next_spin_at', NULL,
                              'bonus_spins', _bonus, 'last_spin_at', _last.spun_at);
  END IF;

  _next := ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman');
  RETURN jsonb_build_object(
    'ok', true, 'can_spin', _bonus > 0, 'bonus_spins', _bonus, 'next_spin_at', _next,
    'seconds_remaining', GREATEST(EXTRACT(EPOCH FROM (_next - now()))::bigint, 0),
    'last_spin_at', _last.spun_at, 'last_prize', _last.prize_snapshot
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_wheel_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wheel_status() TO authenticated;

-- 5) spin_wheel consumes a bonus spin when the daily one is used
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _spin_id UUID;
  _next TIMESTAMPTZ;
  _mins INT;
  _bonus_left INT;
  _used_bonus BOOLEAN := false;
  p public.wheel_prizes%ROWTYPE;
  _code TEXT;
  _coupon_id UUID;
  _user_coupon_id UUID;
  _boost public.boost_type;
  _boost_expires TIMESTAMPTZ;
  _bal BIGINT;
  _xp INT;
  _snapshot JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'سجّل الدخول للف العجلة';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الحساب غير موجود'; END IF;

  BEGIN
    INSERT INTO public.wheel_spins (user_id, spun_at, prize_snapshot, is_bonus)
    VALUES (_uid, now(), '{}'::jsonb, false)
    RETURNING id INTO _spin_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.wheel_bonus_spins SET spins = spins - 1
     WHERE user_id = _uid AND spins > 0
     RETURNING spins INTO _bonus_left;

    IF _bonus_left IS NULL THEN
      _next := ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman');
      _mins := GREATEST(CEIL(EXTRACT(EPOCH FROM (_next - now()))/60)::int, 1);
      RAISE EXCEPTION 'لقد استخدمت لفة اليوم — اللفة القادمة بعد % ساعة و % دقيقة', _mins / 60, _mins % 60;
    END IF;

    _used_bonus := true;
    INSERT INTO public.wheel_spins (user_id, spun_at, prize_snapshot, is_bonus)
    VALUES (_uid, now(), '{}'::jsonb, true)
    RETURNING id INTO _spin_id;
  END;

  SELECT * INTO p FROM public.wheel_prizes
   WHERE is_active
   ORDER BY -ln(random()) / weight
   LIMIT 1;
  IF p.id IS NULL THEN RAISE EXCEPTION 'لا توجد جوائز متاحة حالياً'; END IF;

  _snapshot := jsonb_build_object(
    'prize_id', p.id, 'name', p.name, 'icon', p.icon,
    'reward_type', p.reward_type, 'reward_value', p.reward_value,
    'rarity', p.rarity, 'color', p.color, 'is_bonus', _used_bonus
  );

  IF p.reward_type = 'xp' THEN
    UPDATE public.profiles SET xp = COALESCE(xp,0) + p.reward_value::int
      WHERE id = _uid RETURNING xp INTO _xp;
    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, metadata)
    VALUES (_uid, p.reward_value::int, _xp, 'wheel_reward', 'عجلة الحظ — ' || p.name, _snapshot);
    PERFORM public.sync_user_level(_uid);

  ELSIF p.reward_type = 'gx_coins' THEN
    UPDATE public.profiles SET gx_coins = gx_coins + p.reward_value::bigint
      WHERE id = _uid RETURNING gx_coins INTO _bal;
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, metadata)
    VALUES (_uid, p.reward_value::bigint, _bal, 'earn', 'wheel_reward', 'عجلة الحظ — ' || p.name, _snapshot);

  ELSIF p.reward_type IN ('boost_double_coins','boost_double_xp') THEN
    _boost := CASE WHEN p.reward_type = 'boost_double_coins'
                   THEN 'double_gx_coins'::public.boost_type
                   ELSE 'double_xp'::public.boost_type END;
    _boost_expires := now() + interval '24 hours';

    INSERT INTO public.pending_boosts (user_id, boost_type, multiplier, source, source_id, expires_at)
    VALUES (_uid, _boost, 2, 'wheel_prize', _spin_id, _boost_expires)
    ON CONFLICT (user_id, boost_type) WHERE consumed_at IS NULL
    DO UPDATE SET expires_at = GREATEST(public.pending_boosts.expires_at, EXCLUDED.expires_at),
                  source = EXCLUDED.source,
                  source_id = EXCLUDED.source_id
    RETURNING expires_at INTO _boost_expires;

    _snapshot := _snapshot || jsonb_build_object('boost_type', _boost, 'boost_expires_at', _boost_expires);

  ELSIF p.reward_type = 'discount_percent' THEN
    LOOP
      _code := 'WHEEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.coupons WHERE upper(code) = _code)
            AND NOT EXISTS (SELECT 1 FROM public.user_coupons WHERE upper(code) = _code);
    END LOOP;

    INSERT INTO public.coupons (
      code, description, discount_type, discount_value, max_discount_jod,
      min_order_jod, expires_at, usage_limit, per_user_limit, scope,
      product_slugs, category_slugs, is_active, assigned_user_id
    ) VALUES (
      _code, 'جائزة عجلة الحظ — ' || p.name, 'percent'::coupon_discount_type,
      p.reward_value, p.coupon_max_discount_jod, 0,
      now() + (p.coupon_valid_hours || ' hours')::interval,
      1, 1, 'all'::coupon_scope, ARRAY[]::text[], ARRAY[]::text[], true, _uid
    ) RETURNING id INTO _coupon_id;

    INSERT INTO public.user_coupons (user_id, level_code, code, percent, max_discount_jod, expires_at)
    VALUES (_uid, 'wheel', _code, p.reward_value, p.coupon_max_discount_jod,
            now() + (p.coupon_valid_hours || ' hours')::interval)
    RETURNING id INTO _user_coupon_id;

    _snapshot := _snapshot || jsonb_build_object('coupon_code', _code, 'coupon_id', _coupon_id,
                                                 'user_coupon_id', _user_coupon_id);
  END IF;

  UPDATE public.wheel_spins
     SET prize_id = p.id, prize_snapshot = _snapshot, coupon_id = _user_coupon_id
   WHERE id = _spin_id;

  SELECT COALESCE(spins,0) INTO _bonus_left FROM public.wheel_bonus_spins WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'ok', true, 'spin_id', _spin_id, 'prize_id', p.id, 'name', p.name, 'icon', p.icon,
    'reward_type', p.reward_type, 'reward_value', p.reward_value,
    'rarity', p.rarity, 'color', p.color, 'coupon_code', _code,
    'boost_expires_at', _boost_expires,
    'used_bonus', _used_bonus, 'bonus_spins', COALESCE(_bonus_left, 0),
    'coupon_expires_at', CASE WHEN _code IS NULL THEN NULL
      ELSE now() + (p.coupon_valid_hours || ' hours')::interval END,
    'next_spin_at', ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman')
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
