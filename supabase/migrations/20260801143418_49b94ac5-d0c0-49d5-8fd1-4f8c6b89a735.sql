-- Force the buyer identity to the authenticated caller (or guest when anonymous),
-- so the function can safely be exposed to anon/authenticated roles.
CREATE OR REPLACE FUNCTION public.guard_store_order_user(_claimed uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE NULL END;
$$;

GRANT EXECUTE ON FUNCTION public.guard_store_order_user(uuid) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, text, bigint, numeric, numeric) TO anon, authenticated;