REVOKE EXECUTE ON FUNCTION public.validate_my_level_coupon(TEXT, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_loyalty() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_my_level_coupon(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_loyalty() TO authenticated;