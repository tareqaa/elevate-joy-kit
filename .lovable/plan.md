# تحسينات المتجر والبانل

## 1) إصلاح شعار الواتساب في الفوتر
- الأيقونة في `Footer.tsx`/`layout.js` مقصوصة (viewBox/حجم). إعادة رسمها بـSVG كامل مضبوط.

## 2) محرر الصفحة الرئيسية من الأدمن
جدول جديد `home_content` في `site_settings` (استخدام مفاتيح موجودة) يخزن:
- `home_hero`: badge, title, title_highlight, subtitle, cta_primary_{text,link}, cta_secondary_{text,link}, image_url (اختياري)
- `home_banners`: مصفوفة (max 4) — {id, image_url, title, link, active, sort}
- `home_categories_meta`: لكل قسم رئيسي {slug, name_override, description_override, sort_order, visible}
- `home_subcategories_meta`: نفس الشيء للفرعية

صفحة أدمن جديدة `/admin/home` فيها 4 تبويبات:
1. **Hero** — حقول نص + رفع صورة (Supabase storage bucket موجود)
2. **Banners/Carousel** — سحب وإفلات ترتيب + رفع صور + رابط + toggle
3. **Categories** — قائمة الأقسام الرئيسية، تعديل الاسم/الوصف/الترتيب
4. **Subcategories** — نفس الشيء داخل كل قسم

## 3) الصفحة الرئيسية (React)
- إنشاء `src/routes/index.tsx` React كامل بدل الـstatic HTML (إذا لسا بيستخدم static)، أو تحديث المكوّن الحالي لقراءة من DB.
- إضافة كاروسيل بانرات (Embla carousel — موجود بالمشروع) مع autoplay.
- Hero يقرأ من `site_settings.home_hero`.
- قسم الأقسام يقرأ overrides من `home_categories_meta`.
- الأقسام الفرعية داخل صفحات الأقسام تقرأ overrides.

## 4) الأكثر مبيعاً — تلقائي + تثبيت يدوي
- إضافة عمود `is_pinned_bestseller boolean` و`pinned_sort int` على `products`.
- إنشاء view/query يرتب: المثبتة أولاً حسب `pinned_sort`, ثم البقية حسب `COUNT(orders)` النازل (احتساب من `orders.items` jsonb → إما trigger يحدّث `purchases_count` عند تحويل الطلب لـpaid/delivered، أو استعلام مباشر).
- استخدام العمود الموجود `products.purchases_count` وربطه بـtrigger على `orders` عند تغيير الحالة لـdelivered.
- في `/admin/products` إضافة زر "تثبيت كأكثر مبيعاً" لكل منتج.
- الصفحة الرئيسية تعرض أول 8 من هذا الترتيب.

## Technical
- Migration: أعمدة `is_pinned_bestseller`, `pinned_sort` + trigger `increment_purchases_on_delivered()` + مفاتيح `site_settings`.
- Storage bucket `home-assets` (إذا مش موجود) للـhero/banners.
- Server fn `getHomeContent()` (public, publishable client) يجمع كل شي بطلب واحد.
- Server fn `updateHomeContent()` (admin only) للحفظ.
- Embla موجود — استخدام `<Carousel>` من `@/components/ui/carousel`.

## نطاق واحد لهاي الجولة
كل النقاط أعلاه دفعة وحدة. صفحات الأقسام الداخلية (Design/Games/etc) بتقرأ overrides تلقائياً بعد المايجريشن.
