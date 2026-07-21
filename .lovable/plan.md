## المشكلة

كل ملفات HTML/JS/CSS داخل `public/app/` تشير للأصول بمسارات مطلقة تبدأ بـ `/app/`:

- `<link rel="stylesheet" href="/app/assets/css/theme.css">`
- `<script src="/app/assets/js/products-data.js">`
- روابط بين الصفحات مثل `/app/cart/index.html`, `/app/games/fortnite/index.html`

في `netlify.toml` الحالي حطّينا `publish = "public/app"`، فصار جذر الموقع هو مجلد `app` نفسه، وأي طلب لـ `/app/assets/...` أو `/app/cart/...` يرجع 404. النتيجة: تحمل صفحة `/app/index.html` بدون تنسيق ولا JavaScript — تماماً مثل الصورة المرفقة.

## الحل

نخلي جذر النشر هو مجلد `public/` بدل `public/app/`، حتى مسارات `/app/...` تشتغل مباشرة كما هي في الكود بدون أي تعديل على ملفات الموقع.

## التعديلات

### 1) `netlify.toml`
- تغيير `publish` من `"public/app"` إلى `"public"`.
- تحديث redirect الجذر: `from = "/"` → `to = "/app/index.html"` (بدل `/index.html`).
- تحديث SPA fallback ليعمل على `/app/*` فقط:
  ```
  from = "/app/*"  →  to = "/app/:splat/index.html"  (200، فقط للمسارات بدون امتداد)
  ```
- headers الـ caching تصبح على `/app/assets/*` بدل `/assets/*`.

### 2) `public/app/_redirects`
- تحديث السطر ليصبح: `/    /app/index.html    200` بدل `/    /index.html    200`.

### 3) لا تعديلات أخرى
- لا تغيير على أي ملف HTML/CSS/JS داخل `public/app/`.
- لا تغيير على منطق TanStack Start أو التوجيه من `/` (الـ redirect عبر `src/routes/index.tsx` يبقى كما هو للـ preview داخل Lovable).

## بعد التطبيق

يكفي رفع المشروع لـ Netlify (Import from Git أو Deploy manually) وسيقرأ `netlify.toml` تلقائياً. الصفحة الرئيسية ستكون:
```
https://<site>.netlify.app/         →  /app/index.html
https://<site>.netlify.app/app/cart/ →  /app/cart/index.html
```
وكل الأصول والروابط الداخلية ستعمل بدون تغيير.
