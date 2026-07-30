DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_privileged_columns();

-- SECURITY INVOKER on purpose: inside a SECURITY DEFINER function current_user
-- would always be the owner, so the guard could never see the real caller.
CREATE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.gx_coins           IS DISTINCT FROM OLD.gx_coins
  OR NEW.xp                 IS DISTINCT FROM OLD.xp
  OR NEW.level              IS DISTINCT FROM OLD.level
  OR NEW.level_code         IS DISTINCT FROM OLD.level_code
  OR NEW.total_spent        IS DISTINCT FROM OLD.total_spent
  OR NEW.store_credit_jod   IS DISTINCT FROM OLD.store_credit_jod
  OR NEW.total_refunded_jod IS DISTINCT FROM OLD.total_refunded_jod
  THEN
    -- current_user is 'authenticated'/'anon' only for direct Data API writes.
    -- Trusted SECURITY DEFINER functions run as their owner; the server uses service_role.
    IF current_user IN ('authenticated', 'anon')
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'غير مصرح بتعديل الأرصدة مباشرة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guard_profile_privileged_columns() TO authenticated, anon, service_role;

CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();