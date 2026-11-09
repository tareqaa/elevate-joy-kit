-- Migration: 20261109213000_update_gemini_and_catalog_prices.sql
-- Updates Gemini Plus 6-Month subscription to 4 JOD (disables Pro)
-- Updates Notion Business to 6 JOD
-- Updates Microsoft 365 to 5 JOD
-- Updates Windows 11 Pro Retail (7 JOD) and OEM (5 JOD)
-- Updates site_settings.catalog_prices

-- 1. Update Gemini product in public.products
UPDATE public.products
SET
  name_ar = 'Google Gemini Plus | اشتراك 6 أشهر',
  name_en = 'Google Gemini Plus — 6 Months',
  base_price_jod = 4.000,
  tagline_ar = 'رابط تفعيل رسمي 6 أشهر • لا يتطلب بطاقة بنكية (Credit Card) • صلاحية الرابط 10 ساعات من التسليم',
  tagline_en = 'Official 6-month activation link • No credit card required • Link valid for 10 hours from delivery',
  delivery_type = 'link',
  image_url = '/app/assets/img/gemini-logo.svg',
  icon_image_url = '/app/assets/img/gemini-logo.svg',
  badge = 'رابط تفعيل • 6 أشهر'
WHERE slug = 'gemini';

-- 2. Deactivate Gemini Pro variant and configure Gemini Plus 6-Month variant
UPDATE public.product_variants
SET is_active = false
WHERE cart_id = 'gemini-pro-3m'
   OR (product_id IN (SELECT id FROM public.products WHERE slug = 'gemini') AND (cart_id ILIKE '%pro%' OR label_ar ILIKE '%برو%'));

UPDATE public.product_variants
SET
  cart_id = 'gemini-plus-6m',
  label_ar = 'Google Gemini Plus | اشتراك 6 أشهر (رابط تفعيل)',
  label_en = 'Google Gemini Plus — 6 Months (Activation Link)',
  price_jod = 4.000,
  old_price_jod = 8.000,
  delivery_type = 'link',
  tag_ar = 'رابط تفعيل 6 أشهر',
  tag_en = '6-Month Link',
  is_active = true
WHERE (product_id IN (SELECT id FROM public.products WHERE slug = 'gemini') AND (cart_id = 'gemini-plus-3m' OR cart_id = 'gemini-plus-6m'))
   OR cart_id = 'gemini-plus-3m';

-- 3. Update Notion Business in public.products & product_variants
UPDATE public.products
SET
  base_price_jod = 6.000
WHERE slug = 'notion-business';

UPDATE public.product_variants
SET
  price_jod = 6.000,
  old_price_jod = 30.000
WHERE cart_id = 'notion-biz-3m'
   OR product_id IN (SELECT id FROM public.products WHERE slug = 'notion-business');

-- 4. Update Microsoft 365
UPDATE public.products
SET
  name_ar = 'Microsoft 365 | حساب جاهز (12 شهر)',
  name_en = 'Microsoft 365 | Dedicated Account (12 Months)',
  base_price_jod = 5.000,
  tagline_ar = 'اشتراك Microsoft 365 رسمي — حساب جاهز بكامل برامج أوفيس و1TB سحابي',
  tagline_en = 'Official Microsoft 365 — Full Office suite with 1TB cloud storage'
WHERE slug = 'microsoft365';

UPDATE public.product_variants
SET
  price_jod = 5.000,
  old_price_jod = 10.000
WHERE cart_id = 'ms365-acct-12';

-- 5. Update Windows 11 variants
UPDATE public.product_variants
SET
  price_jod = 7.000,
  old_price_jod = 15.000
WHERE cart_id = 'win-11-pro-retail';

UPDATE public.product_variants
SET
  price_jod = 5.000,
  old_price_jod = 12.000
WHERE cart_id = 'win-11-pro-oem';

-- 6. Update site_settings.catalog_prices jsonb
INSERT INTO public.site_settings (key, value)
VALUES (
  'catalog_prices',
  jsonb_build_object(
    'gemini', jsonb_build_object('price', 4, 'oldPrice', 8),
    'gemini-plus-6m', jsonb_build_object('price', 4, 'oldPrice', 8),
    'gemini-plus-3m', jsonb_build_object('price', 4, 'oldPrice', 8),
    'notion-biz-3m', jsonb_build_object('price', 6, 'oldPrice', 30),
    'notion-business', jsonb_build_object('price', 6, 'oldPrice', 30),
    'ms365-acct-12', jsonb_build_object('price', 5, 'oldPrice', 10),
    'win-11-pro-retail', jsonb_build_object('price', 7, 'oldPrice', 15),
    'win-11-pro-oem', jsonb_build_object('price', 5, 'oldPrice', 12),
    'windows-11-pro-retail', jsonb_build_object('price', 7, 'oldPrice', 15),
    'windows-11-pro-oem', jsonb_build_object('price', 5, 'oldPrice', 12)
  )
)
ON CONFLICT (key) DO UPDATE
SET value = public.site_settings.value || EXCLUDED.value;

