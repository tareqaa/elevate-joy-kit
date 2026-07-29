REVOKE EXECUTE ON FUNCTION public.admin_adjust_loyalty(uuid, integer, bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spend_gx_coins(bigint, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_loyalty_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_loyalty_leaderboard(integer) TO anon, authenticated;