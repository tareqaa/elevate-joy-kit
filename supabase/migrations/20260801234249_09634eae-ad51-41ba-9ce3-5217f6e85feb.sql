
DO $$ BEGIN
  CREATE TYPE public.product_page_template AS ENUM ('standard','multi_account','dual_plans');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.product_delivery_type AS ENUM ('code','account','topup','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tagline_ar text,
  ADD COLUMN IF NOT EXISTS tagline_en text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_image_url text,
  ADD COLUMN IF NOT EXISTS identifier_label_ar text,
  ADD COLUMN IF NOT EXISTS identifier_label_en text,
  ADD COLUMN IF NOT EXISTS identifier_placeholder text,
  ADD COLUMN IF NOT EXISTS delivery_method_ar text,
  ADD COLUMN IF NOT EXISTS delivery_method_en text,
  ADD COLUMN IF NOT EXISTS page_template public.product_page_template NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_type public.product_delivery_type NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS requires_player_id boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_instructions_ar text,
  ADD COLUMN IF NOT EXISTS delivery_instructions_en text,
  ADD COLUMN IF NOT EXISTS delivery_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_region_required_for_code;
ALTER TABLE public.products ADD CONSTRAINT products_region_required_for_code
  CHECK (delivery_type <> 'code' OR (region IS NOT NULL AND length(btrim(region)) > 0));

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS plan_group text,
  ADD COLUMN IF NOT EXISTS old_price_jod numeric,
  ADD COLUMN IF NOT EXISTS tag_ar text,
  ADD COLUMN IF NOT EXISTS tag_en text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS tagline_ar text,
  ADD COLUMN IF NOT EXISTS tagline_en text,
  ADD COLUMN IF NOT EXISTS icon text;

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON public.categories (slug);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);

CREATE TABLE IF NOT EXISTS public.product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  icon text,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  desc_ar text,
  desc_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_features_product_id_idx ON public.product_features (product_id, sort_order);

GRANT SELECT ON public.product_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_features TO authenticated;
GRANT ALL ON public.product_features TO service_role;

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone views product features" ON public.product_features;
CREATE POLICY "Anyone views product features" ON public.product_features
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage product features" ON public.product_features;
CREATE POLICY "Admins manage product features" ON public.product_features
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_product_features_updated_at ON public.product_features;
CREATE TRIGGER set_product_features_updated_at
  BEFORE UPDATE ON public.product_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
