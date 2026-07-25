
# خطة العمل: نظام مستخدمين + Admin Dashboard لمتجر GX

الموقع حالياً static HTML بمجلد `public/app/`. الخطة تبني طبقة تفاعلية جديدة داخل TanStack Start (React) للـ Auth والـ Dashboard، وتبقي المتجر الحالي زي ما هو، بس تربطه بقاعدة البيانات لتسجيل الطلبات.

---

## المرحلة 1: تفعيل Lovable Cloud وقاعدة البيانات

سنفعّل Lovable Cloud (يعطينا Database + Auth + Storage جاهزين).

### الجداول اللي رح ننشئها:

**1. `profiles`** — بيانات المستخدم
- `id` (uuid, FK → auth.users)
- `full_name` (text)
- `email` (text)
- `avatar_url` (text)
- `xp` (int, default 0) — نقاط الخبرة
- `level` (int, default 1) — المستوى
- `total_spent` (numeric, default 0) — إجمالي المشتريات
- `created_at`, `updated_at`

**2. `user_roles`** — الصلاحيات (جدول منفصل لسبب أمني)
- `id`, `user_id`, `role` (enum: `admin`, `user`)

**3. `orders`** — الطلبات
- `id` (uuid)
- `order_number` (text unique) — رقم مميز مثل `GX-2026-000123`
- `user_id` (nullable — يدعم الطلبات بدون تسجيل)
- `customer_name`, `customer_whatsapp`
- `items` (jsonb) — تفاصيل المنتجات
- `total_jod` (numeric)
- `currency_snapshot` (text)
- `status` (enum: `pending`, `paid`, `processing`, `delivered`, `cancelled`)
- `admin_notes` (text) — ملاحظات الأدمن
- `delivery_data` (jsonb) — الأكواد/الحسابات اللي بيسلمها الأدمن للزبون
- `xp_awarded` (int)
- `created_at`, `updated_at`

**4. `mission_rewards`** (اختياري لنظام XP لاحقاً)
- سنجهّز البنية بس نأجل التفاصيل لطلب لاحق.

### الأمان (RLS):
- المستخدم يشوف بروفايله وطلباته فقط.
- الأدمن يشوف كل شي (عبر `has_role()` security definer function).
- إنشاء الطلب مسموح بدون تسجيل (guest orders).

---

## المرحلة 2: صفحات Auth

سننشئ داخل `src/routes/`:

- `/auth` — صفحة موحّدة (تسجيل دخول + تسجيل جديد بتبويبات)
  - إيميل + كلمة سر
  - زر "الدخول بجوجل"
- `/auth/reset-password` — استرجاع كلمة السر
- Auto-create profile عبر trigger عند التسجيل

الصفحات تكون بنفس هوية المتجر (RTL، عربي، ألوان الموقع).

---

## المرحلة 3: ربط المتجر الحالي بالنظام

سنعدّل `public/app/assets/js/cart.js` بحيث زر "إتمام الطلب" يعمل:

1. يولّد `order_number` فريد (GX-YYYY-NNNNNN).
2. يحفظ الطلب في `orders` عبر Supabase JS client (نضيف `<script>` في الـ HTML pages).
3. إذا المستخدم مسجّل دخول → يربط الطلب بحسابه.
4. يفتح واتساب بنفس الرسالة الحالية + إضافة رقم الطلب في الأعلى.
5. إشارة صغيرة بالنافبار: إذا مسجّل دخول تظهر أيقونة حساب، وإلا زر "دخول".

سنضيف صفحة `/app/account/index.html` (أو route جديد داخل React):
- بياناتي (اسم، إيميل، XP، Level)
- سجل الطلبات مع الحالة والأكواد المسلّمة

---

## المرحلة 4: Admin Dashboard

Route جديد `/admin` داخل React (محمي عبر `_authenticated/_admin/`)، بيتفحّص `has_role('admin')` قبل الدخول.

### الأقسام:

**A. Overview** (`/admin`)
- إجمالي الطلبات، المبيعات (JOD)، عدد المستخدمين
- Chart بسيط لطلبات آخر 30 يوم

**B. Orders** (`/admin/orders`)
- جدول بكل الطلبات (بحث برقم الطلب، فلترة بالحالة)
- نقرة على طلب → تفاصيل كاملة
- تحديث الحالة (pending → paid → delivered)
- إضافة `delivery_data` (الأكواد/يوزر وباسورد) — بيظهر للزبون بسجل طلباته
- ملاحظات داخلية للأدمن

**C. Products** (`/admin/products`)
- **ملاحظة مهمة:** حالياً المنتجات في `products-data.js` كملف ثابت. لتفعيل التعديل من الداشبورد، بدنا ننقلها لجدول `products` بقاعدة البيانات. هاد شغل كبير رح نأجّله لطلب لاحق ونركّز الآن على Orders + Users. لو بدك نبدأ فيه هلأ خبّرني.

**D. Users** (`/admin/users`)
- جدول بكل المستخدمين
- تعديل XP يدوياً، منح شارات
- منح/سحب صلاحية admin

---

## المرحلة 5: نظام XP والمكافآت (بنية أساسية فقط الآن)

- كل طلب مكتمل (`delivered`) → +XP حسب `total_jod` (مثلاً 10 XP لكل دينار).
- ترقية Level تلقائية (Level = floor(sqrt(xp/100))).
- عرض XP وLevel بالبروفايل + progress bar.
- تفاصيل المكافآت (كوبونات، منتجات مجانية) نتفق عليها بطلب منفصل بعد ما نشوف النظام شغّال.

---

## التسلسل التنفيذي (كل مرحلة رح أنفذها لحالها وأعرضها عليك):

1. ✅ تفعيل Lovable Cloud + إنشاء الجداول والـ RLS
2. ✅ صفحة `/auth` بإيميل + جوجل + profile trigger
3. ✅ ربط cart.js بحفظ الطلبات + رقم طلب فريد + صفحة حسابي وسجل الطلبات
4. ✅ Admin Dashboard (Overview + Orders + Users)
5. ⏸️ إدارة المنتجات من الداشبورد (لاحقاً باتفاق منفصل)
6. ⏸️ تفاصيل نظام XP والمكافآت (لاحقاً)

---

## تفاصيل تقنية

- **Stack:** TanStack Start (موجود) + Supabase JS للمتجر الـ static.
- **الأدمن الأول:** بعد ما تسجّل دخول أول مرة بإيميلك، رح أعطيك SQL query تشغّلها مرة وحدة لتحويل حسابك لـ admin.
- **رقم الطلب الفريد:** Postgres sequence + trigger يضمن عدم التكرار.
- **الوصول للـ Google Sign-in:** بيتطلب إعداد بسيط بلوحة Cloud بعد التفعيل (رح أرشدك خطوة بخطوة).

---

**جاهز نبدأ بالمرحلة 1 (تفعيل Cloud + الجداول)؟ اضغط "Approve plan".**
