-- ANTI-CHEAT: Physical Speed Progression Model for Flippy Bird
-- In flippy-engine.ts:
--   Base SPEED = 3 px/frame @ 60fps = 180 px/s
--   MAX_SPEED = 6 px/frame @ 60fps = 360 px/s
--   PIPE_SPACING = 250 px
--   Speed progression: speed = min(6.0, 3.0 + score * 0.005)
--   Theoretical pipe rate starts at 180/250 = 0.72 pts/s and maxes out at 360/250 = 1.44 pts/s (at score 600).
--   With generous safety margin (30% leeway + 12 grace buffer for tab/lag/clock skew):
--   Base safe rate = 0.95 pts/sec, accelerating up to maximum ceiling of 1.85 pts/sec.
--   _max_plausible := 12 + CEIL(LEAST(1.85 * _elapsed, 0.95 * _elapsed + 0.0018 * POWER(_elapsed, 1.8)));
--   _abs_cap := 400;

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
    -- Derived directly from flippy-engine.ts speed progression:
    -- Speed starts at 3.0 px/frame (180 px/s) -> 0.72 pipes/sec
    -- Increases by +0.005 per score up to 6.0 px/frame (360 px/s) -> 1.44 pipes/sec
    -- With +30% safety margin and +12 grace points for latency / initial pipes:
    -- Safe rate starts at 0.95 pts/s and accelerates to max safe cap of 1.85 pts/s.
    _max_plausible := 12 + CEIL(LEAST(1.85 * _elapsed, 0.95 * _elapsed + 0.0018 * POWER(_elapsed, 1.8)));
    _abs_cap := 400; -- Hard human ceiling for a single run
  ELSIF _t.game_slug IN ('gx-blast', 'blast') THEN
    -- Blast tile placement takes minimum 1-2s per move.
    _max_plausible := 500 + CEIL(_elapsed * 100);
    _abs_cap := 100000;
  ELSE
    _max_plausible := 1000 + CEIL(_elapsed * 200);
    _abs_cap := 500000;
  END IF;

  -- Anti-cheat tripwire: if score violates physical speed bounds or ceiling, burn run session
  IF _score > _max_plausible OR _score > _abs_cap THEN
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

  -- 8) Record best score in tournament_best_scores (column is `score`)
  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score, is_valid, updated_at)
  VALUES (_tournament_id, _uid, _score, true, now())
  ON CONFLICT (tournament_id, user_id)
  DO UPDATE SET
    score = GREATEST(tournament_best_scores.score, EXCLUDED.score),
    updated_at = CASE
      WHEN EXCLUDED.score >= tournament_best_scores.score THEN now()
      ELSE tournament_best_scores.updated_at
    END;

  -- 9) Backwards-compatible legacy table sync
  BEGIN
    INSERT INTO public.game_tournament_scores (tournament_id, user_id, score, created_at)
    VALUES (_tournament_id, _uid, _score, now());
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  SELECT score INTO _best FROM public.tournament_best_scores
   WHERE tournament_id = _tournament_id AND user_id = _uid;

  RETURN jsonb_build_object('ok', true, 'score', _score, 'best_score', COALESCE(_best, _score));
END;
$$;
