-- 1) Extend profile guard: orders_count + avatar equip must be owned
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _av record;
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

    -- Avatar equip: must be an avatar the user actually unlocked
    IF NEW.avatar_id IS NOT NULL
       AND ( NEW.avatar_id IS DISTINCT FROM OLD.avatar_id
             OR NEW.avatar_border IS DISTINCT FROM OLD.avatar_border )
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.user_avatars ua
        WHERE ua.user_id = NEW.id AND ua.avatar_id = NEW.avatar_id
      ) THEN
        RAISE EXCEPTION 'لم تفتح هذه الصورة بعد';
      END IF;
      SELECT a.image_url AS image_url, c.border_css AS border_css
        INTO _av
      FROM public.avatars a
      JOIN public.avatar_collections c ON c.id = a.collection_id
      WHERE a.id = NEW.avatar_id;
      IF _av IS NULL THEN
        RAISE EXCEPTION 'صورة غير صالحة';
      END IF;
      NEW.avatar_url := _av.image_url;
      NEW.avatar_border := _av.border_css;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Unlocking an avatar requires meeting the collection level
CREATE OR REPLACE FUNCTION public.guard_user_avatar_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _needed int;
  _have int;
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'غير مصرح';
    END IF;

    SELECT l.sort_order INTO _needed
    FROM public.avatars a
    JOIN public.avatar_collections c ON c.id = a.collection_id
    JOIN public.levels l ON l.code = c.required_level_code
    WHERE a.id = NEW.avatar_id;

    SELECT l.sort_order INTO _have
    FROM public.profiles p
    JOIN public.levels l ON l.code = p.level_code
    WHERE p.id = NEW.user_id;

    IF _needed IS NOT NULL AND COALESCE(_have, -1) < _needed THEN
      RAISE EXCEPTION 'مستوى الولاء غير كافٍ لفتح هذه الصورة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_user_avatar_unlock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_user_avatar_unlock ON public.user_avatars;
CREATE TRIGGER guard_user_avatar_unlock
BEFORE INSERT ON public.user_avatars
FOR EACH ROW EXECUTE FUNCTION public.guard_user_avatar_unlock();