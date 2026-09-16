DROP TRIGGER IF EXISTS guard_user_avatar_unlock ON public.user_avatars;
DROP FUNCTION IF EXISTS public.guard_user_avatar_unlock();

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'لا يمكن تعديل البريد الإلكتروني من هنا';
    END IF;
    IF ( NEW.gx_coins           IS DISTINCT FROM OLD.gx_coins
      OR NEW.xp                 IS DISTINCT FROM OLD.xp
      OR NEW.level              IS DISTINCT FROM OLD.level
      OR NEW.level_code         IS DISTINCT FROM OLD.level_code
      OR NEW.total_spent        IS DISTINCT FROM OLD.total_spent
      OR NEW.orders_count       IS DISTINCT FROM OLD.orders_count
      OR NEW.store_credit_jod   IS DISTINCT FROM OLD.store_credit_jod
      OR NEW.total_refunded_jod IS DISTINCT FROM OLD.total_refunded_jod )
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'غير مصرح بتعديل الأرصدة مباشرة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;