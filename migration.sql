-- Fix the security policy for reward_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own reward logs') THEN
        CREATE POLICY "Users can view their own reward logs" ON public.reward_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

-- Ensure proper grants
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
