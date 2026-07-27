
-- Revoke default PUBLIC EXECUTE on all SECURITY DEFINER functions, then re-grant only where needed.

-- Trigger functions: only system needs to run
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_delivered() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Cron/admin job: only service_role
REVOKE ALL ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_stale_orders() TO service_role;

-- has_role is used by RLS policies executed by signed-in users; keep authenticated access only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- generate_order_number is used as a column DEFAULT for orders inserts (guest + user)
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated, service_role;

-- Public profile lookups intentionally exposed to visitors
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_public_profiles(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO anon, authenticated, service_role;
