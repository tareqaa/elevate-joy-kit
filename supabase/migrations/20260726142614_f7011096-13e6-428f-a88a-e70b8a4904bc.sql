
-- Revoke direct execute on internal/trigger/cron helpers from public API roles.
REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_delivered() FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies; authenticated users must retain EXECUTE
-- for policies to evaluate. Revoke from anon and PUBLIC only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Public profile RPCs stay callable by anon + authenticated (intentional public API).
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_public_profiles(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO anon, authenticated;
