
-- Set stable search_path on the helper functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;

-- Lock down execute rights on SECURITY DEFINER helpers so only the intended roles can call them
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated, service_role;

-- has_role is intentionally callable by authenticated users (RLS policies use it),
-- but not by anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
