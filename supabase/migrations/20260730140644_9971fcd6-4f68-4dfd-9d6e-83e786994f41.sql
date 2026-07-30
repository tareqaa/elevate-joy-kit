DROP FUNCTION IF EXISTS public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, uuid, uuid, text, numeric, bigint, numeric);

CREATE OR REPLACE FUNCTION public.create_store_order(
  _user_id uuid,
  _customer_name text,
  _customer_whatsapp text,
  _items jsonb,
  _subtotal numeric,
  _currency text,
  _delivery_data jsonb,
  _contact_type text,
  _coupon_code text,
  _coins_used bigint,
  _credit_jod numeric,
  _client_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      -- Serialize on the coupon row so limit checks and the counter agree.
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
      -- Personal level coupon (user_coupons)
      IF _user_id IS NULL THEN
        RAISE EXCEPTION 'سجّل الدخول لاستخدام كوبون المستوى';
      END IF;
      SELECT * INTO _uc FROM public.user_coupons
       WHERE upper(code) = upper(_coupon_code) LIMIT 1 FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'الكوبون غير موجود'; END IF;
      IF _uc.user_id <> _user_id THEN RAISE EXCEPTION 'هذا الكوبون ليس لحسابك'; END IF;
      IF _uc.used_at IS NOT NULL THEN RAISE EXCEPTION 'تم استخدام هذا الكوبون'; END IF;
      IF _uc.expires_at < now() THEN RAISE EXCEPTION 'الكوبون منتهي الصلاحية'; END IF;
      _coupon_disc := round((_subtotal * _uc.percent / 100)::numeric, 2);
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
  _credit := round(_credit, 2);

  IF _credit > 0 THEN
    IF _user_id IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام رصيد المتجر';
    END IF;
    IF COALESCE(_credit_bal, 0) + 0.0049 < _credit THEN
      RAISE EXCEPTION 'رصيد المتجر غير كافٍ';
    END IF;
  END IF;

  _discount := round(_coupon_disc + _coins_disc + _credit, 3);
  _total := round(GREATEST(_subtotal - _discount, 0), 2);

  -- The browser's claimed total is used for nothing but this integrity check.
  IF _client_total IS NOT NULL AND abs(_client_total - _total) > 0.001 THEN
    RAISE EXCEPTION 'تغيّر السعر، أعد تحميل الصفحة';
  END IF;

  _status := CASE WHEN _credit > 0 AND _total <= 0.009 THEN 'paid'::public.order_status
                  ELSE 'pending'::public.order_status END;

  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_whatsapp, items,
    subtotal_jod, total_jod, paid_jod, currency_snapshot, delivery_data, status,
    contact_type, coupon_id, coupon_code, user_coupon_id, discount_jod,
    coins_used, coins_discount_jod, credit_used_jod
  ) VALUES (
    public.generate_order_number(), _user_id, _customer_name, _customer_whatsapp,
    COALESCE(_items, '[]'::jsonb),
    _subtotal, _total, _total, _currency, COALESCE(_delivery_data, '{}'::jsonb), _status,
    _contact_type, _coupon_id, _coupon_final_code, _user_coupon_id, _discount,
    _coins_used, _coins_disc, _credit
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
    _after_credit := round(GREATEST(_credit_bal - _credit, 0), 2);
    UPDATE public.profiles SET store_credit_jod = _after_credit WHERE id = _user_id;
    INSERT INTO public.store_credit_transactions
      (user_id, order_id, amount_jod, balance_after, kind, reason)
    VALUES (_user_id, _order_id, -_credit, _after_credit, 'spend',
            'استخدام رصيد المتجر على الطلب ' || _order_no);
  END IF;

  -- Public coupon redemption: the counter bump is a single atomic statement
  -- that refuses to cross usage_limit. No failure here is tolerated.
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

  -- Personal level coupon: must still be unused, otherwise the whole order fails.
  IF _user_coupon_id IS NOT NULL THEN
    UPDATE public.user_coupons
       SET used_at = now(), order_id = _order_id
     WHERE id = _user_coupon_id AND user_id = _user_id AND used_at IS NULL
     RETURNING id INTO _bumped;
    IF _bumped IS NULL THEN
      RAISE EXCEPTION 'تم استخدام هذا الكوبون';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', _order_id, 'order_number', _order_no,
    'total_jod', _total, 'discount_jod', _discount,
    'coupon_discount_jod', _coupon_disc,
    'credit_used_jod', _credit, 'coins_used', _coins_used, 'status', _status
  );
END $$;

REVOKE ALL ON FUNCTION public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, text, bigint, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, text, bigint, numeric, numeric) TO service_role;