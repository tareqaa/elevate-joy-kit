## دعم اللغة الإنجليزية الكامل (AR/EN)

### 1. البنية الأساسية (i18n Foundation)
- إنشاء `src/lib/gx/i18n.tsx` — React Context للغة، مع:
  - `useLanguage()` hook يرجع `{ lang, setLang, t, dir }`
  - كشف تلقائي عبر `ipwho.is` (نفس آلية العملة): دول عربية → AR، غيرها → EN
  - حفظ الاختيار في `localStorage.gx_lang`
  - تحديث `<html lang>` و `<html dir>` ديناميكياً
- إنشاء `src/lib/gx/i18n-static.js` نسخة موازية للصفحات الستاتيك في `public/app/`

### 2. ملفات الترجمة
- `src/lib/gx/translations/ar.ts` و `en.ts` — قواميس مفاتيح للواجهة
- `src/data/products.ts` — إضافة حقول `title_en`, `desc_en`, `category_en` لكل منتج
- ترجمة كاملة لـ: الأقسام، أسماء المنتجات، الأوصاف، FAQ، Policy، رسائل الأزرار، النماذج، الحساب، الأدمن

### 3. دعم LTR (Left-to-Right)
- في `theme.css` و `styles.css`: إضافة قواعد `html[dir="ltr"]` لعكس:
  - محاذاة النصوص (`text-align`)
  - الهوامش والحشوات (margin/padding start/end)
  - اتجاه الفليكس والقوائم المنسدلة
  - موضع الأيقونات في الأزرار والحقول
- الخط الإنجليزي: استخدام `Inter` أو `Poppins` من Google Fonts للـ EN، الإبقاء على `Tajawal/Almarai` للـ AR

### 4. مبدّل اللغة داخل مودال العملة
- تحديث `CurrencyModal.tsx`: إضافة قسم "Language / اللغة" فوق العملة
- تحديث المودال الستاتيك في `layout.js` بنفس الطريقة

### 5. التطبيق على الصفحات
- **صفحات React**: تمرير كل النصوص عبر `t()` — Home, Cart, Product, Category, GiftCards, Snapchat, Fortnite, Account, Admin, Auth, FAQ, Policy, 404
- **صفحات ستاتيك** (`public/app/*.html`): نسخة `i18n-static.js` تستبدل النصوص بعد التحميل عبر `data-i18n` attributes، وتحقن الترجمات في القوائم الديناميكية
- **الـ Navbar والفوتر**: ترجمة كل الروابط والفئات

### 6. رسالة WhatsApp
- تحديث `cart.js` ليرسل الفاتورة بلغة المستخدم الحالية (AR أو EN)

### 7. ملاحظات
- الأرقام والأسعار: تبقى بأرقام لاتينية (زي حالياً)
- العملة: منفصلة عن اللغة (المستخدم يقدر يختار EN + JOD مثلاً)
- SEO: تحديث `head()` في كل route ليدعم `og:locale` حسب اللغة الحالية

### حجم الشغل
هالمشروع كبير جداً بسبب حجم المحتوى (100+ منتج، عشرات الصفحات). رح يتم تنفيذه على مراحل، وبعد الموافقة رح أبدأ بالبنية الأساسية + الترجمة الكاملة دفعة واحدة.
