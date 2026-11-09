-- Migration: Remove 1-hour password reset cooldown & support dynamic email language
-- 1. Remove 1-hour cooldown check: always allow reset requests
CREATE OR REPLACE FUNCTION public.check_password_reset_cooldown(_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_minutes', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_password_reset_cooldown(TEXT) TO anon, authenticated, service_role;

-- 2. Update user preferred language in auth.users so Supabase GoTrue email templates can use .Data.lang
CREATE OR REPLACE FUNCTION public.set_user_preferred_language(_email TEXT, _lang TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_email TEXT := lower(trim(_email));
  v_clean_lang TEXT := CASE WHEN lower(trim(_lang)) = 'en' THEN 'en' ELSE 'ar' END;
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('lang', v_clean_lang)
  WHERE lower(email) = v_clean_email;

  INSERT INTO public.password_reset_requests (email, requested_at)
  VALUES (v_clean_email, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_preferred_language(TEXT, TEXT) TO anon, authenticated, service_role;

