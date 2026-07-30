-- ===== enum + table =====
DO $$ BEGIN
  CREATE TYPE public.boost_type AS ENUM ('double_gx_coins','double_xp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pending_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  boost_type public.boost_type NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 2 CHECK (multiplier > 1),
  source TEXT NOT NULL DEFAULT 'wheel_prize',
  source_id UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  consumed_at TIMESTAMPTZ,
  consumed_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One un-consumed boost per type per user; re-winning extends it instead.
CREATE UNIQUE INDEX IF NOT EXISTS pending_boosts_one_active_per_type
  ON public.pending_boosts (user_id, boost_type) WHERE consumed_at IS NULL;

GRANT SELECT ON public.pending_boosts TO authenticated;
GRANT ALL ON public.pending_boosts TO service_role;
ALTER TABLE public.pending_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own boosts" ON public.pending_boosts;
CREATE POLICY "Users read own boosts" ON public.pending_boosts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ===== order-level multipliers (applied when the order is delivered) =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coins_multiplier NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp_multiplier NUMERIC NOT NULL DEFAULT 1;

-- ===== spin_wheel: grant real boosts =====
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

  RETURN jsonb_build_object(
    'ok', true, 'spin_id', _spin_id, 'prize_id', p.id, 'name', p.name, 'icon', p.icon,
    'reward_type', p.reward_type, 'reward_value', p.reward_value,
    'rarity', p.rarity, 'color', p.color, 'coupon_code', _code,
    'boost_expires_at', _boost_expires,
    'coupon_expires_at', CASE WHEN _code IS NULL THEN NULL
      ELSE now() + (p.coupon_valid_hours || ' hours')::interval END,
    'next_spin_at', ((((now() AT TIME ZONE 'Asia/Amman')::date + 1)::timestamp) AT TIME ZONE 'Asia/Amman')
  );
END $$;

-- ===== create_store_order: reserve + consume the boost in the same transaction =====
CREATE OR REPLACE FUNCTION public.create_store_order(_user_id uuid, _customer_name text, _customer_whatsapp text, _items jsonb, _subtotal numeric, _currency text, _delivery_data jsonb, _contact_type text, _coupon_code text, _coins_used bigint, _credit_jod numeric, _client_total numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _coins_disc numeric;
  _coupon_disc numeric := 0;
  _coupon_id uuid;
  _coupon_final_code text;
  _user_coupon_id uuid;
  _uc public.user_coupons%ROWTYPE;
  _v jsonb;
  _slugs text[];
  _cats text[];
  _credit numeric;
  _discount numeric;
  _total numeric;
  _max_coins bigint;
  _coin_bal bigint;
  _credit_bal numeric;
  _after_coins bigint;
  _after_credit numeric;
  _status public.order_status;
  _order_id uuid;
  _order_no text;
  _bumped uuid;
  _per_user integer;
  _used_by_user integer;
  _coins_boost_id uuid;
  _xp_boost_id uuid;
  _coins_mult numeric := 1;
  _xp_mult numeric := 1;
BEGIN
  _subtotal := GREATEST(COALESCE(_subtotal, 0), 0);
  _coins_used := GREATEST(COALESCE(_coins_used, 0), 0);
  _credit := GREATEST(COALESCE(_credit_jod, 0), 0);
  _coins_disc := round((_coins_used / 1000.0)::numeric, 3);
  _coupon_code := NULLIF(TRIM(COALESCE(_coupon_code, '')), '');

  -- Lock the buyer's row BEFORE reading any balance: two concurrent checkouts
  -- from the same user are serialized here, so nothing can be spent twice.
  IF _user_id IS NOT NULL THEN
    SELECT gx_coins, COALESCE(store_credit_jod, 0)
      INTO _coin_bal, _credit_bal
      FROM public.profiles WHERE id = _user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'الحساب غير موجود';
    END IF;

    -- Reserve any active boost: the row lock stops two concurrent orders
    -- from consuming the same boost.
    SELECT id, multiplier INTO _coins_boost_id, _coins_mult
      FROM public.pending_boosts
     WHERE user_id = _user_id AND boost_type = 'double_gx_coins'
       AND consumed_at IS NULL AND expires_at > now()
     ORDER BY expires_at ASC LIMIT 1 FOR UPDATE;
    IF _coins_boost_id IS NULL THEN _coins_mult := 1; END IF;

    SELECT id, multiplier INTO _xp_boost_id, _xp_mult
      FROM public.pending_boosts
     WHERE user_id = _user_id AND boost_type = 'double_xp'
       AND consumed_at IS NULL AND expires_at > now()
     ORDER BY expires_at ASC LIMIT 1 FOR UPDATE;
    IF _xp_boost_id IS NULL THEN _xp_mult := 1; END IF;
  END IF;

  -- ---- Coupon: resolved and re-priced from the database, by code only ------
  IF _coupon_code IS NOT NULL THEN
    SELECT array_agg(DISTINCT s) INTO _slugs
      FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) it,
           LATERAL (SELECT NULLIF(COALESCE(it->>'product_slug', it->>'productSlug'), '') AS s) x
     WHERE s IS NOT NULL;
    SELECT array_agg(DISTINCT c.slug) INTO _cats
      FROM public.products p JOIN public.categories c ON c.id = p.category_id
     WHERE p.slug = ANY(COALESCE(_slugs, ARRAY[]::text[]));

    SELECT id INTO _coupon_id FROM public.coupons
     WHERE upper(code) = upper(_coupon_code) LIMIT 1;

    IF _coupon_id IS NOT NULL THEN
      PERFORM 1 FROM public.coupons WHERE id = _coupon_id FOR UPDATE;
      _v := public.validate_coupon(_coupon_code, _subtotal, _user_id,
                                   COALESCE(_slugs, ARRAY[]::text[]),
                                   COALESCE(_cats, ARRAY[]::text[]));
      IF NOT COALESCE((_v->>'valid')::boolean, false) THEN
        RAISE EXCEPTION '%', COALESCE(_v->>'message', 'الكوبون غير صالح');
      END IF;
      _coupon_disc := COALESCE((_v->>'discount_jod')::numeric, 0);
      _coupon_final_code := _v->>'code';
    ELSE
      IF _user_id IS NULL THEN
        RAISE EXCEPTION 'سجّل الدخول لاستخدام كوبون المستوى';
      END IF;
      SELECT * INTO _uc FROM public.user_coupons
       WHERE upper(code) = upper(_coupon_code) LIMIT 1 FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'الكوبون غير موجود'; END IF;
      IF _uc.user_id <> _user_id THEN RAISE EXCEPTION 'هذا الكوبون ليس لحسابك'; END IF;
      IF _uc.used_at IS NOT NULL THEN RAISE EXCEPTION 'تم استخدام هذا الكوبون'; END IF;
      IF _uc.expires_at < now() THEN RAISE EXCEPTION 'الكوبون منتهي الصلاحية'; END IF;
      _coupon_disc := round((_subtotal * _uc.percent / 100)::numeric, 3);
      IF _uc.max_discount_jod IS NOT NULL AND _coupon_disc > _uc.max_discount_jod THEN
        _coupon_disc := _uc.max_discount_jod;
      END IF;
      _user_coupon_id := _uc.id;
      _coupon_final_code := _uc.code;
    END IF;
  END IF;

  IF _coins_used > 0 THEN
    IF _user_id IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام GX Coins';
    END IF;
    _max_coins := floor(_subtotal * 0.5 * 1000)::bigint;
    IF _coins_used > _max_coins THEN
      RAISE EXCEPTION 'الحد الأقصى لخصم GX Coins هو 50%% من قيمة الطلب';
    END IF;
    IF COALESCE(_coin_bal, 0) < _coins_used THEN
      RAISE EXCEPTION 'رصيد GX Coins غير كافٍ';
    END IF;
  END IF;

  _coupon_disc := LEAST(GREATEST(_coupon_disc, 0), _subtotal);
  _credit := LEAST(_credit, GREATEST(_subtotal - _coupon_disc - _coins_disc, 0));
  _credit := round(_credit, 3);

  IF _credit > 0 THEN
    IF _user_id IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام رصيد المتجر';
    END IF;
    IF COALESCE(_credit_bal, 0) + 0.0049 < _credit THEN
      RAISE EXCEPTION 'رصيد المتجر غير كافٍ';
    END IF;
  END IF;

  _discount := round(_coupon_disc + _coins_disc + _credit, 3);
  _total := round(GREATEST(_subtotal - _discount, 0), 3);

  IF _client_total IS NOT NULL AND abs(_client_total - _total) > 0.001 THEN
    RAISE EXCEPTION 'تغيّر السعر، أعد تحميل الصفحة';
  END IF;

  _status := CASE WHEN _credit > 0 AND _total <= 0.009 THEN 'paid'::public.order_status
                  ELSE 'pending'::public.order_status END;

  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_whatsapp, items,
    subtotal_jod, total_jod, paid_jod, currency_snapshot, delivery_data, status,
    contact_type, coupon_id, coupon_code, user_coupon_id, discount_jod,
    coins_used, coins_discount_jod, credit_used_jod, coins_multiplier, xp_multiplier
  ) VALUES (
    public.generate_order_number(), _user_id, _customer_name, _customer_whatsapp,
    COALESCE(_items, '[]'::jsonb),
    _subtotal, _total, _total, _currency, COALESCE(_delivery_data, '{}'::jsonb), _status,
    _contact_type, _coupon_id, _coupon_final_code, _user_coupon_id, _discount,
    _coins_used, _coins_disc, _credit, _coins_mult, _xp_mult
  ) RETURNING id, order_number INTO _order_id, _order_no;

  -- GX Coins
  IF _coins_used > 0 THEN
    _after_coins := _coin_bal - _coins_used;
    UPDATE public.profiles SET gx_coins = _after_coins WHERE id = _user_id;
    INSERT INTO public.gx_coin_transactions
      (user_id, order_id, amount, balance_after, kind, source, reason, metadata)
    VALUES (_user_id, _order_id, -_coins_used, _after_coins, 'spend', 'order_checkout',
            'خصم على الطلب ' || _order_no,
            jsonb_build_object('balance_before', _coin_bal, 'coins_discount_jod', _coins_disc));
  END IF;

  -- Store credit (refund balance)
  IF _credit > 0 THEN
    _after_credit := round(GREATEST(_credit_bal - _credit, 0), 3);
    UPDATE public.profiles SET store_credit_jod = _after_credit WHERE id = _user_id;
    INSERT INTO public.store_credit_transactions
      (user_id, order_id, amount_jod, balance_after, kind, reason)
    VALUES (_user_id, _order_id, -_credit, _after_credit, 'spend',
            'استخدام رصيد المتجر على الطلب ' || _order_no);
  END IF;

  IF _coupon_id IS NOT NULL THEN
    UPDATE public.coupons
       SET usage_count = usage_count + 1
     WHERE id = _coupon_id
       AND is_active
       AND (expires_at IS NULL OR expires_at > now())
       AND (usage_limit IS NULL OR usage_count < usage_limit)
     RETURNING id INTO _bumped;
    IF _bumped IS NULL THEN
      RAISE EXCEPTION 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون';
    END IF;

    INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id, discount_jod)
    VALUES (_coupon_id, _user_id, _order_id, _coupon_disc);

    SELECT per_user_limit INTO _per_user FROM public.coupons WHERE id = _coupon_id;
    IF _user_id IS NOT NULL AND COALESCE(_per_user, 0) > 0 THEN
      SELECT count(*) INTO _used_by_user FROM public.coupon_redemptions
       WHERE coupon_id = _coupon_id AND user_id = _user_id;
      IF _used_by_user > _per_user THEN
        RAISE EXCEPTION 'استخدمت هذا الكوبون بالحد الأقصى المسموح';
      END IF;
    END IF;
  END IF;

  IF _user_coupon_id IS NOT NULL THEN
    UPDATE public.user_coupons
       SET used_at = now(), order_id = _order_id
     WHERE id = _user_coupon_id AND user_id = _user_id AND used_at IS NULL
     RETURNING id INTO _bumped;
    IF _bumped IS NULL THEN
      RAISE EXCEPTION 'تم استخدام هذا الكوبون';
    END IF;
  END IF;

  -- Consume the reserved boosts: same transaction, so a failed order releases them.
  IF _coins_boost_id IS NOT NULL THEN
    UPDATE public.pending_boosts
       SET consumed_at = now(), consumed_order_id = _order_id
     WHERE id = _coins_boost_id AND consumed_at IS NULL
     RETURNING id INTO _bumped;
    IF _bumped IS NULL THEN RAISE EXCEPTION 'تعذّر استخدام مضاعفة GX Coins، أعد المحاولة'; END IF;
  END IF;
  IF _xp_boost_id IS NOT NULL THEN
    UPDATE public.pending_boosts
       SET consumed_at = now(), consumed_order_id = _order_id
     WHERE id = _xp_boost_id AND consumed_at IS NULL
     RETURNING id INTO _bumped;
    IF _bumped IS NULL THEN RAISE EXCEPTION 'تعذّر استخدام مضاعفة XP، أعد المحاولة'; END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', _order_id, 'order_number', _order_no,
    'total_jod', _total, 'discount_jod', _discount,
    'coupon_discount_jod', _coupon_disc,
    'credit_used_jod', _credit, 'coins_used', _coins_used, 'status', _status,
    'coins_multiplier', _coins_mult, 'xp_multiplier', _xp_mult
  );
END $function$;

-- ===== apply the multipliers when the order is delivered =====
CREATE OR REPLACE FUNCTION public.apply_loyalty_on_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _paid NUMERIC; _xp INT; _coins BIGINT; _bonus NUMERIC; _lvl public.levels;
        _cm NUMERIC; _xm NUMERIC;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    _paid := GREATEST(COALESCE(NEW.paid_jod, NEW.total_jod, 0), 0);
    IF _paid <= 0 THEN RETURN NEW; END IF;
    SELECT * INTO _lvl FROM public.level_for_xp((SELECT COALESCE(xp,0) FROM public.profiles WHERE id=NEW.user_id));
    _bonus := COALESCE(_lvl.coins_bonus_pct, 0);
    _cm := GREATEST(COALESCE(NEW.coins_multiplier, 1), 1);
    _xm := GREATEST(COALESCE(NEW.xp_multiplier, 1), 1);
    _xp := round(_paid * 100 * _xm);
    _coins := round(_paid * 10 * (1 + _bonus/100.0) * _cm);

    UPDATE public.profiles
       SET xp = COALESCE(xp,0) + _xp,
           gx_coins = gx_coins + _coins,
           total_spent = COALESCE(total_spent,0) + _paid,
           orders_count = orders_count + 1
     WHERE id = NEW.user_id;

    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id, metadata)
    VALUES (NEW.user_id, _xp, (SELECT xp FROM public.profiles WHERE id=NEW.user_id),
            CASE WHEN _xm > 1 THEN 'wheel_boost_applied' ELSE 'purchase' END,
            'طلب '||NEW.order_number || CASE WHEN _xm > 1 THEN ' (مضاعفة XP ×'||_xm||')' ELSE '' END,
            NEW.id, jsonb_build_object('xp_multiplier', _xm));
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id, metadata)
    VALUES (NEW.user_id, _coins, (SELECT gx_coins FROM public.profiles WHERE id=NEW.user_id), 'earn',
            CASE WHEN _cm > 1 THEN 'wheel_boost_applied' ELSE 'purchase' END,
            'طلب '||NEW.order_number || CASE WHEN _cm > 1 THEN ' (مضاعفة GX Coins ×'||_cm||')' ELSE '' END,
            NEW.id, jsonb_build_object('coins_multiplier', _cm));

    NEW.xp_awarded := _xp;
    NEW.coins_awarded := _coins;
    PERFORM public.sync_user_level(NEW.user_id);

  ELSIF OLD.status = 'delivered' AND NEW.status IN ('cancelled') THEN
    _xp := COALESCE(OLD.xp_awarded,0);
    _coins := COALESCE(OLD.coins_awarded,0);
    IF _xp > 0 OR _coins > 0 THEN
      UPDATE public.profiles
         SET xp = GREATEST(COALESCE(xp,0) - _xp, 0),
             gx_coins = GREATEST(gx_coins - _coins, 0),
             total_spent = GREATEST(COALESCE(total_spent,0) - COALESCE(OLD.paid_jod, OLD.total_jod,0), 0),
             orders_count = GREATEST(orders_count - 1, 0)
       WHERE id = OLD.user_id;
      INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id)
      VALUES (OLD.user_id, -_xp, (SELECT xp FROM public.profiles WHERE id=OLD.user_id), 'reversal',
              'إلغاء الطلب '||OLD.order_number, OLD.id);
      INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id)
      VALUES (OLD.user_id, -_coins, (SELECT gx_coins FROM public.profiles WHERE id=OLD.user_id), 'reversal','reversal',
              'إلغاء الطلب '||OLD.order_number, OLD.id);
      NEW.xp_awarded := 0;
      NEW.coins_awarded := 0;
      PERFORM public.sync_user_level(OLD.user_id);
    END IF;
  END IF;
  RETURN NEW;
END $function$;