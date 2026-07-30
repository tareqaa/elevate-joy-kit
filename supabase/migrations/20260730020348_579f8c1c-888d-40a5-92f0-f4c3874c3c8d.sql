-- auth user -> profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['levels','level_rewards','user_coupons','avatar_collections','avatars','badges','coupons','reviews','site_settings','categories','products','product_variants','product_country_prices','profiles','orders']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- orders lifecycle
DROP TRIGGER IF EXISTS orders_loyalty ON public.orders;
CREATE TRIGGER orders_loyalty BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_on_order_status();

DROP TRIGGER IF EXISTS trg_notify_order_delivered ON public.orders;
CREATE TRIGGER trg_notify_order_delivered AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_delivered();

DROP TRIGGER IF EXISTS trg_increment_purchases ON public.orders;
CREATE TRIGGER trg_increment_purchases AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.increment_purchases_on_delivered();

DROP TRIGGER IF EXISTS trg_log_order_status ON public.orders;
CREATE TRIGGER trg_log_order_status AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- role audit
DROP TRIGGER IF EXISTS trg_log_role_insert ON public.user_roles;
CREATE TRIGGER trg_log_role_insert AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
DROP TRIGGER IF EXISTS trg_log_role_delete ON public.user_roles;
CREATE TRIGGER trg_log_role_delete AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;