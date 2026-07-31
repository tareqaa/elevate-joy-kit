DROP FUNCTION IF EXISTS public.tournament_leaderboard(uuid, integer);
CREATE OR REPLACE FUNCTION public.tournament_leaderboard(_tournament_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(rank bigint, user_id uuid, username text, full_name text, avatar_url text, score integer, level_code text, level_name_ar text, level_name_en text, level_color text, level_icon text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC) AS rank,
         s.user_id, p.username, p.full_name, p.avatar_url, s.score,
         p.level_code, l.name_ar, l.name_en, l.color, l.icon
  FROM public.tournament_best_scores s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.levels l ON l.code = p.level_code
  WHERE s.tournament_id = _tournament_id AND s.is_valid = true
  ORDER BY s.score DESC, s.updated_at ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
$$;
GRANT EXECUTE ON FUNCTION public.tournament_leaderboard(uuid, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_tournament_standing(_tournament_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN jsonb_build_object('played', false)
    ELSE COALESCE((
      SELECT jsonb_build_object('played', true, 'rank', r.rank, 'score', r.score,
                                'username', r.username, 'full_name', r.full_name,
                                'avatar_url', r.avatar_url, 'level_code', r.level_code,
                                'total', (SELECT count(*) FROM public.tournament_best_scores s2
                                          WHERE s2.tournament_id = _tournament_id AND s2.is_valid = true))
      FROM (
        SELECT row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC) AS rank,
               s.user_id, s.score, p.username, p.full_name, p.avatar_url, p.level_code
        FROM public.tournament_best_scores s
        LEFT JOIN public.profiles p ON p.id = s.user_id
        WHERE s.tournament_id = _tournament_id AND s.is_valid = true
      ) r WHERE r.user_id = auth.uid()
    ), jsonb_build_object('played', false)) END;
$$;