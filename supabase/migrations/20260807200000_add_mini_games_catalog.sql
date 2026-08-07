-- Admin-manageable catalog of standalone "mini games" (casual practice mode,
-- fully separate from the tournament system). Replaces the previous
-- hardcoded src/lib/gx/mini-games.ts list so admins can add/remove/enable
-- entries without a code deploy.
CREATE TABLE public.mini_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  game_slug text NOT NULL,        -- which engine this launches: 'gx-blast' | 'gx-flippy'
  path text NOT NULL,             -- e.g. '/games/blast' (?practice=1 is appended at render time)
  icon text NOT NULL DEFAULT '🎮',
  name_ar text NOT NULL,
  name_en text NOT NULL,
  desc_ar text NOT NULL DEFAULT '',
  desc_en text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mini_games TO anon, authenticated;
GRANT ALL ON public.mini_games TO service_role;
ALTER TABLE public.mini_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active mini games" ON public.mini_games
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage mini games" ON public.mini_games
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mini_games_updated BEFORE UPDATE ON public.mini_games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed with today's two games so the section isn't empty on deploy.
INSERT INTO public.mini_games (slug, game_slug, path, icon, name_ar, name_en, desc_ar, desc_en, sort_order) VALUES
('gx-blast', 'gx-blast', '/games/blast', '🧩', 'GX Blast', 'GX Blast', 'لوح 8×8 — ضع القطع، امسح الصفوف والأعمدة', 'An 8×8 board — drop blocks, clear full rows and columns', 1),
('gx-flippy', 'gx-flippy', '/games/flippy', '🦅', 'GX Flippy Bird', 'GX Flippy Bird', 'حلّق، تفادى العوائق، واكتشف عوالم جديدة!', 'Fly, dodge obstacles, and discover new worlds!', 2);
