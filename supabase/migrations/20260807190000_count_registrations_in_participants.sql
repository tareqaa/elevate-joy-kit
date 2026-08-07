-- list_tournaments() computed "participants" purely from tournament_best_scores
-- (people who'd already submitted a score), so registering never moved the
-- number a player sees. Count the union of registered users and scorers
-- instead, so registering counts immediately without changing anything else
-- about the function (same columns, same live_status/top_score logic).
CREATE OR REPLACE FUNCTION public.list_tournaments()
RETURNS TABLE (
  id uuid,
  game_slug text,
  game_icon text,
  title_ar text,
  title_en text,
  game_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  prizes jsonb,
  live_status text,
  participants integer,
  top_score integer,
  server_now timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.game_slug, t.game_icon, t.title_ar, t.title_en, t.game_path,
    t.starts_at, t.ends_at, t.prizes,
    CASE
      WHEN t.status IN ('cancelled','ended') THEN 'ended'
      WHEN now() < t.starts_at THEN 'upcoming'
      WHEN now() > t.ends_at THEN 'ended'
      ELSE 'live'
    END AS live_status,
    COALESCE(p.cnt, 0)::int AS participants,
    COALESCE(s.best, 0)::int AS top_score,
    now() AS server_now
  FROM public.game_tournaments t
  LEFT JOIN (
    SELECT tournament_id, max(score) AS best
    FROM public.tournament_best_scores WHERE is_valid = true GROUP BY tournament_id
  ) s ON s.tournament_id = t.id
  LEFT JOIN (
    SELECT tournament_id, count(*) AS cnt FROM (
      SELECT tournament_id, user_id FROM public.tournament_registrations
      UNION
      SELECT tournament_id, user_id FROM public.tournament_best_scores WHERE is_valid = true
    ) u GROUP BY tournament_id
  ) p ON p.tournament_id = t.id
  WHERE t.is_active = true
  ORDER BY
    CASE
      WHEN t.status IN ('cancelled','ended') THEN 3
      WHEN now() BETWEEN t.starts_at AND t.ends_at THEN 1
      WHEN now() < t.starts_at THEN 2
      ELSE 3
    END,
    t.sort_order, t.starts_at;
$$;

GRANT EXECUTE ON FUNCTION public.list_tournaments() TO anon, authenticated, service_role;
