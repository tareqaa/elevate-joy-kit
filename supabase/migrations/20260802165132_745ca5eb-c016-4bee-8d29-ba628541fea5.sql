-- 1) game_tournament_scores: remove blanket public read (leaderboards use SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Scores are viewable by everyone" ON public.game_tournament_scores;
REVOKE SELECT ON public.game_tournament_scores FROM anon;

-- 2) tournament_best_scores: keep public visibility of valid scores but hide user_id column
REVOKE SELECT ON public.tournament_best_scores FROM anon, authenticated;
GRANT SELECT (id, tournament_id, score, is_valid, created_at, updated_at) ON public.tournament_best_scores TO anon, authenticated;
GRANT ALL ON public.tournament_best_scores TO service_role;
GRANT ALL ON public.game_tournament_scores TO service_role;