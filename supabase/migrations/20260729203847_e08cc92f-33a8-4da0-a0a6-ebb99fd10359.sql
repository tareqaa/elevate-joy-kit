
-- 1) Store credit
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_credit_jod NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.store_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_jod numeric NOT NULL,
  balance_after numeric,
  kind text NOT NULL DEFAULT 'adjust',
  reason text,
  order_id uuid,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_credit_transactions TO authenticated;
GRANT ALL ON public.store_credit_transactions TO service_role;
ALTER TABLE public.store_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own store credit tx" ON public.store_credit_transactions;
CREATE POLICY "own store credit tx" ON public.store_credit_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins read store credit tx" ON public.store_credit_transactions;
CREATE POLICY "admins read store credit tx" ON public.store_credit_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS store_credit_tx_user_idx ON public.store_credit_transactions(user_id, created_at DESC);

-- 2) Admin adjust store credit
CREATE OR REPLACE FUNCTION public.admin_adjust_store_credit(_user_id uuid, _amount numeric, _reason text DEFAULT NULL, _order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'غير مصرح');
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'أدخل مبلغاً صحيحاً');
  END IF;
  UPDATE public.profiles
     SET store_credit_jod = GREATEST(COALESCE(store_credit_jod,0) + _amount, 0)
   WHERE id = _user_id
   RETURNING store_credit_jod INTO _bal;
  IF _bal IS NULL THEN RETURN jsonb_build_object('ok', false, 'message', 'المستخدم غير موجود'); END IF;

  INSERT INTO public.store_credit_transactions (user_id, amount_jod, balance_after, kind, reason, order_id, actor_id)
  VALUES (_user_id, _amount, _bal, CASE WHEN _amount > 0 THEN 'refund' ELSE 'spend' END, _reason, _order_id, auth.uid());

  PERFORM public.log_admin_action('store_credit_adjust', 'profile', _user_id::text,
    jsonb_build_object('amount', _amount, 'reason', _reason, 'balance_after', _bal));

  RETURN jsonb_build_object('ok', true, 'balance', _bal);
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_store_credit(uuid, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_store_credit(uuid, numeric, text, uuid) TO authenticated;

-- 3) Level coin bonuses
UPDATE public.levels SET coins_bonus_pct = 0  WHERE code = 'bronze';
UPDATE public.levels SET coins_bonus_pct = 5  WHERE code = 'silver';
UPDATE public.levels SET coins_bonus_pct = 10 WHERE code = 'gold';
UPDATE public.levels SET coins_bonus_pct = 20 WHERE code = 'platinum';
UPDATE public.levels SET coins_bonus_pct = 30 WHERE code = 'diamond';
UPDATE public.levels SET coins_bonus_pct = 50 WHERE code = 'legend';

-- 4) Earning rate: 1 JOD paid = 10 GX Coins (XP stays 100/JOD)
CREATE OR REPLACE FUNCTION public.apply_loyalty_on_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _paid NUMERIC; _xp INT; _coins BIGINT; _bonus NUMERIC; _lvl public.levels;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    _paid := GREATEST(COALESCE(NEW.paid_jod, NEW.total_jod, 0) - COALESCE(NEW.coins_discount_jod,0), 0);
    IF _paid <= 0 THEN RETURN NEW; END IF;
    SELECT * INTO _lvl FROM public.level_for_xp((SELECT COALESCE(xp,0) FROM public.profiles WHERE id=NEW.user_id));
    _bonus := COALESCE(_lvl.coins_bonus_pct, 0);
    _xp := round(_paid * 100);
    _coins := round(_paid * 10 * (1 + _bonus/100.0));

    UPDATE public.profiles
       SET xp = COALESCE(xp,0) + _xp,
           gx_coins = gx_coins + _coins,
           total_spent = COALESCE(total_spent,0) + _paid,
           orders_count = orders_count + 1
     WHERE id = NEW.user_id;

    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason, order_id)
    VALUES (NEW.user_id, _xp, (SELECT xp FROM public.profiles WHERE id=NEW.user_id), 'purchase',
            'طلب '||NEW.order_number, NEW.id);
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id)
    VALUES (NEW.user_id, _coins, (SELECT gx_coins FROM public.profiles WHERE id=NEW.user_id), 'earn','purchase',
            'طلب '||NEW.order_number, NEW.id);

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
END $$;

-- 5) Redemption: max 50% of order value
CREATE OR REPLACE FUNCTION public.redeem_gx_coins(_coins bigint, _subtotal_jod numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal BIGINT; _max BIGINT; _disc NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid',false,'message','سجّل الدخول لاستخدام GX Coins'); END IF;
  SELECT gx_coins INTO _bal FROM public.profiles WHERE id = auth.uid();
  IF _coins IS NULL OR _coins <= 0 THEN RETURN jsonb_build_object('valid',false,'message','أدخل عدد صحيح'); END IF;
  IF _coins > COALESCE(_bal,0) THEN RETURN jsonb_build_object('valid',false,'message','رصيدك غير كافٍ'); END IF;
  _max := floor(GREATEST(_subtotal_jod,0) * 0.5 * 1000);
  IF _coins > _max THEN _coins := _max; END IF;
  _disc := round((_coins / 1000.0)::numeric, 3);
  IF _disc <= 0 THEN RETURN jsonb_build_object('valid',false,'message','الحد الأقصى للخصم 50% من قيمة الطلب'); END IF;
  RETURN jsonb_build_object('valid',true,'coins',_coins,'discount_jod',_disc,'balance',_bal,'max_coins',_max);
END $$;

REVOKE EXECUTE ON FUNCTION public.redeem_gx_coins(bigint, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_gx_coins(bigint, numeric) TO authenticated;

-- 6) get_my_loyalty exposes store credit
CREATE OR REPLACE FUNCTION public.get_my_loyalty()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; cur public.levels%ROWTYPE; nxt public.levels%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO cur FROM public.level_for_xp(COALESCE(p.xp,0));
  SELECT * INTO nxt FROM public.levels WHERE is_active AND min_xp > COALESCE(p.xp,0) ORDER BY min_xp ASC LIMIT 1;
  RETURN jsonb_build_object(
    'ok', true,
    'xp', COALESCE(p.xp,0),
    'coins', COALESCE(p.gx_coins,0),
    'store_credit', COALESCE(p.store_credit_jod,0),
    'total_spent', COALESCE(p.total_spent,0),
    'orders_count', COALESCE(p.orders_count,0),
    'level', to_jsonb(cur),
    'next_level', to_jsonb(nxt),
    'rank', (SELECT count(*)+1 FROM public.profiles x WHERE COALESCE(x.xp,0) > COALESCE(p.xp,0))
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_my_loyalty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_loyalty() TO authenticated;

-- 7) Public profile exposes level code + coins-free public stats
DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(id uuid, username text, full_name text, avatar_url text, level integer, xp integer, rank bigint, created_at timestamptz, level_code text, orders_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  with ranked as (
    select p.id, p.username, p.full_name, p.avatar_url, p.level, p.xp, p.created_at, p.level_code, p.orders_count,
           rank() over (order by coalesce(p.xp,0) desc, p.created_at asc) as rank
    from public.profiles p
    where p.username is not null
  )
  select id, username, full_name, avatar_url, level, xp, rank, created_at, level_code, orders_count
  from ranked
  where lower(username) = lower(_username)
  limit 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

-- 8) Unified anime/ninja avatar art (light skin, single art style)
WITH ordered AS (
  SELECT a.id,
         (ARRAY['Shinobi','Kitsune','Ronin','Kunai','Sakura','Hayato','Akira','Yuki',
                'Raiden','Sora','Kaito','Rin','Tatsu','Mika','Ryu','Ayame',
                'Kenji','Hina','Toshi','Naru','Shiro','Kuro','Zenko','Homura',
                'Isamu','Kaze','Mizu','Hoshi','Tsuki','Genji','Sango','Yumi',
                'Arata','Emi','Fuji','Goro','Haru','Iwao','Jiro','Kira',
                'Leiko','Masa','Nobu','Osamu','Riku','Saki','Taro','Umi'])[
           ((row_number() OVER (ORDER BY c.sort_order, a.sort_order))::int - 1) % 48 + 1] AS seed
  FROM public.avatars a
  JOIN public.avatar_collections c ON c.id = a.collection_id
)
UPDATE public.avatars a
SET image_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=' || o.seed
    || '&backgroundType=gradientLinear&backgroundColor=0b1220,12233a&radius=50&scale=95'
    || '&skinColor=f2d3b1&hairColor=0e0e0e,2c1b18,3a2a6d,00e5ff,b25aff,ffffff'
    || '&eyesColor=00e5ff&glassesProbability=0&featuresProbability=0&earringsProbability=0',
    name = o.seed
FROM ordered o
WHERE o.id = a.id;
