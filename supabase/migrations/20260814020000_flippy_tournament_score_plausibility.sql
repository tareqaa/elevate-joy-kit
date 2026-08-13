-- ANTI-CHEAT: Game-specific score plausibility in submit_tournament_score()
--
-- In Flippy Bird physics:
--   - Initial speed = 3 px/frame (@ 60fps = 180 px/s)
--   - Maximum speed = 6 px/frame (@ 60fps = 360 px/s)
--   - Minimum pipe spacing = 250 px
--   - Maximum possible human scoring rate = 360 / 250 = 1.44 points/sec
--
-- Setting the Flippy Bird rate to (10 + _elapsed * 2.0) provides a 38% safety
-- margin above the theoretical maximum (preventing false rejections from delta
-- time fluctuations, high refresh rate displays, or latency spikes), while
-- decisively blocking forged high scores submitted by tampered clients or
-- direct RPC invocations.
--
-- When an implausible score is rejected, submitted_at is set to now() to permanently
-- consume the run session without recording the forged score in tournament_runs.score.
--
-- GX Blast and all other games retain their original (2000 + _elapsed * 600) rule.

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

  -- SECURITY: a score is only accepted for a server-issued, unconsumed play
  -- session, and only if it is plausible for the time actually played.
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

  _elapsed := EXTRACT(EPOCH FROM (now() - _run.started_at));
  IF _elapsed < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_too_short');
  END IF;
  IF _elapsed > 10800 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_expired');
  END IF;

  -- Game-specific score plausibility bounds
  IF _t.game_slug IN ('gx-flippy', 'flippy') THEN
    _max_plausible := 10 + _elapsed * 2.0;
  ELSE
    _max_plausible := 2000 + _elapsed * 600;
  END IF;

  IF _score > _max_plausible THEN
    UPDATE public.tournament_runs
       SET submitted_at = now() WHERE id = _run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'implausible_score');
  END IF;

  UPDATE public.tournament_runs
     SET submitted_at = now(), score = _score WHERE id = _run.id;

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

REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer, uuid) TO authenticated, service_role;
