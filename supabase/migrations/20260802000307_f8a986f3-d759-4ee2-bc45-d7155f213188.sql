ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS delivery_type public.product_delivery_type,
  ADD COLUMN IF NOT EXISTS region text;

COMMENT ON COLUMN public.product_variants.delivery_type IS 'Optional per-variant override of products.delivery_type. NULL = inherit from product.';
COMMENT ON COLUMN public.product_variants.region IS 'Optional per-variant region override; only meaningful when effective delivery_type = code.';