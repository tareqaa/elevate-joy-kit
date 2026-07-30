-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE public.wheel_reward_type AS ENUM ('xp','gx_coins','discount_percent','boost_double_coins','boost_double_xp','no_reward');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wheel_rarity AS ENUM ('common','rare','epic','legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== wheel_prizes restructure =====
ALTER TABLE public.wheel_prizes DROP CONSTRAINT IF EXISTS wheel_prizes_prize_type_check;
ALTER TABLE public.wheel_prizes DROP CONSTRAINT IF EXISTS wheel_prizes_amount_check;
ALTER TABLE public.wheel_prizes DROP CONSTRAINT IF EXISTS wheel_prizes_coupon_valid_days_check;

ALTER TABLE public.wheel_prizes
  ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '🎁',
  ADD COLUMN IF NOT EXISTS reward_type public.wheel_reward_type NOT NULL DEFAULT 'no_reward',
  ADD COLUMN IF NOT EXISTS reward_value NUMERIC,
  ADD COLUMN IF NOT EXISTS rarity public.wheel_rarity NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#0ea5b7',
  ADD COLUMN IF NOT EXISTS coupon_max_discount_jod NUMERIC,
  ADD COLUMN IF NOT EXISTS coupon_valid_hours INTEGER NOT NULL DEFAULT 24;

ALTER TABLE public.wheel_prizes
  DROP COLUMN IF EXISTS prize_type,
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS product_slug,
  DROP COLUMN IF EXISTS coupon_valid_days;

ALTER TABLE public.wheel_prizes
  ADD CONSTRAINT wheel_prizes_weight_positive CHECK (weight > 0),
  ADD CONSTRAINT wheel_prizes_valid_hours_positive CHECK (coupon_valid_hours > 0),
  ADD CONSTRAINT wheel_prizes_reward_value_ok CHECK (
    (reward_type IN ('no_reward','boost_double_coins','boost_double_xp'))
    OR (reward_value IS NOT NULL AND reward_value > 0)
  );

-- Seed defaults
DELETE FROM public.wheel_spins;
DELETE FROM public.wheel_prizes;
INSERT INTO public.wheel_prizes (name, icon, reward_type, reward_value, rarity, color, weight, is_active, sort_order, coupon_max_discount_jod, coupon_valid_hours) VALUES
  ('+100 XP',           '⭐', 'xp',                 100,  'common', '#0ea5b7', 25, true, 1, NULL, 24),
  ('+10 GX Coins',      '🪙', 'gx_coins',           10,   'common', '#0d9488', 25, true, 2, NULL, 24),
  ('حظ أوفر',            '🍀', 'no_reward',          NULL, 'common', '#475569', 10, true, 3, NULL, 24),
  ('+250 XP',           '🌟', 'xp',                 250,  'rare',   '#6366f1', 10, true, 4, NULL, 24),
  ('+25 GX Coins',      '💰', 'gx_coins',           25,   'rare',   '#7c3aed', 10, true, 5, NULL, 24),
  ('خصم 2%',            '🎫', 'discount_percent',   2,    'rare',   '#0891b2', 10, true, 6, 5,    24),
  ('خصم 5%',            '🎟️', 'discount_percent',   5,    'epic',   '#c026d3', 5,  true, 7, 10,   24),
  ('Double GX Coins',   '⚡', 'boost_double_coins', NULL, 'epic',   '#a21caf', 5,  true, 8, NULL, 24);

-- ===== wheel_spins restructure =====
ALTER TABLE public.wheel_spins DROP CONSTRAINT IF EXISTS wheel_spins_coupon_id_fkey;
DROP INDEX IF EXISTS public.wheel_spins_user_day_uniq;
ALTER TABLE public.wheel_spins DROP COLUMN IF EXISTS spun_on;
ALTER TABLE public.wheel_spins DROP COLUMN IF EXISTS coupon_code;
ALTER TABLE public.wheel_spins
  ADD CONSTRAINT wheel_spins_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.user_coupons(id) ON DELETE SET NULL;
ALTER TABLE public.wheel_spins ALTER COLUMN prize_snapshot SET DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX wheel_spins_user_amman_day_uniq
  ON public.wheel_spins (user_id, ((spun_at AT TIME ZONE 'Asia/Amman')::date));

-- ===== spin function =====
DROP FUNCTION IF EXISTS public.spin_wheel();
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _spin_id UUID;
  _next TIMESTAMPTZ;
  _mins INT;
  p public.wheel_prizes%ROWTYPE;
  _code TEXT;
  _coupon_id UUID;
  _user_coupon_id UUID;
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
    INSERT INTO public.wheel_spins (user_id, spun_at, prize_snapshot)
    VALUES (_uid, now(), '{}'::jsonb)
    RETURNING id INTO _spin_id;
  EXCEPTION WHEN unique_violation THEN
    _next := ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman');
    _mins := GREATEST(CEIL(EXTRACT(EPOCH FROM (_next - now()))/60)::int, 1);
    RAISE EXCEPTION 'لقد استخدمت لفة اليوم — اللفة القادمة بعد % ساعة و % دقيقة', _mins / 60, _mins % 60;
  END;

  SELECT * INTO p FROM public.wheel_prizes
   WHERE is_active
   ORDER BY -ln(random()) / weight
   LIMIT 1;
  IF p.id IS NULL THEN RAISE EXCEPTION 'لا توجد جوائز متاحة حالياً'; END IF;

  _snapshot := jsonb_build_object(
    'prize_id', p.id, 'name', p.name, 'icon', p.icon,
    'reward_type', p.reward_type, 'reward_value', p.reward_value,
    'rarity', p.rarity, 'color', p.color
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

  RETURN jsonb_build_object(
    'ok', true, 'spin_id', _spin_id, 'prize_id', p.id, 'name', p.name, 'icon', p.icon,
    'reward_type', p.reward_type, 'reward_value', p.reward_value,
    'rarity', p.rarity, 'color', p.color, 'coupon_code', _code,
    'coupon_expires_at', CASE WHEN _code IS NULL THEN NULL
      ELSE now() + (p.coupon_valid_hours || ' hours')::interval END,
    'next_spin_at', ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman')
  );
END $$;

-- ===== status function =====
DROP FUNCTION IF EXISTS public.get_wheel_status();
CREATE OR REPLACE FUNCTION public.get_wheel_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _last public.wheel_spins%ROWTYPE; _next TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'can_spin', false, 'message', 'سجّل الدخول للف العجلة');
  END IF;
  SELECT * INTO _last FROM public.wheel_spins
   WHERE user_id = auth.uid() ORDER BY spun_at DESC LIMIT 1;

  IF NOT FOUND OR (_last.spun_at AT TIME ZONE 'Asia/Amman')::date < (now() AT TIME ZONE 'Asia/Amman')::date THEN
    RETURN jsonb_build_object('ok', true, 'can_spin', true, 'next_spin_at', NULL,
                              'last_spin_at', _last.spun_at);
  END IF;

  _next := ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman');
  RETURN jsonb_build_object(
    'ok', true, 'can_spin', false, 'next_spin_at', _next,
    'seconds_remaining', GREATEST(EXTRACT(EPOCH FROM (_next - now()))::bigint, 0),
    'last_spin_at', _last.spun_at, 'last_prize', _last.prize_snapshot
  );
END $$;

-- ===== grants =====
REVOKE ALL ON FUNCTION public.spin_wheel() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_wheel_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wheel_status() TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.wheel_spins FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coupons FROM anon, authenticated;
GRANT SELECT ON public.wheel_spins TO authenticated;
GRANT SELECT ON public.wheel_prizes TO anon, authenticated;
GRANT ALL ON public.wheel_spins TO service_role;
GRANT ALL ON public.wheel_prizes TO service_role;