-- Migration: 20261109214500_update_playstation_sa_cards.sql
-- Updates PlayStation Store Saudi Arabia gift cards to SAR denominations
-- 50 SAR = 11.5 JOD
-- 100 SAR = 23 JOD
-- 150 SAR = 34.5 JOD
-- 200 SAR = 46 JOD
-- 300 SAR = 69 JOD
-- 400 SAR = 92 JOD
-- 500 SAR = 115 JOD

DO $$
DECLARE
  ps_id UUID;
BEGIN
  SELECT id INTO ps_id FROM public.products WHERE slug = 'playstation' LIMIT 1;
  IF ps_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Deactivate old dollar-denominated Saudi PSN cards
  UPDATE public.product_variants
  SET is_active = false
  WHERE product_id = ps_id
    AND cart_id IN ('psn-sa-10', 'psn-sa-20');

  -- 2. Update existing psn-sa-50 or insert it with 50 SAR / 11.5 JOD
  INSERT INTO public.product_variants (
    product_id, cart_id, label_ar, label_en, price_jod, old_price_jod, plan_group, region, delivery_type, sort_order, is_active
  ) VALUES (
    ps_id, 'psn-sa-50', '50 ر.س', '50 SAR', 11.500, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 10, true
  )
  ON CONFLICT (cart_id) DO UPDATE SET
    label_ar = EXCLUDED.label_ar,
    label_en = EXCLUDED.label_en,
    price_jod = EXCLUDED.price_jod,
    old_price_jod = EXCLUDED.old_price_jod,
    plan_group = EXCLUDED.plan_group,
    region = EXCLUDED.region,
    delivery_type = EXCLUDED.delivery_type,
    is_active = true;

  -- 3. Upsert the rest of the SAR denominations
  INSERT INTO public.product_variants (
    product_id, cart_id, label_ar, label_en, price_jod, old_price_jod, plan_group, region, delivery_type, sort_order, is_active
  ) VALUES
    (ps_id, 'psn-sa-100', '100 ر.س', '100 SAR', 23.000, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 11, true),
    (ps_id, 'psn-sa-150', '150 ر.س', '150 SAR', 34.500, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 12, true),
    (ps_id, 'psn-sa-200', '200 ر.س', '200 SAR', 46.000, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 13, true),
    (ps_id, 'psn-sa-300', '300 ر.س', '300 SAR', 69.000, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 14, true),
    (ps_id, 'psn-sa-400', '400 ر.س', '400 SAR', 92.000, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 15, true),
    (ps_id, 'psn-sa-500', '500 ر.س', '500 SAR', 115.000, NULL, 'sa', 'السعودية (KSA)|Saudi Arabia (KSA)|🇸🇦', 'code', 16, true)
  ON CONFLICT (cart_id) DO UPDATE SET
    label_ar = EXCLUDED.label_ar,
    label_en = EXCLUDED.label_en,
    price_jod = EXCLUDED.price_jod,
    old_price_jod = EXCLUDED.old_price_jod,
    plan_group = EXCLUDED.plan_group,
    region = EXCLUDED.region,
    delivery_type = EXCLUDED.delivery_type,
    is_active = true;

END $$;

-- 4. Update site_settings.catalog_prices jsonb
INSERT INTO public.site_settings (key, value)
VALUES (
  'catalog_prices',
  jsonb_build_object(
    'psn-sa-50', jsonb_build_object('price', 11.5),
    'psn-sa-100', jsonb_build_object('price', 23),
    'psn-sa-150', jsonb_build_object('price', 34.5),
    'psn-sa-200', jsonb_build_object('price', 46),
    'psn-sa-300', jsonb_build_object('price', 69),
    'psn-sa-400', jsonb_build_object('price', 92),
    'psn-sa-500', jsonb_build_object('price', 115)
  )
)
ON CONFLICT (key) DO UPDATE
SET value = public.site_settings.value || EXCLUDED.value;

