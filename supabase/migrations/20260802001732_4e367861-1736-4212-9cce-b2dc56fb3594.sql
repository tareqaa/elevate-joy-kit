ALTER TYPE product_page_template ADD VALUE IF NOT EXISTS 'gift_card';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS thumb_bg text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS card_gradient text;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS cart_id text;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_cart_id_key ON public.product_variants (cart_id) WHERE cart_id IS NOT NULL;