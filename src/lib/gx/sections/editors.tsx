// Per-section editors. Each takes typed `data` + `onChange` and renders
// the config panel for the admin builder. Keep them content-focused for
// Phase 1 — styling/animations/responsive editors come in later phases.

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Plus, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { CATEGORY_LINKS, getFeaturedItems } from "@/data/products";
import { MediaPicker } from "./media-library";
import { RichTextField } from "./rich-text";
import type {
  HeroData, AnnouncementData, CarouselData, CarouselSlide, CategoriesData,
  BestsellersData, ProductsData, TrustData, ReviewsData, ReviewItem, FaqData, FaqItem, NewsletterData, CategoryOverride,
} from "./types";


async function uploadTo(folder: string, file: File): Promise<string | null> {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("home-assets").upload(path, file, { upsert: true, contentType: file.type });
  if (error) { toast.error(error.message); return null; }
  const { data } = await supabase.storage.from("home-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  return data?.signedUrl ?? null;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-slate-100 text-xs">{label}</Label>
      <Input value={value ?? ""} placeholder={placeholder ?? "افتراضي"} onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" />
    </div>
  );
}

/* ---------------- HERO ---------------- */
export function HeroEditor({ data, onChange }: { data: HeroData; onChange: (d: HeroData) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="الشارة" value={data.badge} onChange={(v) => onChange({ ...data, badge: v })} />
        <TextField label="السطر الأول" value={data.title_a} onChange={(v) => onChange({ ...data, title_a: v })} />
        <TextField label="السطر الثاني (مميز)" value={data.title_b} onChange={(v) => onChange({ ...data, title_b: v })} />
        <TextField label="السطر الثالث" value={data.title_c} onChange={(v) => onChange({ ...data, title_c: v })} />
      </div>
      <RichTextField label="الوصف" value={data.subtitle ?? ""} onChange={(v) => onChange({ ...data, subtitle: v || null })} rows={2} />

      <div className="grid grid-cols-2 gap-2">
        <TextField label="زر أساسي — نص" value={data.cta_primary_text} onChange={(v) => onChange({ ...data, cta_primary_text: v })} />
        <TextField label="زر أساسي — رابط" value={data.cta_primary_link} onChange={(v) => onChange({ ...data, cta_primary_link: v })} placeholder="#products" />
        <TextField label="زر ثانوي — نص" value={data.cta_secondary_text} onChange={(v) => onChange({ ...data, cta_secondary_text: v })} />
        <TextField label="زر ثانوي — رابط" value={data.cta_secondary_link} onChange={(v) => onChange({ ...data, cta_secondary_link: v })} placeholder="#categories" />
      </div>
      <div>
        <Label className="text-slate-100 text-xs">صورة الهيرو</Label>
        <div className="mt-2">
          <MediaPicker folder="hero" value={data.image_url}
            onPick={(url) => onChange({ ...data, image_url: url })} label="من المكتبة" />
        </div>
      </div>
    </div>
  );
}


/* ---------------- ANNOUNCEMENT ---------------- */
export function AnnouncementEditor({ data, onChange }: { data: AnnouncementData; onChange: (d: AnnouncementData) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-slate-100 text-xs">النص</Label>
        <Input value={data.text ?? ""} onChange={(e) => onChange({ ...data, text: e.target.value })}
          className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" placeholder="مثال: شحن مجاني لكل الطلبات هذا الأسبوع" />
      </div>
      <TextField label="رابط (اختياري)" value={data.link ?? null} onChange={(v) => onChange({ ...data, link: v ?? "" })} placeholder="/promo" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-slate-100 text-xs">لون الخلفية</Label>
          <Input type="color" value={data.bg || "#0f172a"} onChange={(e) => onChange({ ...data, bg: e.target.value })}
            className="mt-1 bg-slate-950/60 border-slate-800 h-10" />
        </div>
        <div>
          <Label className="text-slate-100 text-xs">لون النص</Label>
          <Input type="color" value={data.color || "#ffffff"} onChange={(e) => onChange({ ...data, color: e.target.value })}
            className="mt-1 bg-slate-950/60 border-slate-800 h-10" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- CAROUSEL ---------------- */
export function CarouselEditor({ data, onChange }: { data: CarouselData; onChange: (d: CarouselData) => void }) {
  const items = data.items || [];
  function add() { onChange({ ...data, items: [...items, { id: crypto.randomUUID(), image_url: "", title: "", subtitle: "", link: "" }] }); }
  function remove(id: string) { onChange({ ...data, items: items.filter((b) => b.id !== id) }); }
  function update(id: string, patch: Partial<CarouselSlide>) { onChange({ ...data, items: items.map((b) => b.id === id ? { ...b, ...patch } : b) }); }
  function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex((b) => b.id === id); const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ ...data, items: next });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <Label className="text-slate-100 text-xs">تشغيل تلقائي</Label>
          <Switch checked={data.autoplay ?? true} onCheckedChange={(v) => onChange({ ...data, autoplay: v })} />
        </div>
        <div>
          <Label className="text-slate-100 text-xs">مدة الشريحة (ms)</Label>
          <Input type="number" min={2000} step={500} value={data.interval_ms ?? 5000}
            onChange={(e) => onChange({ ...data, interval_ms: Math.max(2000, Number(e.target.value) || 5000) })}
            className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100 h-9" />
        </div>
      </div>
      <div className="space-y-2">
        {items.map((b, i) => (
          <div key={b.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-20 h-12 rounded-md overflow-hidden bg-slate-900 grid place-items-center border border-slate-800 shrink-0">
                {b.image_url ? <img src={b.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-600" />}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Input placeholder="العنوان" value={b.title ?? ""} onChange={(e) => update(b.id, { title: e.target.value })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
                <Input placeholder="الرابط" value={b.link ?? ""} onChange={(e) => update(b.id, { link: e.target.value })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <MediaPicker compact folder="banners" value={b.image_url}
                  onPick={(url) => update(b.id, { image_url: url || "" })} />
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(b.id, -1)} disabled={i === 0}><ArrowUp size={10} /></Button>
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(b.id, 1)} disabled={i === items.length - 1}><ArrowDown size={10} /></Button>
                  <Button size="sm" variant="destructive" className="h-6 w-6 p-0" onClick={() => remove(b.id)}><Trash2 size={10} /></Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
              <div>
                <Label className="text-[10px] text-slate-400">صورة التابلت (اختياري)</Label>
                <MediaPicker compact folder="banners" value={b.image_url_tablet ?? ""}
                  onPick={(url) => update(b.id, { image_url_tablet: url || null })} />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">صورة الجوال (اختياري)</Label>
                <MediaPicker compact folder="banners" value={b.image_url_mobile ?? ""}
                  onPick={(url) => update(b.id, { image_url_mobile: url || null })} />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">يبدأ (اختياري)</Label>
                <Input type="datetime-local" value={b.starts_at ? b.starts_at.slice(0, 16) : ""}
                  onChange={(e) => update(b.id, { starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">ينتهي (اختياري)</Label>
                <Input type="datetime-local" value={b.ends_at ? b.ends_at.slice(0, 16) : ""}
                  onChange={(e) => update(b.id, { ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-md bg-slate-950/40 border border-slate-800 px-2 py-1">
                <Label className="text-[10px] text-slate-300">مفعّل</Label>
                <Switch checked={b.enabled !== false} onCheckedChange={(v) => update(b.id, { enabled: v })} />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={add} className="w-full border-dashed border-slate-700 text-slate-300 hover:bg-slate-800/50 h-9">
          <Plus size={13} className="ms-2" /> إضافة شريحة
        </Button>
      </div>
    </div>
  );
}


/* ---------------- CATEGORIES ---------------- */
export function CategoriesEditor({ data, onChange }: { data: CategoriesData; onChange: (d: CategoriesData) => void }) {
  const overrides = data.overrides || {};
  function update(slug: string, patch: Partial<CategoryOverride>) {
    onChange({ ...data, overrides: { ...overrides, [slug]: { ...(overrides[slug] || {}), ...patch } } });
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="العنوان" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} />
        <TextField label="النص العلوي" value={data.eyebrow ?? null} onChange={(v) => onChange({ ...data, eyebrow: v ?? undefined })} />
      </div>
      <div className="space-y-2">
        {CATEGORY_LINKS.map((c) => {
          const m = overrides[c.slug] || {};
          return (
            <div key={c.slug} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-md grid place-items-center" style={{ background: c.bg }}>{c.icon}</div>
                <div className="flex-1 text-slate-100 text-sm font-bold">{c.name}</div>
                <Switch checked={!m.hidden} onCheckedChange={(v) => update(c.slug, { hidden: !v })} />
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Input placeholder="اسم" value={m.name ?? ""} onChange={(e) => update(c.slug, { name: e.target.value || undefined })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
                <Input placeholder="وصف" value={m.desc ?? ""} onChange={(e) => update(c.slug, { desc: e.target.value || undefined })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
                <div className="flex gap-1">
                  <Input type="color" value={m.accent || c.accent} onChange={(e) => update(c.slug, { accent: e.target.value })}
                    className="bg-slate-900/60 border-slate-800 h-8 w-10 p-1" />
                  <Input type="number" placeholder="#" value={m.sort ?? ""} onChange={(e) => update(c.slug, { sort: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs w-14" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- BESTSELLERS ---------------- */
export function BestsellersEditor({ data, onChange }: { data: BestsellersData; onChange: (d: BestsellersData) => void }) {
  const items = getFeaturedItems();
  const order = data.order || [];
  const ordered = [
    ...order.map((id) => items.find((i) => i.cartId === id)).filter((x): x is typeof items[number] => !!x),
    ...items.filter((i) => !order.includes(i.cartId)),
  ];
  function move(id: string, dir: -1 | 1) {
    const ids = ordered.map((i) => i.cartId); const idx = ids.indexOf(id); const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    onChange({ ...data, order: ids });
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="العنوان" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} />
        <TextField label="النص العلوي" value={data.eyebrow ?? null} onChange={(v) => onChange({ ...data, eyebrow: v ?? undefined })} />
      </div>
      <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1">
        {ordered.map((it, i) => (
          <div key={it.cartId} className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-1.5">
            <div className="w-8 h-8 rounded-md grid place-items-center text-sm shrink-0" style={{ background: it.bg }}>{it.icon}</div>
            <div className="flex-1 min-w-0 text-slate-100 text-xs font-semibold truncate">{it.name}</div>
            <div className="flex gap-0.5">
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(it.cartId, -1)} disabled={i === 0}><ArrowUp size={10} /></Button>
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(it.cartId, 1)} disabled={i === ordered.length - 1}><ArrowDown size={10} /></Button>
            </div>
          </div>
        ))}
      </div>
      {order.length > 0 && <Button size="sm" variant="outline" className="w-full border-slate-700 text-slate-300" onClick={() => onChange({ ...data, order: [] })}>ترتيب افتراضي</Button>}
    </div>
  );
}

/* ---------------- TRUST ---------------- */
export function TrustEditor({ data, onChange }: { data: TrustData; onChange: (d: TrustData) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="⚡ عنوان" value={data.instant_title ?? null} onChange={(v) => onChange({ ...data, instant_title: v ?? undefined })} />
        <TextField label="⚡ وصف" value={data.instant_desc ?? null} onChange={(v) => onChange({ ...data, instant_desc: v ?? undefined })} />
        <div>
          <Label className="text-slate-100 text-xs">🛒 هدف العداد</Label>
          <Input type="number" min={0} value={data.stat_target ?? 2000} onChange={(e) => onChange({ ...data, stat_target: Number(e.target.value) || 2000 })}
            className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" />
        </div>
        <TextField label="🛒 وصف العداد" value={data.stat_desc ?? null} onChange={(v) => onChange({ ...data, stat_desc: v ?? undefined })} />
        <TextField label="💬 عنوان" value={data.support_title ?? null} onChange={(v) => onChange({ ...data, support_title: v ?? undefined })} />
        <TextField label="💬 وصف" value={data.support_desc ?? null} onChange={(v) => onChange({ ...data, support_desc: v ?? undefined })} />
      </div>
    </div>
  );
}

/* ---------------- REVIEWS ---------------- */
export function ReviewsEditor({ data, onChange }: { data: ReviewsData; onChange: (d: ReviewsData) => void }) {
  const items = data.items || [];
  function add() { onChange({ ...data, items: [...items, { id: crypto.randomUUID(), name: "", initial: "؟", color: "linear-gradient(135deg,#00e5ff,#0a6e8c)", quote_ar: "" }] }); }
  function update(id: string, patch: Partial<ReviewItem>) { onChange({ ...data, items: items.map((r) => r.id === id ? { ...r, ...patch } : r) }); }
  function remove(id: string) { onChange({ ...data, items: items.filter((r) => r.id !== id) }); }
  const source = data.source ?? "auto";
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="العنوان" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} />
        <TextField label="النص العلوي" value={data.eyebrow ?? null} onChange={(v) => onChange({ ...data, eyebrow: v ?? undefined })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant={source === "auto" ? "default" : "outline"} onClick={() => onChange({ ...data, source: "auto" })}>
          مراجعات العملاء (تلقائي)
        </Button>
        <Button size="sm" variant={source === "manual" ? "default" : "outline"} onClick={() => onChange({ ...data, source: "manual" })}>
          مراجعات يدوية
        </Button>
      </div>
      {source === "auto" && (
        <div className="text-[11px] text-slate-400 leading-relaxed">
          يعرض تلقائياً المراجعات المعتمَدة من لوحة التحكم (4 نجوم فأكثر). تحكّم بها من صفحة «المراجعات».
        </div>
      )}
      {items.length === 0 && source === "manual" && <div className="text-xs text-slate-500 text-center py-3">(يستخدم قائمة افتراضية — أضف مراجعات لتخصيصها)</div>}
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {items.map((r) => (
          <div key={r.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 space-y-1">
            <div className="flex gap-1">
              <Input placeholder="الاسم" value={r.name} onChange={(e) => update(r.id, { name: e.target.value, initial: (e.target.value[0] || "؟").toUpperCase() })}
                className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
              <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => remove(r.id)}><Trash2 size={11} /></Button>
            </div>
            <Input placeholder="نص المراجعة (اختياري)" value={r.quote_ar ?? ""} onChange={(e) => update(r.id, { quote_ar: e.target.value })}
              className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={add} className="w-full border-dashed border-slate-700 text-slate-300"><Plus size={12} className="ms-1" /> إضافة مراجعة</Button>
    </div>
  );
}

/* ---------------- FAQ ---------------- */
export function FaqEditor({ data, onChange }: { data: FaqData; onChange: (d: FaqData) => void }) {
  const items = data.items || [];
  function add() { onChange({ ...data, items: [...items, { id: crypto.randomUUID(), q: "", a: "" }] }); }
  function update(id: string, patch: Partial<FaqItem>) { onChange({ ...data, items: items.map((f) => f.id === id ? { ...f, ...patch } : f) }); }
  function remove(id: string) { onChange({ ...data, items: items.filter((f) => f.id !== id) }); }
  return (
    <div className="space-y-2">
      <TextField label="عنوان القسم" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} placeholder="الأسئلة الشائعة" />
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {items.map((f) => (
          <div key={f.id} className="rounded-md border border-slate-800 bg-slate-950/40 p-2 space-y-1">
            <div className="flex gap-1">
              <Input placeholder="السؤال" value={f.q} onChange={(e) => update(f.id, { q: e.target.value })}
                className="bg-slate-900/60 border-slate-800 text-slate-100 h-8 text-xs" />
              <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => remove(f.id)}><Trash2 size={11} /></Button>
            </div>
            <RichTextField label="الجواب" value={f.a} onChange={(v) => update(f.id, { a: v })} rows={2} />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={add} className="w-full border-dashed border-slate-700 text-slate-300"><Plus size={12} className="ms-1" /> إضافة سؤال</Button>
    </div>
  );
}

/* ---------------- NEWSLETTER ---------------- */
export function NewsletterEditor({ data, onChange }: { data: NewsletterData; onChange: (d: NewsletterData) => void }) {
  return (
    <div className="space-y-2">
      <TextField label="العنوان" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} />
      <RichTextField label="الوصف" value={data.subtitle ?? ""} onChange={(v) => onChange({ ...data, subtitle: v })} />
      <TextField label="نص الزر" value={data.cta ?? null} onChange={(v) => onChange({ ...data, cta: v ?? undefined })} />
      <TextField label="النص التوضيحي داخل الحقل" value={data.placeholder ?? null} onChange={(v) => onChange({ ...data, placeholder: v ?? undefined })} />
    </div>
  );
}

/* ---------------- PRODUCTS (custom pick) ---------------- */
export function ProductsEditor({ data, onChange }: { data: ProductsData; onChange: (d: ProductsData) => void }) {
  const all = getFeaturedItems();
  const ids = data.ids || [];
  const chosen = ids.map((id) => all.find((i) => i.cartId === id)).filter((x): x is typeof all[number] => !!x);
  const rest = all.filter((i) => !ids.includes(i.cartId));
  function move(id: string, dir: -1 | 1) {
    const next = [...ids]; const idx = next.indexOf(id); const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ ...data, ids: next });
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="العنوان" value={data.title ?? null} onChange={(v) => onChange({ ...data, title: v ?? undefined })} />
        <TextField label="النص العلوي" value={data.eyebrow ?? null} onChange={(v) => onChange({ ...data, eyebrow: v ?? undefined })} />
      </div>

      <Label className="text-xs text-slate-400">المنتجات المختارة ({chosen.length})</Label>
      <div className="space-y-1">
        {chosen.length === 0 && <div className="text-[11px] text-slate-500">لم تختر أي منتج بعد — أضف من القائمة بالأسفل.</div>}
        {chosen.map((it, i) => (
          <div key={it.cartId} className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-1.5">
            <div className="w-8 h-8 rounded-md grid place-items-center text-sm shrink-0" style={{ background: it.bg }}>{it.icon}</div>
            <div className="flex-1 min-w-0 text-slate-100 text-xs font-semibold truncate">{it.name}</div>
            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(it.cartId, -1)} disabled={i === 0}><ArrowUp size={10} /></Button>
            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => move(it.cartId, 1)} disabled={i === chosen.length - 1}><ArrowDown size={10} /></Button>
            <Button size="sm" variant="destructive" className="h-6 w-6 p-0"
              onClick={() => onChange({ ...data, ids: ids.filter((x) => x !== it.cartId) })}><Trash2 size={10} /></Button>
          </div>
        ))}
      </div>

      <Label className="text-xs text-slate-400">إضافة منتج</Label>
      <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1">
        {rest.map((it) => (
          <button key={it.cartId} onClick={() => onChange({ ...data, ids: [...ids, it.cartId] })}
            className="w-full flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/40 p-1.5 text-start hover:border-cyan-600">
            <div className="w-7 h-7 rounded-md grid place-items-center text-xs shrink-0" style={{ background: it.bg }}>{it.icon}</div>
            <div className="flex-1 min-w-0 text-slate-200 text-xs truncate">{it.name}</div>
            <Plus size={12} className="text-cyan-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
