-- Restore table-level write permissions on game_tournaments to authenticated role
-- In Postgres, table-level GRANTs take precedence before RLS policies are evaluated.
-- Row-level security (RLS) policy "Admins manage tournaments" strictly restricts
-- INSERT, UPDATE, and DELETE operations to users with the 'admin' app_role:
--   USING (has_role(auth.uid(), 'admin'::app_role))
--   WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT INSERT, UPDATE, DELETE ON public.game_tournaments TO authenticated;
