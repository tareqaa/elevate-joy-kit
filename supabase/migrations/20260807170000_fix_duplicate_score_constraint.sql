-- Drop the unique constraint on game_tournament_scores so users can submit multiple scores
-- The tournament_best_scores table correctly tracks the highest score with its own unique constraint
ALTER TABLE public.game_tournament_scores DROP CONSTRAINT IF EXISTS game_tournament_scores_tournament_id_user_id_key;
