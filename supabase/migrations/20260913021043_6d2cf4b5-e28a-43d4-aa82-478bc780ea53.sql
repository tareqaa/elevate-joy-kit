-- 1) Verified-email-only guest order linking
CREATE OR REPLACE FUNCTION public.link_order_email_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _em text;
BEGIN
  IF NEW.user_id IS NULL AND NEW.delivery_data IS NOT NULL THEN
    _em := lower(trim(COALESCE(NEW.delivery_data->>'customer_email', '')));
    IF _em <> '' THEN
      -- Only link to a profile whose email matches the verified auth email
      SELECT p.id INTO NEW.user_id
        FROM public.profiles p
        JOIN auth.users u ON u.id = p.id
       WHERE lower(COALESCE(p.email,'')) = _em
         AND lower(COALESCE(u.email,'')) = _em
         AND u.email_confirmed_at IS NOT NULL
       LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_past_orders_on_profile_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _em text;
  _auth_em text;
BEGIN
  _em := lower(trim(COALESCE(NEW.email, '')));
  -- Only trust the profile email when it equals the verified auth email
  SELECT lower(COALESCE(email,'')) INTO _auth_em
    FROM auth.users
   WHERE id = NEW.id AND email_confirmed_at IS NOT NULL;
  IF _em = '' OR _auth_em IS NULL OR _em <> _auth_em THEN
    RETURN NEW;
  END IF;

  UPDATE public.orders
     SET user_id = NEW.id,
         updated_at = now()
   WHERE user_id IS NULL
     AND lower(trim(COALESCE(delivery_data->>'customer_email', ''))) = _em;
  RETURN NEW;
END;
$$;

-- 2) Block direct Data API edits of profiles.email (email changes must go through Supabase Auth)
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
      OR NEW.store_credit_jod   IS DISTINCT FROM OLD.store_credit_jod
      OR NEW.total_refunded_jod IS DISTINCT FROM OLD.total_refunded_jod )
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'غير مصرح بتعديل الأرصدة مباشرة';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Revoke direct EXECUTE on internal SECURITY DEFINER functions
-- (they remain callable by triggers, other definer functions, and service_role)
REVOKE EXECUTE ON FUNCTION public.link_order_email_to_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_past_orders_on_profile_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_user_reward(uuid, integer, integer, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_level_coupon(uuid, levels) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.level_for_xp(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_badges(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_store_order_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;