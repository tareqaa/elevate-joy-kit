-- ============ LEVELS ============
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🥉',
  color TEXT NOT NULL DEFAULT '#cd7f32',
  gradient TEXT NOT NULL DEFAULT 'from-amber-600 to-yellow-700',
  min_xp INTEGER NOT NULL DEFAULT 0,
  coins_bonus_pct NUMERIC NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  coupon_percent NUMERIC NOT NULL DEFAULT 0,
  coupon_max_discount_jod NUMERIC,
  coupon_valid_days INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.levels TO anon, authenticated;
GRANT ALL ON public.levels TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.levels TO authenticated;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "Admins manage levels" ON public.levels FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER levels_updated BEFORE UPDATE ON public.levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.levels (code,name_ar,name_en,icon,color,gradient,min_xp,coins_bonus_pct,reward_coins,coupon_percent,coupon_max_discount_jod,sort_order) VALUES
('bronze','برونزي','Bronze','🥉','#cd7f32','from-amber-700 to-yellow-800',0,0,0,0,NULL,1),
('silver','فضي','Silver','🥈','#c0c0c0','from-slate-300 to-slate-500',5000,5,200,2,5,2),
('gold','ذهبي','Gold','🥇','#ffd700','from-yellow-300 to-amber-500',15000,10,500,5,10,3),
('platinum','بلاتيني','Platinum','💎','#22d3ee','from-cyan-300 to-sky-500',35000,20,1000,7,15,4),
('diamond','ماسي','Diamond','💠','#a78bfa','from-violet-400 to-fuchsia-600',75000,30,2000,10,25,5),
('legend','أسطوري','Legend','👑','#f472b6','from-pink-400 via-amber-300 to-cyan-400',150000,50,5000,15,50,6);

-- ============ LEVEL REWARDS ============
CREATE TABLE public.level_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.level_rewards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.level_rewards TO authenticated;
GRANT ALL ON public.level_rewards TO service_role;
ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads level rewards" ON public.level_rewards FOR SELECT USING (true);
CREATE POLICY "Admins manage level rewards" ON public.level_rewards FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER level_rewards_updated BEFORE UPDATE ON public.level_rewards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.level_rewards (level_id, reward_type, label_ar, label_en, value, sort_order)
SELECT l.id,'coins','+'||l.reward_coins||' GX Coins','+'||l.reward_coins||' GX Coins',jsonb_build_object('coins',l.reward_coins),1
FROM public.levels l WHERE l.reward_coins > 0;
INSERT INTO public.level_rewards (level_id, reward_type, label_ar, label_en, value, sort_order)
SELECT l.id,'coupon','كوبون شهري '||l.coupon_percent||'%','Monthly '||l.coupon_percent||'% coupon',jsonb_build_object('percent',l.coupon_percent),2
FROM public.levels l WHERE l.coupon_percent > 0;
INSERT INTO public.level_rewards (level_id, reward_type, label_ar, label_en, value, sort_order)
SELECT l.id,'avatars','فتح مجموعة أفاتار '||l.name_ar,'Unlock '||l.name_en||' avatar collection','{}'::jsonb,3
FROM public.levels l WHERE l.code <> 'bronze';
INSERT INTO public.level_rewards (level_id, reward_type, label_ar, label_en, value, sort_order)
SELECT l.id,'border','إطار أفاتار '||l.name_ar,l.name_en||' avatar border','{}'::jsonb,4
FROM public.levels l WHERE l.code <> 'bronze';
INSERT INTO public.level_rewards (level_id, reward_type, label_ar, label_en, value, sort_order)
SELECT l.id,'bonus','+'||l.coins_bonus_pct||'% GX Coins على كل شراء','+'||l.coins_bonus_pct||'% GX Coins on purchases',jsonb_build_object('pct',l.coins_bonus_pct),5
FROM public.levels l WHERE l.coins_bonus_pct > 0;

-- ============ PROFILE COLUMNS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gx_coins BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_code TEXT NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS avatar_id UUID,
  ADD COLUMN IF NOT EXISTS avatar_border TEXT,
  ADD COLUMN IF NOT EXISTS orders_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coins_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_discount_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_jod NUMERIC,
  ADD COLUMN IF NOT EXISTS coins_awarded BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_coupon_id UUID;

-- ============ XP TRANSACTIONS ============
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER,
  source TEXT NOT NULL DEFAULT 'purchase',
  reason TEXT,
  order_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX xp_tx_user_idx ON public.xp_transactions(user_id, created_at DESC);
GRANT SELECT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own xp" ON public.xp_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all xp" ON public.xp_transactions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ GX COIN TRANSACTIONS ============
CREATE TABLE public.gx_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT,
  kind TEXT NOT NULL DEFAULT 'earn',
  source TEXT NOT NULL DEFAULT 'purchase',
  reason TEXT,
  order_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coin_tx_user_idx ON public.gx_coin_transactions(user_id, created_at DESC);
GRANT SELECT ON public.gx_coin_transactions TO authenticated;
GRANT ALL ON public.gx_coin_transactions TO service_role;
ALTER TABLE public.gx_coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coins" ON public.gx_coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all coins" ON public.gx_coin_transactions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ USER COUPONS (level based) ============
CREATE TABLE public.user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_code TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  percent NUMERIC NOT NULL,
  max_discount_jod NUMERIC,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_coupons_user_idx ON public.user_coupons(user_id);
GRANT SELECT ON public.user_coupons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_coupons TO authenticated;
GRANT ALL ON public.user_coupons TO service_role;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coupons" ON public.user_coupons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage user coupons" ON public.user_coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER user_coupons_updated BEFORE UPDATE ON public.user_coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AVATARS ============
CREATE TABLE public.avatar_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  required_level_code TEXT NOT NULL DEFAULT 'bronze',
  border_css TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.avatar_collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.avatar_collections TO authenticated;
GRANT ALL ON public.avatar_collections TO service_role;
ALTER TABLE public.avatar_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads collections" ON public.avatar_collections FOR SELECT USING (true);
CREATE POLICY "Admins manage collections" ON public.avatar_collections FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER avatar_collections_updated BEFORE UPDATE ON public.avatar_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.avatar_collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.avatars TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.avatars TO authenticated;
GRANT ALL ON public.avatars TO service_role;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads avatars" ON public.avatars FOR SELECT USING (true);
CREATE POLICY "Admins manage avatars" ON public.avatars FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER avatars_updated BEFORE UPDATE ON public.avatars FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  avatar_id UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, avatar_id)
);
GRANT SELECT, INSERT ON public.user_avatars TO authenticated;
GRANT ALL ON public.user_avatars TO service_role;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own avatars" ON public.user_avatars FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users unlock own avatars" ON public.user_avatars FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view user avatars" ON public.user_avatars FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

INSERT INTO public.avatar_collections (slug,name_ar,name_en,required_level_code,border_css,sort_order) VALUES
('bronze','المجموعة الأساسية','Starter','bronze','0 0 0 3px rgba(205,127,50,.55)',1),
('silver','مجموعة فضية','Silver','silver','0 0 0 3px rgba(192,192,192,.7)',2),
('gold','مجموعة ذهبية','Gold','gold','0 0 0 3px rgba(255,215,0,.75)',3),
('platinum','مجموعة بلاتينية','Platinum','platinum','0 0 0 3px rgba(34,211,238,.8)',4),
('diamond','مجموعة ماسية','Diamond','diamond','0 0 0 3px rgba(167,139,250,.85)',5),
('legend','مجموعة الأساطير','Legend','legend','0 0 0 3px rgba(244,114,182,.9)',6);

INSERT INTO public.avatars (collection_id,name,image_url,sort_order)
SELECT c.id, c.slug||'-'||g.i,
  'https://api.dicebear.com/9.x/adventurer/svg?seed='||c.slug||g.i||'&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6',
  g.i
FROM public.avatar_collections c CROSS JOIN generate_series(1,8) AS g(i);

-- ============ BADGES ============
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT NOT NULL DEFAULT '🏆',
  color TEXT NOT NULL DEFAULT '#22d3ee',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER badges_updated BEFORE UPDATE ON public.badges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.badges (slug,name_ar,name_en,description_ar,description_en,icon,color,criteria,sort_order) VALUES
('first_purchase','أول عملية شراء','First Purchase','أتمّ أول طلب بنجاح','Completed the first order','🏆','#facc15','{"type":"orders","count":1}',1),
('regular_customer','عميل دائم','Regular Customer','أتمّ 5 طلبات','Completed 5 orders','🔥','#fb923c','{"type":"orders","count":5}',2),
('vip_buyer','مشترٍ VIP','VIP Buyer','إنفاق 100 د.أ أو أكثر','Spent 100 JOD or more','💎','#22d3ee','{"type":"spending","amount":100}',3),
('legend_member','عضو أسطوري','Legend Member','الوصول إلى مستوى Legend','Reached Legend level','👑','#f472b6','{"type":"level","code":"legend"}',4),
('reviewer','مقيّم','Reviewer','كتابة تقييم معتمد','Wrote an approved review','⭐','#a78bfa','{"type":"reviews","count":1}',5);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins manage user badges" ON public.user_badges FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ LEADERBOARD SNAPSHOTS (future weekly) ============
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL DEFAULT 'all_time',
  period_start DATE,
  period_end DATE,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leaderboard_snapshots TO anon, authenticated;
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads snapshots" ON public.leaderboard_snapshots FOR SELECT USING (true);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  target_user_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') AND actor_id = auth.uid());

-- ============ CORE LOYALTY FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.level_for_xp(_xp INTEGER)
RETURNS public.levels LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.levels
  WHERE is_active AND min_xp <= GREATEST(COALESCE(_xp,0),0)
  ORDER BY min_xp DESC LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.level_for_xp(INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.issue_level_coupon(_user_id UUID, _level public.levels)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _code TEXT; _id UUID;
BEGIN
  IF _level.coupon_percent IS NULL OR _level.coupon_percent <= 0 THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.user_coupons
             WHERE user_id=_user_id AND level_code=_level.code
               AND issued_at > now() - interval '30 days') THEN RETURN NULL; END IF;
  _code := 'GX' || upper(substr(_level.code,1,3)) || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.user_coupons (user_id, level_code, code, percent, max_discount_jod, expires_at)
  VALUES (_user_id, _level.code, _code, _level.coupon_percent, _level.coupon_max_discount_jod,
          now() + (COALESCE(_level.coupon_valid_days,30) || ' days')::interval)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.issue_level_coupon(UUID, public.levels) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_badges(_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; _orders INT; _spent NUMERIC; _lvl TEXT; _reviews INT; _ok BOOLEAN;
BEGIN
  SELECT count(*), COALESCE(sum(total_jod),0) INTO _orders, _spent
    FROM public.orders WHERE user_id=_user_id AND status='delivered';
  SELECT level_code INTO _lvl FROM public.profiles WHERE id=_user_id;
  SELECT count(*) INTO _reviews FROM public.reviews WHERE user_id=_user_id AND status='approved';
  FOR b IN SELECT * FROM public.badges WHERE is_active LOOP
    _ok := false;
    IF b.criteria->>'type' = 'orders' THEN _ok := _orders >= COALESCE((b.criteria->>'count')::int, 1);
    ELSIF b.criteria->>'type' = 'spending' THEN _ok := _spent >= COALESCE((b.criteria->>'amount')::numeric, 0);
    ELSIF b.criteria->>'type' = 'level' THEN _ok := _lvl = (b.criteria->>'code');
    ELSIF b.criteria->>'type' = 'reviews' THEN _ok := _reviews >= COALESCE((b.criteria->>'count')::int, 1);
    END IF;
    IF _ok THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (_user_id, b.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_badges(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_user_level(_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _xp INT; _old TEXT; _new public.levels;
BEGIN
  SELECT COALESCE(xp,0), level_code INTO _xp, _old FROM public.profiles WHERE id=_user_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO _new FROM public.level_for_xp(_xp);
  IF _new.id IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
     SET level_code = _new.code,
         level = (SELECT sort_order FROM public.levels WHERE id=_new.id)
   WHERE id=_user_id;
  IF _old IS DISTINCT FROM _new.code
     AND (SELECT sort_order FROM public.levels WHERE code=_new.code)
       > COALESCE((SELECT sort_order FROM public.levels WHERE code=_old),0) THEN
    IF _new.reward_coins > 0 THEN
      UPDATE public.profiles SET gx_coins = gx_coins + _new.reward_coins WHERE id=_user_id;
      INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason)
      VALUES (_user_id, _new.reward_coins,
              (SELECT gx_coins FROM public.profiles WHERE id=_user_id),
              'earn','level_up','مكافأة الوصول إلى '||_new.name_ar);
    END IF;
    PERFORM public.issue_level_coupon(_user_id, _new);
  END IF;
  PERFORM public.award_badges(_user_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_user_level(UUID) FROM PUBLIC, anon, authenticated;

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
    _coins := round(_paid * 100 * (1 + _bonus/100.0));

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
END;
$$;

CREATE TRIGGER orders_loyalty BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_on_order_status();

-- ============ CLIENT-FACING RPCs ============
CREATE OR REPLACE FUNCTION public.get_loyalty_leaderboard(_limit INTEGER DEFAULT 50)
RETURNS TABLE(rank BIGINT, user_id UUID, username TEXT, full_name TEXT, avatar_url TEXT, xp INTEGER, level_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rank() OVER (ORDER BY COALESCE(p.xp,0) DESC, p.created_at ASC),
         p.id, p.username, p.full_name, p.avatar_url, COALESCE(p.xp,0), p.level_code
  FROM public.profiles p
  WHERE p.username IS NOT NULL
  ORDER BY COALESCE(p.xp,0) DESC, p.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit,50), 100));
$$;
GRANT EXECUTE ON FUNCTION public.get_loyalty_leaderboard(INTEGER) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_gx_coins(_coins BIGINT, _subtotal_jod NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal BIGINT; _max BIGINT; _disc NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid',false,'message','سجّل الدخول لاستخدام GX Coins'); END IF;
  SELECT gx_coins INTO _bal FROM public.profiles WHERE id = auth.uid();
  IF _coins IS NULL OR _coins <= 0 THEN RETURN jsonb_build_object('valid',false,'message','أدخل عدد صحيح'); END IF;
  IF _coins > COALESCE(_bal,0) THEN RETURN jsonb_build_object('valid',false,'message','رصيدك غير كافٍ'); END IF;
  _max := floor(GREATEST(_subtotal_jod,0) * 1000);
  IF _coins > _max THEN _coins := _max; END IF;
  _disc := round((_coins / 1000.0)::numeric, 3);
  IF _disc <= 0 THEN RETURN jsonb_build_object('valid',false,'message','الحد الأدنى 1000 عملة'); END IF;
  RETURN jsonb_build_object('valid',true,'coins',_coins,'discount_jod',_disc,'balance',_bal);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_gx_coins(BIGINT, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.spend_gx_coins(_coins BIGINT, _order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT gx_coins INTO _bal FROM public.profiles WHERE id = auth.uid();
  IF _coins <= 0 OR _coins > COALESCE(_bal,0) THEN RETURN jsonb_build_object('ok',false,'message','رصيد غير كافٍ'); END IF;
  UPDATE public.profiles SET gx_coins = gx_coins - _coins WHERE id = auth.uid();
  INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason, order_id)
  VALUES (auth.uid(), -_coins, (SELECT gx_coins FROM public.profiles WHERE id=auth.uid()), 'redeem','purchase','استبدال في طلب', _order_id);
  RETURN jsonb_build_object('ok',true,'balance',(SELECT gx_coins FROM public.profiles WHERE id=auth.uid()));
END;
$$;
GRANT EXECUTE ON FUNCTION public.spend_gx_coins(BIGINT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_loyalty(_user_id UUID, _xp INTEGER, _coins BIGINT, _reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF COALESCE(_reason,'') = '' THEN RAISE EXCEPTION 'reason required'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF COALESCE(_xp,0) <> 0 THEN
    UPDATE public.profiles SET xp = GREATEST(COALESCE(xp,0) + _xp, 0) WHERE id=_user_id;
    INSERT INTO public.xp_transactions (user_id, amount, balance_after, source, reason)
    VALUES (_user_id, _xp, (SELECT xp FROM public.profiles WHERE id=_user_id), 'admin', _reason);
  END IF;
  IF COALESCE(_coins,0) <> 0 THEN
    UPDATE public.profiles SET gx_coins = GREATEST(gx_coins + _coins, 0) WHERE id=_user_id;
    INSERT INTO public.gx_coin_transactions (user_id, amount, balance_after, kind, source, reason)
    VALUES (_user_id, _coins, (SELECT gx_coins FROM public.profiles WHERE id=_user_id),
            CASE WHEN _coins > 0 THEN 'earn' ELSE 'redeem' END, 'admin', _reason);
  END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, target_user_id, action, reason, metadata)
  VALUES (auth.uid(), _email, _user_id, 'loyalty.adjust', _reason, jsonb_build_object('xp',_xp,'coins',_coins));
  PERFORM public.sync_user_level(_user_id);
  RETURN jsonb_build_object('ok',true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_loyalty(UUID, INTEGER, BIGINT, TEXT) TO authenticated;

-- backfill level codes for existing profiles
UPDATE public.profiles p SET level_code = l.code, level = l.sort_order
FROM public.levels l
WHERE l.id = (SELECT id FROM public.levels x WHERE x.min_xp <= COALESCE(p.xp,0) ORDER BY x.min_xp DESC LIMIT 1);