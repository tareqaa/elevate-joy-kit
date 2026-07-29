
CREATE TABLE IF NOT EXISTS public.home_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  actor_id uuid,
  actor_email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.home_settings_history TO authenticated;
GRANT ALL ON public.home_settings_history TO service_role;

ALTER TABLE public.home_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view history"
ON public.home_settings_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert history"
ON public.home_settings_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND (actor_id IS NULL OR actor_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_home_history_key_time ON public.home_settings_history (key, created_at DESC);
