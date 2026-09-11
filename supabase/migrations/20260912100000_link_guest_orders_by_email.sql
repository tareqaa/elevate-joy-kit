-- 1) Link orders to profile on insert if matching email exists
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
      SELECT id INTO NEW.user_id
        FROM public.profiles
       WHERE lower(email) = _em
       LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_order_email_to_profile ON public.orders;
CREATE TRIGGER trg_link_order_email_to_profile
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.link_order_email_to_profile();

-- 2) When user creates an account / updates profile email, link past guest orders
CREATE OR REPLACE FUNCTION public.link_past_orders_on_profile_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _em text;
  _ord record;
BEGIN
  _em := lower(trim(COALESCE(NEW.email, '')));
  IF _em <> '' THEN
    FOR _ord IN
      SELECT id, status FROM public.orders
       WHERE user_id IS NULL
         AND lower(trim(COALESCE(delivery_data->>'customer_email', '')));
    LOOP
      UPDATE public.orders
         SET user_id = NEW.id
       WHERE id = _ord.id;

      -- If already delivered, trigger loyalty
      IF _ord.status = 'delivered' THEN
        -- Run sync
        UPDATE public.orders
           SET updated_at = now()
         WHERE id = _ord.id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_past_orders_on_profile_sync ON public.profiles;
CREATE TRIGGER trg_link_past_orders_on_profile_sync
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_past_orders_on_profile_sync();
