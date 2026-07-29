# Section-Based Homepage Builder — Foundation (Phase 1)

هدف هاي الجولة: نبني **الأساس المتين** اللي كل الميزات الجاية (theme editor, media library, per-device, animations, version diff...) بتُبنى فوقه. مش رح نبني كل شي دفعة وحدة — بس بعد هاي المرحلة، إضافة أي قسم جديد بتصير جولة وحدة صغيرة.

## المخرجات النهائية لهاي الجولة

بعد ما نخلص، رح تقدر:
1. تفتح `/admin/home` وتشوف الصفحة الرئيسية كسلسلة **بلوكات** مستقلة (Hero, Announcement, Carousel, Categories, Bestsellers, Reviews, FAQ, Newsletter).
2. **تسحب وتُفلت** لإعادة ترتيبها.
3. **تفعّل/تعطّل** أي قسم بضغطة زر.
4. **تحذف** قسم أو **تضيف** قسم جديد من مكتبة الأقسام.
5. تعدّل محتوى أي قسم في panel جانبي، والتغيير يظهر **فوراً** في preview مباشر جنب المحرر (بدون refresh).
6. Save يخزّن snapshot في `home_settings_history` (موجود أصلاً) → Undo عبر "استعادة".
7. الصفحة الرئيسية العامة (`src/routes/index.tsx`) بتقرأ نفس الـ schema وترسم بنفس الترتيب.

## البنية (Technical)

### 1. Schema واحد يحكم كل شي
مفتاح جديد في `site_settings`:
```
home_layout: {
  version: 1,
  sections: [
    { id: "uuid", type: "hero", enabled: true, data: {...} },
    { id: "uuid", type: "carousel", enabled: true, data: {...} },
    { id: "uuid", type: "categories", enabled: true, data: {...} },
    ...
  ]
}
```
- كل section له `type` و`data` مستقل.
- الترتيب في المصفوفة = الترتيب في الصفحة.
- سهل إضافة نوع جديد لاحقاً بدون كسر الموجود.

### 2. Section Registry (`src/lib/gx/sections/`)
ملف مركزي يعرّف كل نوع section بـ 3 أشياء:
```
{
  type: "hero",
  label: "Hero Banner",
  icon: <Sparkles/>,
  defaultData: {...},
  Renderer: HeroRenderer,   // بيرسم في الصفحة العامة
  Editor: HeroEditor,       // بيرسم في panel التحرير
}
```
هاد اللي بيخلي الـ architecture **modular**: إضافة قسم جديد = ملف واحد جديد.

### 3. الأقسام المدعومة في Phase 1
- **Hero** — نفس الحقول الحالية (badge, title 3 أجزاء, subtitle, صورة, زرين)
- **Announcement Bar** — نص + رابط + لون خلفية (جديد)
- **Carousel** — نفس الموجود (slides مع صور desktop)
- **Categories** — grid الأقسام (overrides الموجودة)
- **Bestsellers** — مع pinned + auto-sort (موجود)
- **Reviews** — التستيمونيالز (تحويلها من hardcode لـ DB)
- **FAQ** — أسئلة/أجوبة (جديد)
- **Newsletter** — عنوان + subtitle + input بريد (UI فقط في هاي الجولة)

كل واحد Editor بسيط في Phase 1 (نص + صور + toggle). التوسع لـ styling/typography/animations/responsive بيجي بمراحل لاحقة.

### 4. صفحة `/admin/home` الجديدة (Split Layout)
```text
┌────────────────────────┬──────────────────────────┐
│ Sections List          │  Live Preview            │
│ [≡] Hero          [👁] │  ┌────────────────────┐ │
│ [≡] Announcement  [👁] │  │   Hero renders     │ │
│ [≡] Carousel      [👁] │  │   Announcement     │ │
│ [≡] Categories    [👁] │  │   Carousel         │ │
│ [≡] Bestsellers   [👁] │  │   ...              │ │
│ [+ Add Section]        │  └────────────────────┘ │
└────────────────────────┴──────────────────────────┘
  ↑ اضغط على أي section → panel التحرير يفتح على اليمين
```
- سحب وإفلات: `@dnd-kit/sortable` (installed).
- Live preview: نفس الـ Renderer components، بتاخذ draft state.
- Save = يحفظ draft في `site_settings.home_layout` + snapshot في history.

### 5. تحديث `src/routes/index.tsx`
- تبقى معظم المكونات الحالية بس نغلّفها في Section Renderers.
- يقرأ `home_layout` من `useSiteSettings()`، ويرسم بالترتيب.
- إذا مافي `home_layout` (fallback): يرسم الأقسام القديمة بترتيبها الحالي.

## اللي **مش** في هاي الجولة (بمراحل لاحقة)
- Theme Editor (ألوان/خطوط عامة)
- Media Library
- Per-device editing (desktop/tablet/mobile مستقل)
- Typography/spacing/animations لكل قسم
- Draft/Preview/Publish workflow (حالياً: كل save = live)
- Autosave (حالياً: save يدوي)
- Undo/Redo داخل الجلسة (History موجود عبر snapshots، بس مش undo فوري)
- Scheduled publishing للـ carousel slides

## Migration
مفتاح واحد جديد في `site_settings`:
```sql
INSERT INTO site_settings(key,value) VALUES ('home_layout', '{...default sections...}');
```

## ملاحظة صريحة
حتى بعد Phase 1 هاي، لسا بعيدين عن Shopify/Webflow (اللي كل واحد فيهم فريق سنين). بس هاد الأساس بيخليك **تدير كل قسم** بدون كود، ويسمحلي أضيف أي feature لاحقاً بجهد معقول.

هل نبدأ بهاي الخطة؟
