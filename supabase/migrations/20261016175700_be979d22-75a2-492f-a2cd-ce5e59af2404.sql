ALTER FUNCTION public.get_my_loyalty() SET search_path = public, pg_temp;
ALTER FUNCTION public.link_my_past_orders() SET search_path = public, pg_temp;
ALTER FUNCTION public.link_order_email_to_profile() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_store_order(uuid,text,text,jsonb,numeric,text,jsonb,text,text,int8,numeric,numeric) SET search_path = public, pg_temp;