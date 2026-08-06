-- =========================================================
-- 1) Checkout: recompute the subtotal server-side (DB-authoritative)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_store_order(
  _user_id uuid, _customer_name text, _customer_whatsapp text, _items jsonb,
  _subtotal numeric, _currency text, _delivery_data jsonb, _contact_type text,
  _coupon_code text, _coins_used bigint, _credit_jod numeric, _client_total numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
  _ov jsonb;
  _it jsonb;
  _cid text;
  _q integer;
  _base numeric;
  _price numeric;
  _calc numeric;
  _allow_custom boolean := false;
BEGIN
  -- SECURITY: identity comes from the session, never from the caller's argument.
  IF auth.uid() IS NOT NULL THEN
    _user_id := auth.uid();
  ELSIF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    _user_id := NULL;
  END IF;

  -- SECURITY: untrusted callers never set their own price. Recompute the
  -- subtotal from product_variants + site_settings.catalog_prices overrides.
  IF current_user IN ('anon', 'authenticated') THEN
    _allow_custom := _user_id IS NOT NULL AND public.has_role(_user_id, 'admin');
    SELECT COALESCE(value, '{}'::jsonb) INTO _ov
      FROM public.site_settings WHERE key = 'catalog_prices';
    _ov := COALESCE(_ov, '{}'::jsonb);
    _calc := 0;

    IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
      RAISE EXCEPTION 'السلة فارغة';
    END IF;

    FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
      _cid := NULLIF(COALESCE(_it->>'cartId', _it->>'cart_id'), '');
      IF _cid IS NULL THEN RAISE EXCEPTION 'عنصر غير صالح في السلة'; END IF;
      _q := COALESCE(NULLIF(_it->>'qty', '')::int, 1);
      IF _q < 1 OR _q > 99 THEN RAISE EXCEPTION 'كمية غير صالحة في السلة'; END IF;

      SELECT v.price_jod INTO _base
        FROM public.product_variants v
        JOIN public.products p ON p.id = v.product_id
       WHERE v.cart_id = _cid AND v.is_active AND p.is_active
       LIMIT 1;

      _price := NULLIF(_ov->_cid->>'price', '')::numeric;
      IF _price IS NULL OR _price < 0 THEN _price := _base; END IF;

      IF _price IS NULL THEN
        IF NOT _allow_custom THEN
          RAISE EXCEPTION 'تغيّر السعر، أعد تحميل الصفحة';
        END IF;
        _price := COALESCE(NULLIF(_it->>'price', '')::numeric, -1);
        IF _price < 0 OR _price > 100000 THEN RAISE EXCEPTION 'سعر غير صالح'; END IF;
      END IF;

      _calc := round(_calc + round(_price, 3) * _q, 3);
    END LOOP;

    _subtotal := _calc;
  END IF;

  _subtotal := GREATEST(COALESCE(_subtotal, 0), 0);
  _coins_used := GREATEST(COALESCE(_coins_used, 0), 0);
  _credit := GREATEST(COALESCE(_credit_jod, 0), 0);
  _coins_disc := round((_coins_used / 1000.0)::numeric, 3);
  _coupon_code := NULLIF(TRIM(COALESCE(_coupon_code, '')), '');

  IF _user_id IS NOT NULL THEN
    SELECT gx_coins, COALESCE(store_credit_jod, 0)
      INTO _coin_bal, _credit_bal
      FROM public.profiles WHERE id = _user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'الحساب غير موجود';
    END IF;

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

  IF _coins_used > 0 THEN
    _after_coins := _coin_bal - _coins_used;
    UPDATE public.profiles SET gx_coins = _after_coins WHERE id = _user_id;
    INSERT INTO public.gx_coin_transactions
      (user_id, order_id, amount, balance_after, kind, source, reason, metadata)
    VALUES (_user_id, _order_id, -_coins_used, _after_coins, 'spend', 'order_checkout',
            'خصم على الطلب ' || _order_no,
            jsonb_build_object('balance_before', _coin_bal, 'coins_discount_jod', _coins_disc));
  END IF;

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
END
$fn$;

-- =========================================================
-- 2) Tournament scores: server-issued play sessions + plausibility check
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tournament_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournament_runs TO authenticated;
GRANT ALL ON public.tournament_runs TO service_role;
ALTER TABLE public.tournament_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own runs" ON public.tournament_runs;
CREATE POLICY "Users read own runs" ON public.tournament_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tournament_runs_user_idx
  ON public.tournament_runs (user_id, tournament_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.start_tournament_run(_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.game_tournaments;
  _run uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;
  SELECT * INTO _t FROM public.game_tournaments WHERE id = _tournament_id AND is_active = true;
  IF _t.id IS NULL OR now() < _t.starts_at OR now() > _t.ends_at OR _t.status IN ('ended','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tournament_closed');
  END IF;

  -- keep one open run per user/tournament: reuse the latest unsubmitted one
  DELETE FROM public.tournament_runs
   WHERE user_id = _uid AND tournament_id = _tournament_id
     AND submitted_at IS NULL AND started_at < now() - interval '3 hours';

  INSERT INTO public.tournament_runs (tournament_id, user_id)
  VALUES (_tournament_id, _uid)
  RETURNING id INTO _run;

  RETURN jsonb_build_object('ok', true, 'run_id', _run);
END;
$$;

DROP FUNCTION IF EXISTS public.submit_tournament_score(uuid, integer);

CREATE OR REPLACE FUNCTION public.submit_tournament_score(
  _tournament_id uuid, _score integer, _run_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.game_tournaments;
  _best integer;
  _cnt integer;
  _exists boolean;
  _run public.tournament_runs%ROWTYPE;
  _elapsed numeric;
  _max_plausible numeric;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_score');
  END IF;
  SELECT * INTO _t FROM public.game_tournaments WHERE id = _tournament_id AND is_active = true;
  IF _t.id IS NULL OR now() < _t.starts_at OR now() > _t.ends_at OR _t.status IN ('ended','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tournament_closed');
  END IF;

  -- SECURITY: a score is only accepted for a server-issued, unconsumed play
  -- session, and only if it is plausible for the time actually played.
  IF _run_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_required');
  END IF;

  SELECT * INTO _run FROM public.tournament_runs
   WHERE id = _run_id FOR UPDATE;
  IF _run.id IS NULL OR _run.user_id <> _uid OR _run.tournament_id <> _tournament_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_run');
  END IF;
  IF _run.submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_already_submitted');
  END IF;

  _elapsed := EXTRACT(EPOCH FROM (now() - _run.started_at));
  IF _elapsed < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_too_short');
  END IF;
  IF _elapsed > 10800 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_expired');
  END IF;

  -- ~600 points per played second plus a small warm-up allowance
  _max_plausible := 2000 + _elapsed * 600;
  IF _score > _max_plausible THEN
    UPDATE public.tournament_runs
       SET submitted_at = now(), score = _score WHERE id = _run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'implausible_score');
  END IF;

  UPDATE public.tournament_runs
     SET submitted_at = now(), score = _score WHERE id = _run.id;

  IF _t.max_players IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.tournament_best_scores
                  WHERE tournament_id = _tournament_id AND user_id = _uid) INTO _exists;
    IF NOT _exists THEN
      SELECT count(*) INTO _cnt FROM public.tournament_best_scores WHERE tournament_id = _tournament_id;
      IF _cnt >= _t.max_players THEN
        RETURN jsonb_build_object('ok', false, 'error', 'tournament_full');
      END IF;
    END IF;
  END IF;

  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score)
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET score = GREATEST(public.tournament_best_scores.score, EXCLUDED.score)
  RETURNING score INTO _best;

  INSERT INTO public.game_tournament_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score);

  RETURN jsonb_build_object('ok', true, 'best', _best);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.start_tournament_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_tournament_run(uuid) TO authenticated, service_role;

-- =========================================================
-- 3) Lock down SECURITY DEFINER functions exposed to anon / authenticated
-- =========================================================
DO $$
DECLARE
  r record;
BEGIN
  -- admin-only routines: never callable by signed-out visitors
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND p.proname LIKE 'admin\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;

  -- internal helpers: server-side only
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND p.proname IN (
         'grant_user_reward','guard_store_order_user','revoke_ineligible_rewards',
         'refund_order_coins','refund_order_credit','sync_user_level','award_badges',
         'issue_level_coupon','level_for_xp','auto_cancel_stale_orders','log_admin_action'
       )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- =========================================================
-- 4) Coupon redemptions: owners can read their own history
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view their own coupon redemptions"
  ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);