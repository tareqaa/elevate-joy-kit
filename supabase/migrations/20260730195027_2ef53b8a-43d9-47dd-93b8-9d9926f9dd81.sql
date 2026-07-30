GRANT SELECT ON public.wheel_prizes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wheel_prizes TO authenticated;
GRANT ALL ON public.wheel_prizes TO service_role;
GRANT SELECT ON public.wheel_spins TO authenticated;
GRANT ALL ON public.wheel_spins TO service_role;