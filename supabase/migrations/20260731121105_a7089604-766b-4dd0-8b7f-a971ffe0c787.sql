
CREATE TABLE public.game_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_slug text NOT NULL,
  game_icon text NOT NULL DEFAULT '🎮',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  game_path text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  prizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_tournaments TO anon;
GRANT SELECT ON public.game_tournaments TO authenticated;
GRANT ALL ON public.game_tournaments TO service_role;
ALTER TABLE public.game_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments are viewable by everyone"
  ON public.game_tournaments FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage tournaments"
  ON public.game_tournaments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.game_tournament_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

GRANT SELECT ON public.game_tournament_scores TO anon;
GRANT SELECT, INSERT, UPDATE ON public.game_tournament_scores TO authenticated;
GRANT ALL ON public.game_tournament_scores TO service_role;
ALTER TABLE public.game_tournament_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scores are viewable by everyone"
  ON public.game_tournament_scores FOR SELECT USING (true);
CREATE POLICY "Users insert own score"
  ON public.game_tournament_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own score"
  ON public.game_tournament_scores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_game_tournaments_updated_at
  BEFORE UPDATE ON public.game_tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_game_tournament_scores_updated_at
  BEFORE UPDATE ON public.game_tournament_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    COALESCE(s.cnt, 0)::int AS participants,
    COALESCE(s.best, 0)::int AS top_score,
    now() AS server_now
  FROM public.game_tournaments t
  LEFT JOIN (
    SELECT tournament_id, count(*) AS cnt, max(score) AS best
    FROM public.game_tournament_scores GROUP BY tournament_id
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
$$;

GRANT EXECUTE ON FUNCTION public.list_tournaments() TO anon, authenticated, service_role;

INSERT INTO public.game_tournaments (game_slug, game_icon, title_ar, title_en, game_path, starts_at, ends_at, status, prizes, sort_order) VALUES
('gx-blast', '🧩', 'بطولة GX Blast الأسبوعية', 'GX Blast Weekly Cup', '/games/blast', now() - interval '2 days', now() + interval '5 days', 'active',
 '[{"place":1,"label_ar":"5,000 GX Coin + كوبون 25%","label_en":"5,000 GX Coins + 25% coupon"},{"place":2,"label_ar":"2,500 GX Coin","label_en":"2,500 GX Coins"},{"place":3,"label_ar":"1,000 GX Coin","label_en":"1,000 GX Coins"}]'::jsonb, 1),
('gx-blast', '🎯', 'تحدي نهاية الشهر', 'End of Month Challenge', '/games/blast', now() + interval '6 days', now() + interval '13 days', 'scheduled',
 '[{"place":1,"label_ar":"10,000 GX Coin","label_en":"10,000 GX Coins"},{"place":2,"label_ar":"4,000 GX Coin","label_en":"4,000 GX Coins"},{"place":3,"label_ar":"1,500 GX Coin","label_en":"1,500 GX Coins"}]'::jsonb, 2),
('gx-blast', '🏆', 'بطولة الافتتاح', 'Launch Tournament', '/games/blast', now() - interval '20 days', now() - interval '10 days', 'ended',
 '[{"place":1,"label_ar":"3,000 GX Coin","label_en":"3,000 GX Coins"},{"place":2,"label_ar":"1,500 GX Coin","label_en":"1,500 GX Coins"},{"place":3,"label_ar":"500 GX Coin","label_en":"500 GX Coins"}]'::jsonb, 3);
