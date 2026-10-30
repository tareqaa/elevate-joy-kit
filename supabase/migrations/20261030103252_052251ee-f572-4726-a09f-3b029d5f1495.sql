-- Pin lookup path on internal SECURITY DEFINER functions
ALTER FUNCTION public.apply_loyalty_on_order_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_refund_order(uuid, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_store_order(uuid, text, text, jsonb, numeric, text, jsonb, text, text, bigint, numeric, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_my_level_coupon(text, numeric, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_coupon(text, numeric, uuid, text[], text[], jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.link_past_orders_for_user(uuid) SET search_path = public, pg_temp;

-- Profiles: signed-in users may only edit their own display fields, never balances
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, whatsapp, username, avatar_id, avatar_border, updated_at) ON public.profiles TO authenticated;