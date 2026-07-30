-- =========================
-- 1) Prizes
-- =========================
CREATE TABLE public.wheel_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('gx_coins','xp','discount_percent','discount_fixed','discount_product')),
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  product_slug TEXT,
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
  max_discount_jod NUMERIC,
  coupon_valid_days INTEGER NOT NULL DEFAULT 30 CHECK (coupon_valid_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wheel_prizes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wheel_prizes TO authenticated;
GRANT ALL ON public.wheel_prizes TO service_role;

ALTER TABLE public.wheel_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active wheel prizes"
  ON public.wheel_prizes FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage wheel prizes"
  ON public.wheel_prizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wheel_prizes_set_updated_at
  BEFORE UPDATE ON public.wheel_prizes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 2) Spins log
-- =========================
CREATE TABLE public.wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prize_id UUID REFERENCES public.wheel_prizes(id) ON DELETE SET NULL,
  prize_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code TEXT,
  spun_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  spun_on DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date)
);

-- Hard technical guarantee: one spin per user per (UTC) day.
CREATE UNIQUE INDEX wheel_spins_user_day_uniq ON public.wheel_spins (user_id, spun_on);
CREATE INDEX wheel_spins_user_time_idx ON public.wheel_spins (user_id, spun_at DESC);

GRANT SELECT ON public.wheel_spins TO authenticated;
GRANT ALL ON public.wheel_spins TO service_role;

ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spins"
  ON public.wheel_spins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================
-- 3) Coupons bound to a single user
-- =========================
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS assigned_user_id UUID;
CREATE INDEX IF NOT EXISTS coupons_assigned_user_idx ON public.coupons (assigned_user_id);

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal_jod numeric, _user_id uuid, _product_slugs text[], _category_slugs text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.coupons%ROWTYPE;
  eligible NUMERIC := 0;
  discount NUMERIC := 0;
  used_by_user INTEGER := 0;
BEGIN
  IF _code IS NULL OR trim(_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'أدخل كود الكوبون');
  END IF;

  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون غير موجود');
  END IF;
  IF c.assigned_user_id IS NOT NULL AND (_user_id IS NULL OR _user_id <> c.assigned_user_id) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'هذا الكوبون ليس لحسابك');
  END IF;
  IF NOT c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون غير فعال');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون منتهي الصلاحية');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون');
  END IF;
  IF c.min_order_jod > 0 AND _subtotal_jod < c.min_order_jod THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الحد الأدنى للطلب ' || c.min_order_jod::text || ' د.أ');
  END IF;

  IF _user_id IS NOT NULL AND c.per_user_limit > 0 THEN
    SELECT count(*) INTO used_by_user FROM public.coupon_redemptions
      WHERE coupon_id = c.id AND user_id = _user_id;
    IF used_by_user >= c.per_user_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'استخدمت هذا الكوبون بالحد الأقصى المسموح');
    END IF;
  END IF;

  IF c.scope = 'all' THEN
    eligible := _subtotal_jod;
  ELSIF c.scope = 'products' THEN
    IF _product_slugs IS NULL OR NOT (_product_slugs && c.product_slugs) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'الكوبون لا ينطبق على منتجات السلة');
    END IF;
    eligible := _subtotal_jod;
  ELSIF c.scope = 'categories' THEN
    IF _category_slugs IS NULL OR NOT (_category_slugs && c.category_slugs) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'الكوبون لا ينطبق على أقسام السلة');
    END IF;
    eligible := _subtotal_jod;
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round((eligible * c.discount_value / 100)::numeric, 3);
    IF c.max_discount_jod IS NOT NULL AND discount > c.max_discount_jod THEN
      discount := c.max_discount_jod;
    END IF;
  ELSE
    discount := c.discount_value;
  END IF;

  IF discount > _subtotal_jod THEN discount := _subtotal_jod; END IF;
  IF discount <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'قيمة الخصم صفر');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount_jod', discount,
    'message', 'تم تطبيق الكوبون'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, numeric, uuid, text[], text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric, uuid, text[], text[]) TO service_role;

-- =========================
-- 4) Wheel status
-- =========================
CREATE OR REPLACE FUNCTION public.get_wheel_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _last public.wheel_spins%ROWTYPE; _next TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'can_spin', false, 'message', 'سجّل الدخول للف العجلة');
  END IF;
  SELECT * INTO _last FROM public.wheel_spins
    WHERE user_id = auth.uid() ORDER BY spun_at DESC LIMIT 1;
  IF NOT FOUND OR _last.spun_on < (now() AT TIME ZONE 'UTC')::date THEN
    RETURN jsonb_build_object('ok', true, 'can_spin', true, 'next_spin_at', NULL, 'last_spin_at', _last.spun_at);
  END IF;
  _next := ((((now() AT TIME ZONE 'UTC')::date + 1)::timestamp) AT TIME ZONE 'UTC');
  RETURN jsonb_build_object(
    'ok', true, 'can_spin', false,
    'next_spin_at', _next,
    'seconds_remaining', GREATEST(EXTRACT(EPOCH FROM (_next - now()))::bigint, 0),
    'last_spin_at', _last.spun_at,
    'last_prize', _last.prize_snapshot
  );
END $function$;

REVOKE EXECUTE ON FUNCTION public.get_wheel_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wheel_status() TO authenticated, service_role;

-- =========================
-- 5) Spin
-- =========================
CREATE OR REPLACE FUNCTION public.spin_wheel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _next TIMESTAMPTZ;
  _total BIGINT;
  _pick NUMERIC;
  _acc BIGINT := 0;
  p public.wheel_prizes%ROWTYPE;
  _winner public.wheel_prizes%ROWTYPE;
  _coupon_id UUID;
  _code TEXT;
  _bal BIGINT;
  _xp INT;
  _snapshot JSONB;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'سجّل الدخول للف العجلة';
  END IF;

  -- Lock the user row first: serializes concurrent spins for the same user.
  PERFORM 1 FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الحساب غير موجود';
  END IF;

  IF EXISTS (SELECT 1 FROM public.wheel_spins WHERE user_id = _uid AND spun_on = _today) THEN
    _next := (((_today + 1)::timestamp) AT TIME ZONE 'UTC');
    RAISE EXCEPTION 'لقد استخدمت لفة اليوم — اللفة القادمة بعد % ساعة و % دقيقة',
      floor(EXTRACT(EPOCH FROM (_next - now()))/3600)::int,
      (floor(EXTRACT(EPOCH FROM (_next - now()))/60)::int % 60);
  END IF;

  SELECT COALESCE(sum(weight),0) INTO _total FROM public.wheel_prizes WHERE is_active;
  IF _total <= 0 THEN
    RAISE EXCEPTION 'لا توجد جوائز متاحة حالياً';
  END IF;

  -- Weighted random selection, fully server-side.
  _pick := random() * _total;
  FOR p IN SELECT * FROM public.wheel_prizes WHERE is_active ORDER BY sort_order, id LOOP
    _acc := _acc + p.weight;
    IF _pick < _acc THEN _winner := p; EXIT; END IF;
  END LOOP;
  IF _winner.id IS NULL THEN
    SELECT * INTO _winner FROM public.wheel_prizes WHERE is_active ORDER BY sort_order, id LIMIT 1;
  END IF;

  _snapshot := jsonb_build_object(
    'prize_id', _winner.id, 'name', _winner.name, 'prize_type', _winner.prize_type,
    'amount', _winner.amount, 'product_slug', _winner.product_slug,
    'max_discount_jod', _winner.max_discount_jod
  );

  IF _winner.prize_type = 'gx_coins' THEN
    UPDATE public.profiles SET gx_coins = gx_coins + _winner.amount::bigint
      WHERE id = _uid RETURNING gx_coins INTO _bal;
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, metadata)
    VALUES (_uid, _winner.amount::bigint, _bal, 'earn', 'wheel_reward',
            'عجلة الحظ — ' || _winner.name, _snapshot);

  ELSIF _winner.prize_type = 'xp' THEN
    UPDATE public.profiles SET xp = COALESCE(xp,0) + _winner.amount::int
      WHERE id = _uid RETURNING xp INTO _xp;
    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, metadata)
    VALUES (_uid, _winner.amount::int, _xp, 'wheel_reward', 'عجلة الحظ — ' || _winner.name, _snapshot);
    PERFORM public.sync_user_level(_uid);

  ELSE
    LOOP
      _code := 'WHEEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.coupons WHERE upper(code) = _code);
    END LOOP;

    INSERT INTO public.coupons (
      code, description, discount_type, discount_value, max_discount_jod,
      min_order_jod, expires_at, usage_limit, per_user_limit, scope,
      product_slugs, category_slugs, is_active, assigned_user_id
    ) VALUES (
      _code, 'جائزة عجلة الحظ — ' || _winner.name,
      CASE WHEN _winner.prize_type = 'discount_percent' THEN 'percent'::coupon_discount_type
           ELSE 'fixed'::coupon_discount_type END,
      _winner.amount, _winner.max_discount_jod,
      0, now() + (_winner.coupon_valid_days || ' days')::interval, 1, 1,
      CASE WHEN _winner.prize_type = 'discount_product' THEN 'products'::coupon_scope
           ELSE 'all'::coupon_scope END,
      CASE WHEN _winner.prize_type = 'discount_product' AND _winner.product_slug IS NOT NULL
           THEN ARRAY[_winner.product_slug] ELSE ARRAY[]::text[] END,
      ARRAY[]::text[], true, _uid
    ) RETURNING id INTO _coupon_id;

    _snapshot := _snapshot || jsonb_build_object('coupon_code', _code, 'coupon_id', _coupon_id);
  END IF;

  INSERT INTO public.wheel_spins (user_id, prize_id, prize_snapshot, coupon_id, coupon_code, spun_on)
  VALUES (_uid, _winner.id, _snapshot, _coupon_id, _code, _today);

  RETURN jsonb_build_object(
    'ok', true,
    'prize_id', _winner.id,
    'name', _winner.name,
    'prize_type', _winner.prize_type,
    'amount', _winner.amount,
    'product_slug', _winner.product_slug,
    'coupon_code', _code,
    'coupon_expires_at', CASE WHEN _coupon_id IS NULL THEN NULL
      ELSE (SELECT expires_at FROM public.coupons WHERE id = _coupon_id) END,
    'next_spin_at', (((_today + 1)::timestamp) AT TIME ZONE 'UTC')
  );
END $function$;

REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated, service_role;

-- =========================
-- 6) Default prizes
-- =========================
INSERT INTO public.wheel_prizes (name, prize_type, amount, weight, max_discount_jod, sort_order) VALUES
  ('50 GX Coins', 'gx_coins', 50, 40, NULL, 1),
  ('200 GX Coins', 'gx_coins', 200, 15, NULL, 2),
  ('100 XP', 'xp', 100, 30, NULL, 3),
  ('خصم 5%', 'discount_percent', 5, 10, 3, 4),
  ('خصم 15%', 'discount_percent', 15, 5, 5, 5);
