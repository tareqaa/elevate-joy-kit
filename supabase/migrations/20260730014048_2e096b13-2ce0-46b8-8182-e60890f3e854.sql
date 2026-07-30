
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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gx_coins BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_code TEXT NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS avatar_id UUID,
  ADD COLUMN IF NOT EXISTS avatar_border TEXT,
  ADD COLUMN IF NOT EXISTS orders_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_credit_jod NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coins_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_discount_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_jod NUMERIC,
  ADD COLUMN IF NOT EXISTS coins_awarded BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_coupon_id UUID;

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_coupons TO authenticated;
GRANT ALL ON public.user_coupons TO service_role;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coupons" ON public.user_coupons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage user coupons" ON public.user_coupons FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER user_coupons_updated BEFORE UPDATE ON public.user_coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

CREATE TRIGGER orders_loyalty BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_on_order_status();

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
REVOKE EXECUTE ON FUNCTION public.get_loyalty_leaderboard(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_loyalty_leaderboard(INTEGER) TO anon, authenticated;

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
REVOKE EXECUTE ON FUNCTION public.spend_gx_coins(BIGINT, UUID) FROM PUBLIC, anon;
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
REVOKE EXECUTE ON FUNCTION public.admin_adjust_loyalty(UUID, INTEGER, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_loyalty(UUID, INTEGER, BIGINT, TEXT) TO authenticated;

UPDATE public.profiles p SET level_code = l.code, level = l.sort_order
FROM public.levels l
WHERE l.id = (SELECT id FROM public.levels x WHERE x.min_xp <= COALESCE(p.xp,0) ORDER BY x.min_xp DESC LIMIT 1);

CREATE OR REPLACE FUNCTION public.validate_my_level_coupon(_code TEXT, _subtotal_jod NUMERIC)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.user_coupons%ROWTYPE; d NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid',false,'message','سجّل الدخول لاستخدام كوبون المستوى'); END IF;
  SELECT * INTO c FROM public.user_coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid',false,'message','الكوبون غير موجود'); END IF;
  IF c.user_id <> auth.uid() THEN RETURN jsonb_build_object('valid',false,'message','هذا الكوبون ليس لحسابك'); END IF;
  IF c.used_at IS NOT NULL THEN RETURN jsonb_build_object('valid',false,'message','تم استخدام هذا الكوبون'); END IF;
  IF c.expires_at < now() THEN RETURN jsonb_build_object('valid',false,'message','الكوبون منتهي الصلاحية'); END IF;
  d := round((GREATEST(_subtotal_jod,0) * c.percent / 100)::numeric, 2);
  IF c.max_discount_jod IS NOT NULL AND d > c.max_discount_jod THEN d := c.max_discount_jod; END IF;
  IF d <= 0 THEN RETURN jsonb_build_object('valid',false,'message','قيمة الخصم صفر'); END IF;
  RETURN jsonb_build_object('valid',true,'user_coupon_id',c.id,'code',c.code,'percent',c.percent,
    'max_discount_jod',c.max_discount_jod,'discount_jod',d,'message','تم تطبيق كوبون المستوى');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_my_level_coupon(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_my_level_coupon(TEXT, NUMERIC) TO authenticated;

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
CREATE POLICY "own store credit tx" ON public.store_credit_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read store credit tx" ON public.store_credit_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS store_credit_tx_user_idx ON public.store_credit_transactions(user_id, created_at DESC);

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

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'refunded';

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
CREATE POLICY "Admins can view refund log"
  ON public.refund_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS refund_log_order_idx ON public.refund_log(order_id);
CREATE INDEX IF NOT EXISTS refund_log_user_idx ON public.refund_log(user_id);

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

  UPDATE public.profiles p
     SET avatar_id = NULL
   WHERE p.id = _user_id
     AND p.avatar_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.user_avatars ua WHERE ua.user_id = _user_id AND ua.avatar_id = p.avatar_id);

  RETURN jsonb_build_object('badges_removed', _badges, 'avatars_locked', _avatars, 'coupons_revoked', _coupons);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_ineligible_rewards(UUID) FROM PUBLIC, anon, authenticated;

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
  IF o.status::text = 'refunded' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'تم استرجاع هذا الطلب مسبقاً');
  END IF;
  IF _amount > COALESCE(o.paid_jod, o.total_jod, 0) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'المبلغ أكبر من قيمة الطلب');
  END IF;

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
