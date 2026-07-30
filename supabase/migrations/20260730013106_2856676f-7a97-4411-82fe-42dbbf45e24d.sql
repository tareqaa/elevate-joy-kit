
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  whatsapp TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_spent NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TYPE public.order_status AS ENUM ('pending','paid','processing','delivered','cancelled');

CREATE SEQUENCE public.order_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.order_number_seq');
  RETURN 'GX-' || to_char(now(), 'YYYY') || '-' || lpad(n::TEXT, 6, '0');
END;
$$;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT public.generate_order_number(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_whatsapp TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_jod NUMERIC(12,3) NOT NULL DEFAULT 0,
  currency_snapshot TEXT DEFAULT 'JOD',
  status order_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  delivery_data JSONB DEFAULT '{}'::jsonb,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can create orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_username TEXT;
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  meta_username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');
  IF meta_username IS NULL THEN
    base_username := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  ELSE
    base_username := regexp_replace(meta_username, '[^a-zA-Z0-9_]', '', 'g');
  END IF;
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := 'gx' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(final_username)) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

UPDATE public.profiles p
SET username = COALESCE(
  regexp_replace(split_part(p.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'),
  'gx' || substr(replace(p.id::text, '-', ''), 1, 6)
)
WHERE p.username IS NULL;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'order_update',
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, body)
    VALUES (
      NEW.user_id,
      NEW.id,
      'order_delivered',
      'تم تسليم طلبك ✅',
      'الطلب ' || NEW.order_number || ' جاهز — الأكواد متوفرة في صفحة طلباتي.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_delivered();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

REVOKE EXECUTE ON FUNCTION public.notify_order_delivered() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH updated AS (
    UPDATE public.orders
       SET status = 'cancelled',
           admin_notes = COALESCE(admin_notes, '') ||
             CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE E'\n' END ||
             'تم الإلغاء تلقائياً: لم يكتمل الطلب خلال 24 ساعة.',
           updated_at = now()
     WHERE status = 'pending'
       AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO n FROM updated;
  RETURN n;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gx_auto_cancel_stale_orders') THEN
    PERFORM cron.unschedule('gx_auto_cancel_stale_orders');
  END IF;
  PERFORM cron.schedule(
    'gx_auto_cancel_stale_orders',
    '*/15 * * * *',
    $cron$SELECT public.auto_cancel_stale_orders();$cron$
  );
END $$;

SELECT public.auto_cancel_stale_orders();

REVOKE EXECUTE ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;

create or replace function public.get_public_profile(_username text)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  level int,
  xp int,
  rank bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select p.id, p.username, p.full_name, p.avatar_url, p.level, p.xp, p.created_at,
           rank() over (order by coalesce(p.xp,0) desc, p.created_at asc) as rank
    from public.profiles p
    where p.username is not null
  )
  select id, username, full_name, avatar_url, level, xp, rank, created_at
  from ranked
  where lower(username) = lower(_username)
  limit 1;
$$;

create or replace function public.search_public_profiles(_q text, _limit int default 10)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  level int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_url, p.level
  from public.profiles p
  where p.username is not null
    and (_q is null or _q = '' or p.username ilike '%' || _q || '%' or coalesce(p.full_name,'') ilike '%' || _q || '%')
  order by coalesce(p.xp,0) desc
  limit greatest(1, least(coalesce(_limit,10), 25));
$$;

REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_delivered() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.search_public_profiles(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.create_order(
  p_items jsonb,
  p_total_jod numeric,
  p_currency_snapshot text DEFAULT 'JOD',
  p_customer_name text DEFAULT NULL,
  p_customer_whatsapp text DEFAULT NULL,
  p_delivery_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_id uuid;
  v_order_number text;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items are required';
  END IF;

  IF p_total_jod IS NULL OR p_total_jod < 0 THEN
    RAISE EXCEPTION 'Invalid order total';
  END IF;

  INSERT INTO public.orders (
    user_id,
    customer_name,
    customer_whatsapp,
    items,
    total_jod,
    currency_snapshot,
    delivery_data,
    status
  )
  VALUES (
    p_user_id,
    NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_customer_whatsapp), ''),
    p_items,
    p_total_jod,
    COALESCE(NULLIF(trim(p_currency_snapshot), ''), 'JOD'),
    COALESCE(p_delivery_data, '{}'::jsonb),
    'pending'
  )
  RETURNING orders.id, orders.order_number INTO v_id, v_order_number;

  RETURN QUERY SELECT v_id, v_order_number;
END;
$$;

REVOKE ALL ON FUNCTION private.create_order(jsonb, numeric, text, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.create_order(jsonb, numeric, text, text, text, jsonb, uuid) TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_delivered() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cancel_stale_orders() TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_public_profiles(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO anon, authenticated, service_role;
