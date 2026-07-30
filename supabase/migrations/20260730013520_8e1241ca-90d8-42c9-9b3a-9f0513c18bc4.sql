
DROP POLICY IF EXISTS "Anyone views country prices" ON public.product_country_prices;

CREATE POLICY "Anyone views prices of active products"
ON public.product_country_prices
FOR SELECT
TO anon, authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.product_variants v
    JOIN public.products p ON p.id = v.product_id
    WHERE v.id = product_country_prices.variant_id
      AND v.is_active = true
      AND p.is_active = true
  )
);

CREATE TYPE public.coupon_discount_type AS ENUM ('percent', 'fixed');
CREATE TYPE public.coupon_scope AS ENUM ('all', 'products', 'categories');

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type public.coupon_discount_type NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount_jod NUMERIC,
  min_order_jod NUMERIC NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER NOT NULL DEFAULT 0,
  scope public.coupon_scope NOT NULL DEFAULT 'all',
  product_slugs TEXT[] NOT NULL DEFAULT '{}',
  category_slugs TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_jod NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_user ON public.coupon_redemptions(user_id);

ALTER TABLE public.orders
  ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN contact_type TEXT;

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code TEXT,
  _subtotal_jod NUMERIC,
  _user_id UUID,
  _product_slugs TEXT[],
  _category_slugs TEXT[]
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  eligible NUMERIC := 0;
  discount NUMERIC := 0;
  used_by_user INTEGER := 0;
BEGIN
  IF _code IS NULL OR trim(_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'أدخل كود الكوبون');
  END IF;

  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون غير موجود');
  END IF;
  IF NOT c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون غير فعال');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الكوبون منتهي الصلاحية');
  END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count >= c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون');
  END IF;
  IF c.min_order_jod > 0 AND _subtotal_jod < c.min_order_jod THEN
    RETURN jsonb_build_object('valid', false, 'message', 'الحد الأدنى للطلب ' || c.min_order_jod::text || ' د.أ');
  END IF;

  IF _user_id IS NOT NULL AND c.per_user_limit > 0 THEN
    SELECT count(*) INTO used_by_user FROM public.coupon_redemptions
      WHERE coupon_id = c.id AND user_id = _user_id;
    IF used_by_user >= c.per_user_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'استخدمت هذا الكوبون بالحد الأقصى المسموح');
    END IF;
  END IF;

  IF c.scope = 'all' THEN
    eligible := _subtotal_jod;
  ELSIF c.scope = 'products' THEN
    IF _product_slugs IS NULL OR NOT (_product_slugs && c.product_slugs) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'الكوبون لا ينطبق على منتجات السلة');
    END IF;
    eligible := _subtotal_jod;
  ELSIF c.scope = 'categories' THEN
    IF _category_slugs IS NULL OR NOT (_category_slugs && c.category_slugs) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'الكوبون لا ينطبق على أقسام السلة');
    END IF;
    eligible := _subtotal_jod;
  END IF;

  IF c.discount_type = 'percent' THEN
    discount := round((eligible * c.discount_value / 100)::numeric, 2);
    IF c.max_discount_jod IS NOT NULL AND discount > c.max_discount_jod THEN
      discount := c.max_discount_jod;
    END IF;
  ELSE
    discount := c.discount_value;
  END IF;

  IF discount > _subtotal_jod THEN discount := _subtotal_jod; END IF;
  IF discount <= 0 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'قيمة الخصم صفر');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount_jod', discount,
    'message', 'تم تطبيق الكوبون'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC, UUID, TEXT[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC, UUID, TEXT[], TEXT[]) TO anon, authenticated, service_role;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pinned_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_sort integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_purchases_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  s text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      s := COALESCE(item->>'product_slug', item->>'productSlug', item->>'product');
      IF s IS NOT NULL AND s <> '' THEN
        UPDATE public.products p
           SET purchases_count = p.purchases_count + COALESCE((item->>'quantity')::int, 1)
         WHERE p.slug = s;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_purchases ON public.orders;
CREATE TRIGGER trg_increment_purchases
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_purchases_on_delivered();

REVOKE EXECUTE ON FUNCTION public.increment_purchases_on_delivered() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_purchases_on_delivered() TO authenticated;

CREATE POLICY "Home assets: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'home-assets');

CREATE POLICY "Home assets: admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Home assets: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Home assets: admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'home-assets' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value, description) VALUES
  ('home_hero', '{"enabled":true,"badge":null,"title_a":null,"title_b":null,"title_c":null,"subtitle":null,"cta_primary_text":null,"cta_primary_link":null,"cta_secondary_text":null,"cta_secondary_link":null,"image_url":null}'::jsonb, 'Home hero section overrides (null = use defaults)'),
  ('home_banners', '{"enabled":false,"autoplay":true,"interval_ms":5000,"items":[]}'::jsonb, 'Home carousel banners'),
  ('home_categories_meta', '{}'::jsonb, 'Per-slug overrides for main categories on home'),
  ('home_subcategories_meta', '{}'::jsonb, 'Per-slug overrides for subcategories')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.home_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL,
  actor_id uuid,
  actor_email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.home_settings_history TO authenticated;
GRANT ALL ON public.home_settings_history TO service_role;

ALTER TABLE public.home_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view history"
ON public.home_settings_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert history"
ON public.home_settings_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND (actor_id IS NULL OR actor_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_home_history_key_time ON public.home_settings_history (key, created_at DESC);

INSERT INTO public.site_settings (key, value, description)
VALUES (
  'home_layout',
  '{
    "version": 1,
    "sections": [
      {"id": "sec_hero",         "type": "hero",         "enabled": true, "data": {}},
      {"id": "sec_announcement", "type": "announcement", "enabled": false, "data": {"text": "", "link": "", "bg": "#0f172a", "color": "#ffffff"}},
      {"id": "sec_carousel",     "type": "carousel",     "enabled": true, "data": {}},
      {"id": "sec_categories",   "type": "categories",   "enabled": true, "data": {}},
      {"id": "sec_bestsellers",  "type": "bestsellers",  "enabled": true, "data": {}},
      {"id": "sec_trust",        "type": "trust",        "enabled": true, "data": {}},
      {"id": "sec_reviews",      "type": "reviews",      "enabled": true, "data": {}},
      {"id": "sec_faq",          "type": "faq",          "enabled": false, "data": {"title": "الأسئلة الشائعة", "items": [{"id":"q1","q":"كيف يتم التسليم؟","a":"يتم التسليم فوراً بعد تأكيد الطلب."}]}},
      {"id": "sec_newsletter",   "type": "newsletter",   "enabled": false, "data": {"title": "اشترك بالنشرة", "subtitle": "أول من يعرف عن العروض", "cta": "اشترك"}}
    ]
  }'::jsonb,
  'Ordered list of homepage sections rendered by the visual page builder.'
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;

UPDATE public.products p
SET sku = upper(regexp_replace(left(p.slug, 12), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || upper(substr(replace(p.id::text,'-',''),1,4))
WHERE p.sku IS NULL;

UPDATE public.products SET sku = 'P-' || upper(substr(replace(id::text,'-',''),1,6)) WHERE sku IS NULL OR sku = '';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products (upper(sku));

CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected','hidden');

CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number TEXT,
  product_slug TEXT,
  product_name TEXT,
  display_name TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  status public.review_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views approved high reviews"
ON public.reviews FOR SELECT TO anon, authenticated
USING (status = 'approved' AND rating >= 4);

CREATE POLICY "Users view own reviews"
ON public.reviews FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create reviews for own delivered orders"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.user_id = auth.uid()
      AND o.status = 'delivered'
  )
);

CREATE POLICY "Users update own pending reviews"
ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins view all reviews"
ON public.reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reviews"
ON public.reviews FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER reviews_set_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX reviews_status_idx ON public.reviews (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_order ON public.reviews (order_id) WHERE order_id IS NOT NULL;
