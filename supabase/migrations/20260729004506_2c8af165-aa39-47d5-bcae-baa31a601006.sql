
-- =========== COUPONS =============
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
  per_user_limit INTEGER NOT NULL DEFAULT 0, -- 0 = unlimited per user
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

-- =========== REDEMPTIONS =============
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

-- =========== ORDERS ADDITIONS =============
ALTER TABLE public.orders
  ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN coupon_code TEXT,
  ADD COLUMN discount_jod NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN contact_type TEXT;

-- =========== VALIDATE FUNCTION =============
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

  -- eligible subtotal (for scoped coupons the discount base is only matching items)
  IF c.scope = 'all' THEN
    eligible := _subtotal_jod;
  ELSIF c.scope = 'products' THEN
    IF _product_slugs IS NULL OR NOT (_product_slugs && c.product_slugs) THEN
      RETURN jsonb_build_object('valid', false, 'message', 'الكوبون لا ينطبق على منتجات السلة');
    END IF;
    eligible := _subtotal_jod; -- client sends the eligible subtotal
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
