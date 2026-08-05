-- Part 2: Refine security
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.reward_logs TO authenticated;
GRANT ALL ON public.reward_logs TO service_role;