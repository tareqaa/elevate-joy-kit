-- Remove implicit PUBLIC execute grants on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.list_tournaments() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_tournament_standing(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tournament_leaderboard(uuid, integer) FROM PUBLIC;

-- Public reads stay available to visitors
GRANT EXECUTE ON FUNCTION public.list_tournaments() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tournament_leaderboard(uuid, integer) TO anon, authenticated;

-- Personal / write operations require a signed-in user
REVOKE EXECUTE ON FUNCTION public.my_tournament_standing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_tournament_standing(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer) TO authenticated;