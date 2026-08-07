-- SECURITY: game_tournament_scores is meant to be an append-only log written
-- only by the SECURITY DEFINER submit_tournament_score() RPC, which needs no
-- caller-level grant at all (it runs as the function owner, bypassing RLS).
-- The "Users insert own score" / "Users update own score" policies below
-- predate that RPC and still let any authenticated user write an arbitrary,
-- unbounded score directly into the table for their own user_id — completely
-- bypassing every plausibility / run / tournament-window check the RPC
-- enforces. tournament_best_scores (the table that actually drives rankings
-- and prize payout) was already locked down the same way; this closes the
-- matching gap on its raw-log counterpart.
DROP POLICY IF EXISTS "Users insert own score" ON public.game_tournament_scores;
DROP POLICY IF EXISTS "Users update own score" ON public.game_tournament_scores;

REVOKE INSERT, UPDATE ON public.game_tournament_scores FROM authenticated;
