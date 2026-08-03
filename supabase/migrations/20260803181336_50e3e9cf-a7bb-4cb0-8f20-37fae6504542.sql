-- Stop exposing raw user_id of tournament scores to anonymous/public readers.
-- Public leaderboards are served exclusively by the security-definer RPC
-- public.tournament_leaderboard(), which returns only display fields.
DROP POLICY IF EXISTS "Valid scores are public" ON public.tournament_best_scores;

REVOKE ALL ON public.tournament_best_scores FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_best_scores TO authenticated;
GRANT ALL ON public.tournament_best_scores TO service_role;