CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed boolean;
BEGIN
  changed :=
       NEW.gx_coins           IS DISTINCT FROM OLD.gx_coins
    OR NEW.xp                 IS DISTINCT FROM OLD.xp
    OR NEW.level              IS DISTINCT FROM OLD.level
    OR NEW.level_code         IS DISTINCT FROM OLD.level_code
    OR NEW.total_spent        IS DISTINCT FROM OLD.total_spent
    OR NEW.store_credit_jod   IS DISTINCT FROM OLD.store_credit_jod
    OR NEW.total_refunded_jod IS DISTINCT FROM OLD.total_refunded_jod;

  IF NOT changed THEN
    RETURN NEW;
  END IF;

  -- current_user is 'authenticated' / 'anon' only for direct Data API writes.
  -- Inside SECURITY DEFINER functions it is the function owner (postgres),
  -- and server-side writes use service_role -> both allowed.
  IF current_user IN ('authenticated', 'anon') THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'غير مصرح بتعديل الأرصدة مباشرة';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

REVOKE EXECUTE ON FUNCTION public.guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;