
-- ============ ACTIVITY LOG ============
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_created ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_activity_entity ON public.admin_activity_log (entity_type, entity_id);
CREATE INDEX idx_activity_actor ON public.admin_activity_log (actor_id);

GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view activity" ON public.admin_activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert activity" ON public.admin_activity_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

-- Log helper
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _email, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Auto-log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), _email, 'order.status_changed', 'order', NEW.id::TEXT,
      jsonb_build_object('order_number', NEW.order_number, 'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- Auto-log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _target_email TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    SELECT email INTO _target_email FROM auth.users WHERE id = NEW.user_id;
    INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), _email, 'role.granted', 'user', NEW.user_id::TEXT,
      jsonb_build_object('role', NEW.role, 'target_email', _target_email));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email INTO _target_email FROM auth.users WHERE id = OLD.user_id;
    INSERT INTO public.admin_activity_log (actor_id, actor_email, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), _email, 'role.revoked', 'user', OLD.user_id::TEXT,
      jsonb_build_object('role', OLD.role, 'target_email', _target_email));
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_role_insert AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
CREATE TRIGGER trg_log_role_delete AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins insert settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete settings" ON public.site_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.site_settings (key, value, description) VALUES
  ('store_name', '"GX STORE"'::jsonb, 'اسم المتجر'),
  ('support_whatsapp', '"962790000000"'::jsonb, 'رقم واتساب الدعم'),
  ('support_email', '"support@gxstore.jo"'::jsonb, 'إيميل الدعم'),
  ('social_instagram', '""'::jsonb, 'رابط الإنستغرام'),
  ('social_facebook', '""'::jsonb, 'رابط الفيسبوك'),
  ('social_tiktok', '""'::jsonb, 'رابط تيك توك'),
  ('maintenance_mode', 'false'::jsonb, 'وضع الصيانة'),
  ('maintenance_message', '"المتجر تحت الصيانة، سنعود قريباً"'::jsonb, 'رسالة الصيانة'),
  ('default_currency', '"JOD"'::jsonb, 'العملة الافتراضية'),
  ('order_completion_hours', '24'::jsonb, 'ساعات الإلغاء التلقائي');
