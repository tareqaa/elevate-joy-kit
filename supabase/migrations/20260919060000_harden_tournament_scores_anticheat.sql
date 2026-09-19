-- ANTI-CHEAT HARDENING: Strict score plausibility, human ceilings, and privilege isolation
-- 1. Enforce physical rate limits per game (Flippy Bird: max 1.7 pts/s + cap 300, Blast: 100 pts/s)
-- 2. Burn run session immediately upon implausible score detection to prevent retry bruteforcing
-- 3. Revoke all direct client INSERT/UPDATE/DELETE privileges on scores and runs tables

CREATE OR REPLACE FUNCTION public.submit_tournament_score(
  _tournament_id uuid, _score integer, _run_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.game_tournaments;
  _best integer;
  _cnt integer;
  _exists boolean;
  _run public.tournament_runs%ROWTYPE;
  _elapsed numeric;
  _max_plausible numeric;
  _abs_cap integer;
BEGIN
  -- 1) Authentication check
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  -- 2) Basic bounds
  IF _score IS NULL OR _score < 0 OR _score > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_score');
  END IF;

  -- 3) Tournament active window check
  SELECT * INTO _t FROM public.game_tournaments WHERE id = _tournament_id AND is_active = true;
  IF _t.id IS NULL OR now() < _t.starts_at OR now() > _t.ends_at OR _t.status IN ('ended','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tournament_closed');
  END IF;

  -- 4) Server-issued run token check
  IF _run_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_required');
  END IF;

  SELECT * INTO _run FROM public.tournament_runs
   WHERE id = _run_id FOR UPDATE;
  IF _run.id IS NULL OR _run.user_id <> _uid OR _run.tournament_id <> _tournament_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_run');
  END IF;
  IF _run.submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_already_submitted');
  END IF;

  -- 5) Time elapsed validation
  _elapsed := EXTRACT(EPOCH FROM (now() - _run.started_at));
  IF _elapsed < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_too_short');
  END IF;
  IF _elapsed > 10800 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_expired');
  END IF;

  -- 6) Game-specific physical plausibility & hard ceilings
  IF _t.game_slug IN ('gx-flippy', 'flippy') THEN
    -- In Flippy Bird physics:
    -- Max speed: 360 px/s. Min pipe gap: 250 px. Max human rate = 1.44 pts/s.
    -- We allow 1.7 pts/s + 6 grace points.
    _max_plausible := 6 + CEIL(_elapsed * 1.7);
    _abs_cap := 300; -- Absolute human limit for a single run
  ELSIF _t.game_slug IN ('gx-blast', 'blast') THEN
    -- Blast tile placement takes minimum 1-2s per move.
    _max_plausible := 500 + CEIL(_elapsed * 100);
    _abs_cap := 100000;
  ELSE
    _max_plausible := 1000 + CEIL(_elapsed * 200);
    _abs_cap := 500000;
  END IF;

  -- Anti-cheat tripwire
  IF _score > _max_plausible OR _score > _abs_cap THEN
    -- Burn the session without saving the cheated score
    UPDATE public.tournament_runs
       SET submitted_at = now(), score = NULL
     WHERE id = _run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'implausible_score');
  END IF;

  -- Valid score: mark run as submitted
  UPDATE public.tournament_runs
     SET submitted_at = now(), score = _score
   WHERE id = _run.id;

  -- 7) Player capacity check if tournament has max_players
  IF _t.max_players IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.tournament_best_scores
                  WHERE tournament_id = _tournament_id AND user_id = _uid) INTO _exists;
    IF NOT _exists THEN
      SELECT count(*) INTO _cnt FROM public.tournament_best_scores WHERE tournament_id = _tournament_id;
      IF _cnt >= _t.max_players THEN
        RETURN jsonb_build_object('ok', false, 'error', 'tournament_full');
      END IF;
    END IF;
  END IF;

  -- 8) Record best score (only increases, never decreases)
  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score)
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET score = GREATEST(public.tournament_best_scores.score, EXCLUDED.score)
  RETURNING score INTO _best;

  -- 9) Audit log in raw scores table
  INSERT INTO public.game_tournament_scores (tournament_id, user_id, score)
  VALUES (_tournament_id, _uid, _score);

  RETURN jsonb_build_object('ok', true, 'best', _best);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON public.tournament_best_scores FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tournament_best_scores FROM authenticated;

REVOKE ALL ON public.tournament_runs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tournament_runs FROM authenticated;

REVOKE ALL ON public.game_tournament_scores FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.game_tournament_scores FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.game_tournaments FROM anon, authenticated;
