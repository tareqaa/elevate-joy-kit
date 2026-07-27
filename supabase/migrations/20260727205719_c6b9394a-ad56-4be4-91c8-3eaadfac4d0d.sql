-- 1) Extend categories for hierarchy + theming
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_gradient TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_main ON public.categories(is_main) WHERE is_main = true;

-- 2) Seed top-level categories from the storefront
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

-- 3) Seed sub-categories with parent_id
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

-- 4) Seed default site settings (only if missing)
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

-- 5) Update auto-cancel to read hours from settings
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