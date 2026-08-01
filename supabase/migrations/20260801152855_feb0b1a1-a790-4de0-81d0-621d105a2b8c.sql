-- =========================================================
-- 1) Tournament winners archive
-- =========================================================
CREATE TABLE public.tournament_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  score integer NOT NULL DEFAULT 0,
  prize jsonb NOT NULL DEFAULT '{}'::jsonb,
  awarded boolean NOT NULL DEFAULT false,
  awarded_at timestamptz,
  awarded_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_winners TO authenticated;
GRANT ALL ON public.tournament_winners TO service_role;

ALTER TABLE public.tournament_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tournament winners"
  ON public.tournament_winners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own wins"
  ON public.tournament_winners FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_tournament_winners_updated_at
  BEFORE UPDATE ON public.tournament_winners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Snapshot the current leaderboard into the winners archive.
CREATE OR REPLACE FUNCTION public.admin_finalize_tournament(_tournament_id uuid, _top integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prizes jsonb;
  _saved integer := 0;
  r record;
  _prize jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT prizes INTO _prizes FROM public.game_tournaments WHERE id = _tournament_id;

  FOR r IN
    SELECT row_number() OVER (ORDER BY s.score DESC, s.updated_at ASC) AS rnk,
           s.user_id, s.score
    FROM public.tournament_best_scores s
    WHERE s.tournament_id = _tournament_id AND s.is_valid
    ORDER BY s.score DESC, s.updated_at ASC
    LIMIT GREATEST(COALESCE(_top, 10), 1)
  LOOP
    _prize := '{}'::jsonb;
    IF _prizes IS NOT NULL AND jsonb_typeof(_prizes) = 'array' THEN
      SELECT p INTO _prize
      FROM jsonb_array_elements(_prizes) AS p
      WHERE COALESCE((p->>'place')::int, 0) <= r.rnk
        AND COALESCE(NULLIF(p->>'place_to','')::int, COALESCE((p->>'place')::int, 0)) >= r.rnk
      LIMIT 1;
      _prize := COALESCE(_prize, '{}'::jsonb);
    END IF;

    INSERT INTO public.tournament_winners (tournament_id, user_id, rank, score, prize)
    VALUES (_tournament_id, r.user_id, r.rnk, r.score, _prize)
    ON CONFLICT (tournament_id, user_id) DO UPDATE
      SET rank = EXCLUDED.rank,
          score = EXCLUDED.score,
          prize = CASE WHEN public.tournament_winners.awarded THEN public.tournament_winners.prize ELSE EXCLUDED.prize END,
          updated_at = now();
    _saved := _saved + 1;
  END LOOP;

  PERFORM public.log_admin_action('tournament.finalize', 'game_tournaments', _tournament_id::text,
    jsonb_build_object('winners', _saved));

  RETURN jsonb_build_object('ok', true, 'saved', _saved);
END;
$$;

-- Winners list joined with profile info (admin only).
CREATE OR REPLACE FUNCTION public.admin_tournament_winners(_tournament_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, username text, full_name text, avatar_url text,
  rank integer, score integer, prize jsonb, awarded boolean,
  awarded_at timestamptz, note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.user_id, p.username, p.full_name, p.avatar_url,
         w.rank, w.score, w.prize, w.awarded, w.awarded_at, w.note
  FROM public.tournament_winners w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  WHERE w.tournament_id = _tournament_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY w.rank ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_winner_awarded(_winner_id uuid, _awarded boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.tournament_winners
  SET awarded = _awarded,
      awarded_at = CASE WHEN _awarded THEN now() ELSE NULL END,
      awarded_by = CASE WHEN _awarded THEN auth.uid() ELSE NULL END,
      note = COALESCE(_note, note),
      updated_at = now()
  WHERE id = _winner_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- =========================================================
-- 2) Order security: client fingerprint + IP blocking
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS client_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_client_ip ON public.orders (client_ip);

CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid,
  blocked_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked ips"
  ON public.blocked_ips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public check used by the checkout server function.
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.blocked_ips WHERE ip = _ip);
$$;

GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO anon, authenticated;

-- Attach client fingerprint to a freshly created order (write-once).
CREATE OR REPLACE FUNCTION public.record_order_client_meta(
  _order_id uuid, _ip text, _ua text, _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders
  SET client_ip = COALESCE(client_ip, NULLIF(_ip, '')),
      user_agent = COALESCE(user_agent, NULLIF(_ua, '')),
      client_meta = CASE WHEN client_meta = '{}'::jsonb THEN COALESCE(_meta, '{}'::jsonb) ELSE client_meta END
  WHERE id = _order_id
    AND created_at > now() - interval '10 minutes';
$$;

GRANT EXECUTE ON FUNCTION public.record_order_client_meta(uuid, text, text, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_block_ip(_ip text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF _ip IS NULL OR btrim(_ip) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_ip');
  END IF;

  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.blocked_ips (ip, reason, blocked_by, blocked_by_email)
  VALUES (btrim(_ip), _reason, auth.uid(), _email)
  ON CONFLICT (ip) DO UPDATE SET reason = COALESCE(EXCLUDED.reason, public.blocked_ips.reason);

  PERFORM public.log_admin_action('security.ip_block', 'blocked_ips', btrim(_ip), jsonb_build_object('reason', _reason));
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unblock_ip(_ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  DELETE FROM public.blocked_ips WHERE ip = btrim(_ip);
  PERFORM public.log_admin_action('security.ip_unblock', 'blocked_ips', btrim(_ip), '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;