-- Product ID / SKU
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;

UPDATE public.products p
SET sku = upper(regexp_replace(left(p.slug, 12), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || upper(substr(replace(p.id::text,'-',''),1,4))
WHERE p.sku IS NULL;

UPDATE public.products SET sku = 'P-' || upper(substr(replace(id::text,'-',''),1,6)) WHERE sku IS NULL OR sku = '';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products (upper(sku));

-- Reviews
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