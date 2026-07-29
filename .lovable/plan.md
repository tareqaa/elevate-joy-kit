# خطة التنفيذ

## 1. نظام الكوبونات (Coupons)

### قاعدة البيانات
جدول `coupons`:
- `code` (unique, uppercase)
- `discount_type`: `percent` أو `fixed`
- `discount_value` (نسبة 1-100 أو مبلغ JOD)
- `max_discount_jod` (سقف اختياري للنسبة)
- `min_order_jod` (حد أدنى للطلب)
- `expires_at` (تاريخ انتهاء اختياري)
- `usage_limit` (عدد استخدامات إجمالي، اختياري)
- `usage_count` (تلقائي)
- `per_user_limit` (كم مرة يستخدمه نفس المستخدم، مثلاً 1 = مرة واحدة فقط)
- `applies_to`: `all` أو `products` أو `categories`
- `product_ids` (uuid[])
- `category_ids` (uuid[])
- `is_active`

جدول `coupon_redemptions`: (coupon_id, user_id, order_id, discount_jod) لتتبع الاستخدام ومنع التكرار.

دالة `validate_and_apply_coupon(code, cart_items, user_id, total)` → ترجع الخصم أو خطأ.

### بانل الأدمن
صفحة `/admin/coupons`: جدول + نموذج إنشاء/تعديل بكل الخيارات أعلاه، وقائمة اختيار منتجات/أقسام.

### السلة
حقل "أدخل كود الكوبون" مع زر "تطبيق". عند النجاح يظهر سطر الخصم قبل الإجمالي، ويُخزن في بيانات الطلب.

## 2. حقول التواصل الإلزامية عند الشراء

في السلة قبل "إتمام الطلب":
- **الاسم** (موجود)
- **رمز الدولة + رقم الواتساب/تيليجرام** — قائمة رموز دول (+962، +966، +971…) + input للرقم
- **نوع التواصل**: WhatsApp / Telegram (radio)

الحقول إلزامية. تُخزن في `orders.customer_whatsapp` (كامل مع رمز الدولة) و `orders.delivery_data.contact_type`.

## 3. تحسين عرض الطلبات في الأدمن

في `/admin/orders`:
- **حجم الكرت**: طلبات > 3 منتجات أو > 50 JOD تظهر بكرت أكبر مميز (badge "طلب كبير").
- **معلومات الرأس**: رقم الطلب + العملة + عدد المنتجات + المبلغ + بادج نوع التواصل (📱 واتساب / ✈️ تيليجرام).
- **موقع العميل**: عرض الدولة (من عملة الطلب أو IP إن توفر).
- **قائمة منتجات مرتبة**: جدول واضح بأيقونة، اسم، كمية، سعر، مجموع الصف.
- زر نسخ رقم التواصل مباشرة.

## تفاصيل تقنية

- Migration واحدة تنشئ الجدولين + RLS + GRANTs + دوال التحقق.
- ملفات جديدة:
  - `src/routes/_authenticated/admin/coupons.tsx`
  - `src/lib/gx/coupons.functions.ts` (تحقق وتطبيق)
  - `src/components/gx/CouponField.tsx` (في السلة)
  - `src/components/gx/CheckoutContactFields.tsx`
- تعديلات:
  - `src/routes/cart.tsx` — إضافة الحقول والكوبون
  - `src/lib/gx/cart.tsx` — تمرير الكوبون والاتصال للـ server fn
  - `src/lib/gx/orders.functions.ts` + `orders.server.ts` — validation + خصم + تسجيل استخدام
  - `src/routes/_authenticated/admin/orders.tsx` — تخطيط جديد
  - `src/routes/_authenticated/admin.tsx` — إضافة رابط Coupons في السايدبار

الأسماء والنصوص موحدة بالعربي في كل المتجر والبانل.

هل أبدأ التنفيذ؟
