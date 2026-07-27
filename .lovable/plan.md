# خطة العمل — ربط الإعدادات + إعادة هيكلة الأقسام

## 1) ربط `/admin/settings` بالواجهة العامة

**قاعدة البيانات**: تعبئة القيم الافتراضية في `site_settings` (store_name, default_currency=JOD, support_whatsapp, support_email, social_*, maintenance_mode=false, maintenance_message, order_completion_hours=24).

**Provider جديد** `src/lib/gx/site-settings.tsx`:
- Hook `useSiteSettings()` يقرأ الجدول مرة واحدة عبر React Query ويكاش في `localStorage` لمنع flash.
- يفعّل realtime عبر `postgres_changes` على `site_settings`.

**التطبيق على الواجهة**:
- **Maintenance mode**: banner علوي في `StoreShell` + بلوك على الصفحة الرئيسية يمنع الطلبات (يعطّل زر "اشتري الآن" + السلة) ويعرض `maintenance_message`. الأدمن يتجاوز.
- **WhatsApp دعم**: `Footer` + `Navbar` + رابط الاتصال بالصفحة الرئيسية + زر واتساب عائم يقرأ `support_whatsapp`.
- **Email دعم**: `Footer` + صفحة FAQ.
- **Social links**: `Footer` يقرأ من الإعدادات بدل الثابتة.
- **Default currency**: `CurrencyProvider` يستعمل `default_currency` كـ fallback أول زيارة.
- **Auto-cancel hours**: cron job DB يقرأ الرقم من الإعدادات (تعديل `auto_cancel_stale_orders`).
- **Store name**: يستعمل في `<title>` عبر head defaults + الشعار النصي.

## 2) إعادة هيكلة الأقسام (هرمية + ثيم)

**Migration**:
- إضافة أعمدة لـ `categories`:
  - `parent_id uuid` (self-FK, nullable)
  - `is_main boolean default false` (يظهر بالصفحة الرئيسية كقسم رئيسي)
  - `theme_color text` (hex لون التدرّج/الأيقونة)
  - `theme_gradient text` (اختياري: linear gradient CSS)
  - `description_ar text`, `description_en text`
- Seed للأقسام الحالية من `products-data.js`: games, design, gift-cards, snapchat, ai, apps + الفرعية (fortnite, sony, xbox, steam, adobe, canva, autodesk, microsoft365, linkedin, windows, itunes, google-play, playstation, xbox-gc, gemini).
- ربط `products.category_id` بجميع المنتجات الحالية (تلقائي عبر slug).

**واجهة الأدمن `/admin/categories`** (إعادة بناء كاملة):
- **شجرة هرمية** (Tree view) قابلة للطي — 3 مستويات.
- زر "قسم فرعي" على كل عنصر لإضافة تحته.
- **Dialog محسّن** يحتوي: parent picker (dropdown هرمي), toggle "قسم رئيسي (يظهر بالواجهة)", color picker (نص + swatch), gradient preview, وصف عربي/إنجليزي, أيقونة, ترتيب, حالة.
- سحب وإفلات (drag-reorder) للترتيب داخل نفس المستوى.
- Live preview لبطاقة القسم كما ستظهر بالواجهة.
- بحث + إحصائيات (عدد المنتجات لكل قسم).

**واجهة الأدمن `/admin/products`**:
- إضافة **Category picker هرمي** (breadcrumb selector) بدل ما هو موجود.
- فلترة بالشجرة الجانبية.

**الواجهة العامة**:
- الصفحة الرئيسية تقرأ `is_main=true` من DB وتبني بطاقات الأقسام ديناميكياً بلون/تدرّج كل قسم.
- صفحة `/category/$slug` تقرأ الأقسام الفرعية + المنتجات من DB (مع fallback على `products-data.js` للانتقال التدريجي).

## 3) تحسين واجهات الأدمن الداخلية (كما بالصورة)

- توحيد header الصفحات: أيقونة gradient + عنوان + وصف + CTA يمين.
- إضافة **stat strip** أعلى كل صفحة (عدد الأقسام / الرئيسية / المخفية).
- Cards بحواف neon محسّنة + hover glow.
- Empty states احترافية.
- Skeleton loaders بدل نص "جاري التحميل".
- Breadcrumb علوي داخل AdminShell.

## تفاصيل تقنية

- Migration واحدة لـ (columns + seed categories + link products + settings defaults + update cron).
- كل تغييرات DB تتبع نمط RLS/GRANT الموجود.
- Realtime subscription واحدة على `site_settings` + `categories` للتحديث الفوري.
- الحفاظ على `products-data.js` كـ fallback؛ لا نكسر الصفحات الثابتة القديمة.

## ترتيب التنفيذ

1. Migration (schema + seed + defaults).
2. `useSiteSettings` provider + تطبيقه على Footer/Shell/Cart/Currency.
3. Maintenance banner + gating.
4. إعادة بناء `/admin/categories` (tree + hierarchical dialog + theming).
5. تحديث `/admin/products` (hierarchical picker).
6. ربط الصفحة الرئيسية بأقسام DB.
7. تحسينات UI العامة على صفحات الأدمن.
