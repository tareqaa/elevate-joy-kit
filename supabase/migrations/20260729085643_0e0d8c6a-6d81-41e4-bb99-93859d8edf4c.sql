
-- 1) Pinned bestseller support on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pinned_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_sort integer NOT NULL DEFAULT 0;

-- 2) Trigger to increment purchases_count when order becomes delivered
CREATE OR REPLACE FUNCTION public.increment_purchases_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  slug text;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      slug := COALESCE(item->>'product_slug', item->>'productSlug', item->>'product');
      IF slug IS NOT NULL AND slug <> '' THEN
        UPDATE public.products
           SET purchases_count = purchases_count + COALESCE((item->>'quantity')::int, 1)
         WHERE slug = slug;
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

-- 3) Storage RLS policies for home-assets bucket
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

-- 4) Default home_content keys in site_settings
INSERT INTO public.site_settings (key, value, description) VALUES
  ('home_hero', '{"enabled":true,"badge":null,"title_a":null,"title_b":null,"title_c":null,"subtitle":null,"cta_primary_text":null,"cta_primary_link":null,"cta_secondary_text":null,"cta_secondary_link":null,"image_url":null}'::jsonb, 'Home hero section overrides (null = use defaults)'),
  ('home_banners', '{"enabled":false,"autoplay":true,"interval_ms":5000,"items":[]}'::jsonb, 'Home carousel banners'),
  ('home_categories_meta', '{}'::jsonb, 'Per-slug overrides for main categories on home'),
  ('home_subcategories_meta', '{}'::jsonb, 'Per-slug overrides for subcategories')
ON CONFLICT (key) DO NOTHING;
