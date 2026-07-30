
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  base_price_jod NUMERIC(10,2),
  badge TEXT,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = true;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  price_jod NUMERIC(10,2) NOT NULL,
  face_value NUMERIC(10,2),
  face_currency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_product ON public.product_variants(product_id);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views active variants"
  ON public.product_variants FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_variants_updated
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_country_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL,
  price_local NUMERIC(12,4) NOT NULL,
  price_jod NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variant_id, country_code)
);

CREATE INDEX idx_country_prices_variant ON public.product_country_prices(variant_id);

GRANT SELECT ON public.product_country_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_country_prices TO authenticated;
GRANT ALL ON public.product_country_prices TO service_role;

ALTER TABLE public.product_country_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views country prices"
  ON public.product_country_prices FOR SELECT
  USING (true);

CREATE POLICY "Admins manage country prices"
  ON public.product_country_prices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_country_prices_updated
  BEFORE UPDATE ON public.product_country_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

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

REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_gradient TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_main ON public.categories(is_main) WHERE is_main = true;

INSERT INTO public.categories (slug, name_ar, name_en, is_active, is_main, theme_color, theme_gradient, description_ar, description_en, sort_order)
VALUES
  ('snapchat',   'سناب بلس',           'Snapchat Plus',      true, true, '#FFCB47', 'linear-gradient(135deg,#FFCB47,#e0a020)', 'أيقونة حصرية، ألوان دردشة، وأكثر', 'Exclusive icons, chat colors and more', 10),
  ('design',     'البرامج والتطبيقات', 'Apps & Software',    true, true, '#C6FF3D', 'linear-gradient(135deg,#C6FF3D,#7ba51f)', 'Adobe، Canva، Microsoft 365، Autodesk وأكثر', 'Adobe, Canva, Microsoft 365, Autodesk and more', 20),
  ('ai',         'الذكاء الاصطناعي',    'AI',                 true, true, '#b26bff', 'linear-gradient(135deg,#b26bff,#6b21a8)', 'اشتراكات Gemini Pro وأدوات AI الأخرى',      'Gemini Pro and other AI tools', 30),
  ('games',      'الألعاب',            'Games',              true, true, '#00E5FF', 'linear-gradient(135deg,#00E5FF,#0091ff)', 'فورت نايت، بلايستيشن، إكسبوكس',              'Fortnite, PlayStation, Xbox', 40),
  ('gift-cards', 'بطاقات الهدايا',     'Gift Cards',         true, true, '#FF2D78', 'linear-gradient(135deg,#FF2D78,#c9185b)', 'PlayStation، Xbox، Google Play، iTunes',    'PlayStation, Xbox, Google Play, iTunes', 50)
ON CONFLICT (slug) DO UPDATE SET
  is_main = EXCLUDED.is_main,
  theme_color = COALESCE(public.categories.theme_color, EXCLUDED.theme_color),
  theme_gradient = COALESCE(public.categories.theme_gradient, EXCLUDED.theme_gradient),
  description_ar = COALESCE(public.categories.description_ar, EXCLUDED.description_ar),
  description_en = COALESCE(public.categories.description_en, EXCLUDED.description_en);

WITH parents AS (
  SELECT id, slug FROM public.categories WHERE slug IN ('design','ai','games','gift-cards')
)
INSERT INTO public.categories (slug, name_ar, name_en, parent_id, is_active, theme_color, sort_order)
SELECT s.slug, s.name_ar, s.name_en, p.id, true, s.color, s.ord
FROM (VALUES
  ('adobe',           'Adobe Creative Cloud', 'Adobe Creative Cloud', 'design',  '#ff5f2b', 10),
  ('canva',           'Canva Pro',            'Canva Pro',            'design',  '#00c4cc', 20),
  ('microsoft365',    'Microsoft 365',        'Microsoft 365',        'design',  '#d83b01', 30),
  ('windows-keys',    'مفاتيح Windows',       'Windows Keys',         'design',  '#0078d4', 40),
  ('autodesk',        'Autodesk',             'Autodesk',             'design',  '#0696d7', 50),
  ('linkedin-premium','LinkedIn Premium',     'LinkedIn Premium',     'design',  '#0a66c2', 60),
  ('gemini',          'Gemini Pro',           'Gemini Pro',           'ai',      '#8b5cf6', 10),
  ('fortnite',        'فورت نايت',            'Fortnite',             'games',   '#00e5ff', 10),
  ('steam',           'ألعاب Steam',           'Steam Games',          'games',   '#1b2838', 20),
  ('sony',            'ألعاب PlayStation',     'PlayStation Games',    'games',   '#0070d1', 30),
  ('xbox-games',      'ألعاب Xbox',            'Xbox Games',           'games',   '#107c10', 40),
  ('gc-playstation',  'PlayStation Cards',     'PlayStation Cards',    'gift-cards','#00a3ff', 10),
  ('gc-xbox',         'Xbox Cards',            'Xbox Cards',           'gift-cards','#4fdc4f', 20),
  ('gc-google-play',  'Google Play Cards',     'Google Play Cards',    'gift-cards','#34a853', 30),
  ('gc-itunes',       'iTunes Cards',          'iTunes Cards',         'gift-cards','#f107a3', 40)
) AS s(slug, name_ar, name_en, parent_slug, color, ord)
JOIN parents p ON p.slug = s.parent_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.site_settings (key, value, description) VALUES
  ('store_name',              '"GX STORE"'::jsonb,                                     'اسم المتجر'),
  ('default_currency',        '"JOD"'::jsonb,                                          'العملة الافتراضية'),
  ('order_completion_hours',  '24'::jsonb,                                             'ساعات قبل الإلغاء التلقائي'),
  ('support_whatsapp',        '"962776252313"'::jsonb,                                 'رقم واتساب الدعم'),
  ('support_email',           '"support@gxstore.com"'::jsonb,                          'إيميل الدعم'),
  ('social_instagram',        '""'::jsonb,                                             'رابط انستغرام'),
  ('social_facebook',         '""'::jsonb,                                             'رابط فيسبوك'),
  ('social_tiktok',           '""'::jsonb,                                             'رابط تيك توك'),
  ('maintenance_mode',        'false'::jsonb,                                          'تفعيل وضع الصيانة'),
  ('maintenance_message',     '"الموقع تحت الصيانة حالياً — راجعنا خلال قليل."'::jsonb, 'رسالة الصيانة')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auto_cancel_stale_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  n integer;
  hrs integer;
BEGIN
  SELECT COALESCE((value)::text::integer, 24) INTO hrs
    FROM public.site_settings WHERE key = 'order_completion_hours';
  IF hrs IS NULL OR hrs < 1 THEN hrs := 24; END IF;

  WITH updated AS (
    UPDATE public.orders
       SET status = 'cancelled',
           admin_notes = COALESCE(admin_notes, '') ||
             CASE WHEN admin_notes IS NULL OR admin_notes = '' THEN '' ELSE E'\n' END ||
             'تم الإلغاء تلقائياً: لم يكتمل الطلب خلال ' || hrs || ' ساعة.',
           updated_at = now()
     WHERE status = 'pending'
       AND created_at < now() - (hrs || ' hours')::interval
    RETURNING id
  )
  SELECT count(*) INTO n FROM updated;
  RETURN n;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_cancel_stale_orders() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS accent_color text;

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_is_main_idx ON public.categories(is_main) WHERE is_main = true;

UPDATE public.categories SET is_main = true WHERE parent_id IS NULL AND is_main = false;
