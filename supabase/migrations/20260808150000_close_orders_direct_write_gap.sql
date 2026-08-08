-- SECURITY: public.orders is meant to be written only through the
-- SECURITY DEFINER create_store_order() RPC, which recomputes the price
-- server-side from product_variants/site_settings and needs no caller-level
-- grant at all (it runs as the function owner, bypassing RLS). The
-- "Guests can create orders" / "Users can create own orders" policies below
-- predate that RPC and still let anon/authenticated INSERT an order row
-- directly with an arbitrary total_jod, paid_jod, and status (including
-- 'paid') — completely bypassing create_store_order's price recomputation,
-- coupon/coin validation, and payment logic. guard_order_insert (the only
-- BEFORE INSERT trigger on this table) validates name/contact/items/rate
-- limits but never checks price or status columns, so it does not close
-- this hole. Same pattern already used to fix the equivalent gap on
-- game_tournament_scores.
--
-- Confirmed no legitimate code path depends on a direct client insert into
-- orders — checkout always goes through create_store_order.
DROP POLICY IF EXISTS "Guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

REVOKE INSERT ON public.orders FROM anon, authenticated;
