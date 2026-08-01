
ALTER TABLE public.game_tournaments ADD COLUMN IF NOT EXISTS max_players integer;

-- enforce capacity on score submission
CREATE OR REPLACE FUNCTION public.submit_tournament_score(_tournament_id uuid, _score integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _t public.game_tournaments;
  _best integer;
  _cnt integer;
  _exists boolean;
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
$function$;

-- admin: list scores of a tournament
CREATE OR REPLACE FUNCTION public.admin_tournament_scores(_tournament_id uuid)
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text, score integer, is_valid boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT s.user_id, p.username, p.full_name, p.avatar_url, s.score, s.is_valid, s.updated_at
  FROM public.tournament_best_scores s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.tournament_id = _tournament_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY s.score DESC, s.updated_at ASC;
$function$;

-- admin: set / invalidate a single player's score
CREATE OR REPLACE FUNCTION public.admin_set_tournament_score(_tournament_id uuid, _user_id uuid, _score integer, _is_valid boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_score');
  END IF;

  INSERT INTO public.tournament_best_scores (tournament_id, user_id, score, is_valid)
  VALUES (_tournament_id, _user_id, _score, COALESCE(_is_valid, true))
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET score = EXCLUDED.score, is_valid = EXCLUDED.is_valid, updated_at = now();

  PERFORM public.log_admin_action('tournament_score_set', 'tournament', _tournament_id::text,
    jsonb_build_object('user_id', _user_id, 'score', _score, 'is_valid', COALESCE(_is_valid, true)));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- admin: delete a single player's score
CREATE OR REPLACE FUNCTION public.admin_delete_tournament_score(_tournament_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  DELETE FROM public.tournament_best_scores WHERE tournament_id = _tournament_id AND user_id = _user_id;
  DELETE FROM public.game_tournament_scores WHERE tournament_id = _tournament_id AND user_id = _user_id;
  PERFORM public.log_admin_action('tournament_score_delete', 'tournament', _tournament_id::text,
    jsonb_build_object('user_id', _user_id));
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- admin: reset all scores of a tournament
CREATE OR REPLACE FUNCTION public.admin_reset_tournament_scores(_tournament_id uuid, _clear_registrations boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  DELETE FROM public.tournament_best_scores WHERE tournament_id = _tournament_id;
  GET DIAGNOSTICS _n = ROW_COUNT;
  DELETE FROM public.game_tournament_scores WHERE tournament_id = _tournament_id;
  IF COALESCE(_clear_registrations, false) THEN
    DELETE FROM public.tournament_registrations WHERE tournament_id = _tournament_id;
  END IF;
  PERFORM public.log_admin_action('tournament_scores_reset', 'tournament', _tournament_id::text,
    jsonb_build_object('removed', _n, 'cleared_registrations', COALESCE(_clear_registrations, false)));
  RETURN jsonb_build_object('ok', true, 'removed', _n);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_tournament_scores(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tournament_score(uuid, uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_tournament_score(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_tournament_scores(uuid, boolean) TO authenticated;
