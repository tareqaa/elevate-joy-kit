
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

GRANT SELECT, INSERT ON public.tournament_registrations TO authenticated;
GRANT ALL ON public.tournament_registrations TO service_role;

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own registrations readable"
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "register self"
  ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tournament_registration_count(_tournament_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.tournament_registrations WHERE tournament_id = _tournament_id;
$$;

REVOKE ALL ON FUNCTION public.tournament_registration_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tournament_registration_count(uuid) TO anon, authenticated, service_role;

INSERT INTO public.site_settings (key, value)
VALUES ('arena_carousel_count', '6'::jsonb)
ON CONFLICT (key) DO NOTHING;
