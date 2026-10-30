DROP FUNCTION IF EXISTS public.submit_tournament_score(uuid, integer, uuid);

CREATE FUNCTION public.submit_tournament_score(
  _tournament_id uuid,
  _score integer,
  _run_id uuid,
  _user_id uuid,
  _sim_frames integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  _uid uuid := _user_id;
  _t public.game_tournaments;
  _best integer;
  _cnt integer;
  _exists boolean;
  _run public.tournament_runs%ROWTYPE;
  _elapsed numeric;
  _max_plausible numeric;
  _abs_cap integer;
BEGIN
  -- Only the store server (service role) can call this, after it has replayed
  -- and verified the run. The player id comes from the server's verified session.
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

  IF _run_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'run_required');
  END IF;

  SELECT * INTO _run FROM public.tournament_runs WHERE id = _run_id FOR UPDATE;
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

  -- A replayed run can't have simulated more game time than really passed.
  IF _sim_frames IS NOT NULL AND (_sim_frames < 0 OR (_sim_frames / 60.0) > _elapsed + 15) THEN
    UPDATE public.tournament_runs SET submitted_at = now(), score = NULL WHERE id = _run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'implausible_score');
  END IF;

  IF _t.game_slug IN ('gx-flippy', 'flippy') THEN
    _max_plausible := 12 + CEIL(LEAST(1.85 * _elapsed, 0.95 * _elapsed + 0.0018 * POWER(_elapsed, 1.8)));
    _abs_cap := 400;
  ELSIF _t.game_slug IN ('gx-blast', 'blast') THEN
    _max_plausible := 500 + CEIL(_elapsed * 100);
    _abs_cap := 100000;
  ELSE
    _max_plausible := 1000 + CEIL(_elapsed * 200);
    _abs_cap := 500000;
  END IF;

  IF _score > _max_plausible OR _score > _abs_cap THEN
    UPDATE public.tournament_runs SET submitted_at = now(), score = NULL WHERE id = _run.id;
    RETURN jsonb_build_object('ok', false, 'error', 'implausible_score');
  END IF;

  UPDATE public.tournament_runs SET submitted_at = now(), score = _score WHERE id = _run.id;

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

  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score, is_valid, updated_at)
  VALUES (_tournament_id, _uid, _score, true, now())
  ON CONFLICT (tournament_id, user_id)
  DO UPDATE SET
    score = GREATEST(tournament_best_scores.score, EXCLUDED.score),
    updated_at = CASE
      WHEN EXCLUDED.score >= tournament_best_scores.score THEN now()
      ELSE tournament_best_scores.updated_at
    END;

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
$function$;

REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid, uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.submit_tournament_score(uuid, integer, uuid, uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_tournament_score(uuid, integer, uuid, uuid, integer) TO service_role;