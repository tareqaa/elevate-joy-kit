
CREATE TABLE public.tournament_best_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

GRANT SELECT ON public.tournament_best_scores TO anon;
GRANT SELECT ON public.tournament_best_scores TO authenticated;
GRANT ALL ON public.tournament_best_scores TO service_role;

ALTER TABLE public.tournament_best_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Valid scores are public" ON public.tournament_best_scores
  FOR SELECT USING (is_valid = true);

CREATE POLICY "Users can see own scores" ON public.tournament_best_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage scores" ON public.tournament_best_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tbs_updated_at BEFORE UPDATE ON public.tournament_best_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tbs_tournament_score ON public.tournament_best_scores (tournament_id, score DESC);

CREATE OR REPLACE FUNCTION public.submit_tournament_score(_tournament_id uuid, _score integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.game_tournaments;
  _best integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_score');
  END IF;
  SELECT * INTO _t FROM public.game_tournaments WHERE id = _tournament_id AND is_active = true;
  IF _t.id IS NULL OR now() < _t.starts_at OR now() > _t.ends_at OR _t.status IN ('ended','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tournament_closed');
  END IF;

  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score)
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET score = GREATEST(public.tournament_best_scores.score, EXCLUDED.score)
  RETURNING score INTO _best;

  INSERT INTO public.game_tournament_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score);

  RETURN jsonb_build_object('ok', true, 'best', _best);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.tournament_leaderboard(_tournament_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(rank bigint, user_id uuid, username text, full_name text, avatar_url text, score integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC) AS rank,
         s.user_id, p.username, p.full_name, p.avatar_url, s.score
  FROM public.tournament_best_scores s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.tournament_id = _tournament_id AND s.is_valid = true
  ORDER BY s.score DESC, s.updated_at ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.tournament_leaderboard(uuid, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_tournament_standing(_tournament_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN jsonb_build_object('played', false)
    ELSE COALESCE((
      SELECT jsonb_build_object('played', true, 'rank', r.rank, 'score', r.score,
                                'username', r.username, 'full_name', r.full_name, 'avatar_url', r.avatar_url)
      FROM (
        SELECT row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC) AS rank,
               s.user_id, s.score, p.username, p.full_name, p.avatar_url
        FROM public.tournament_best_scores s
        LEFT JOIN public.profiles p ON p.id = s.user_id
        WHERE s.tournament_id = _tournament_id AND s.is_valid = true
      ) r WHERE r.user_id = auth.uid()
    ), jsonb_build_object('played', false)) END;
$$;

GRANT EXECUTE ON FUNCTION public.my_tournament_standing(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_tournaments()
 RETURNS TABLE(id uuid, game_slug text, game_icon text, title_ar text, title_en text, game_path text, starts_at timestamp with time zone, ends_at timestamp with time zone, prizes jsonb, live_status text, participants integer, top_score integer, server_now timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    t.id, t.game_slug, t.game_icon, t.title_ar, t.title_en, t.game_path,
    t.starts_at, t.ends_at, t.prizes,
    CASE
      WHEN t.status IN ('cancelled','ended') THEN 'ended'
      WHEN now() < t.starts_at THEN 'upcoming'
      WHEN now() > t.ends_at THEN 'ended'
      ELSE 'live'
    END AS live_status,
    COALESCE(s.cnt, 0)::int AS participants,
    COALESCE(s.best, 0)::int AS top_score,
    now() AS server_now
  FROM public.game_tournaments t
  LEFT JOIN (
    SELECT tournament_id, count(*) AS cnt, max(score) AS best
    FROM public.tournament_best_scores WHERE is_valid = true GROUP BY tournament_id
  ) s ON s.tournament_id = t.id
  WHERE t.is_active = true
  ORDER BY
    CASE
      WHEN t.status IN ('cancelled','ended') THEN 3
      WHEN now() BETWEEN t.starts_at AND t.ends_at THEN 1
      WHEN now() < t.starts_at THEN 2
      ELSE 3
    END,
    t.sort_order, t.starts_at;
$function$;

DELETE FROM public.game_tournaments WHERE title_ar IN ('تحدي نهاية الشهر','بطولة الافتتاح');

UPDATE public.game_tournaments
SET title_ar = 'بطولة GX Blast الأسبوعية',
    title_en = 'GX Blast Weekly Tournament',
    game_icon = '🧱',
    status = 'active',
    starts_at = date_trunc('week', now()),
    ends_at = date_trunc('week', now()) + interval '7 days',
    prizes = '[{"place":1,"label_ar":"جائزة الأسبوع: 5,000 GX Coin + كوبون 25%","label_en":"Weekly prize: 5,000 GX Coins + 25% coupon"},{"place":2,"label_ar":"2,500 GX Coin","label_en":"2,500 GX Coins"},{"place":3,"label_ar":"1,000 GX Coin","label_en":"1,000 GX Coins"}]'::jsonb
WHERE game_slug = 'gx-blast';
