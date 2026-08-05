-- Part 1: Extend data model
-- Add missing fields to categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS tagline_ar TEXT,
ADD COLUMN IF NOT EXISTS tagline_en TEXT,
ADD COLUMN IF NOT EXISTS page_template TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'::jsonb;

-- Add missing fields to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS label_text_ar TEXT,
ADD COLUMN IF NOT EXISTS label_text_en TEXT,
ADD COLUMN IF NOT EXISTS label_color TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add reward log table
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount_coins INTEGER DEFAULT 0,
    amount_xp INTEGER DEFAULT 0,
    amount_credit_jod NUMERIC(12, 3) DEFAULT 0,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    source TEXT NOT NULL, -- 'coupon', 'loyalty', 'wheel', 'tournament'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.reward_logs TO authenticated;
GRANT ALL ON public.reward_logs TO service_role;
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reward logs" ON public.reward_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Unify reward logic function
CREATE OR REPLACE FUNCTION public.grant_user_reward(
    _user_id UUID,
    _coins INTEGER DEFAULT 0,
    _xp INTEGER DEFAULT 0,
    _credit_jod NUMERIC DEFAULT 0,
    _coupon_id UUID DEFAULT NULL,
    _source TEXT DEFAULT 'admin',
    _reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _profile_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) INTO _profile_exists;
    IF NOT _profile_exists THEN
        RETURN json_build_object('ok', false, 'message', 'Profile not found');
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET 
        gx_coins = gx_coins + _coins,
        xp = xp + _xp,
        store_credit_jod = COALESCE(store_credit_jod, 0) + _credit_jod
    WHERE id = _user_id;

    -- Log reward
    INSERT INTO public.reward_logs (user_id, amount_coins, amount_xp, amount_credit_jod, coupon_id, source, reason)
    VALUES (_user_id, _coins, _xp, _credit_jod, _coupon_id, _source, _reason);

    RETURN json_build_object('ok', true);
END;
$$;
