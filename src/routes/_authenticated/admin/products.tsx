import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingBag, Plus, Pencil, Trash2, Eye, EyeOff, Star, Search, Layers, Globe } from "lucide-react";
import { CatalogPrices } from "@/components/gx/admin/CatalogPrices";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "المنتجات — لوحة التحكم" }] }),
  component: ProductsAdmin,
});

type Category = { id: string; name_ar: string; name_en: string };
type Product = {
  id: string; category_id: string | null; slug: string; sku: string | null;
  name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  image_url: string | null; base_price_jod: number | null;
  badge: string | null; purchases_count: number;
  is_featured: boolean; is_active: boolean; sort_order: number;
};
type Variant = {
  id: string; product_id: string; label_ar: string; label_en: string;
  price_jod: number; face_value: number | null; face_currency: string | null;
  is_active: boolean; sort_order: number;
};
type CountryPrice = {
  id: string; variant_id: string; country_code: string; currency: string;
  price_local: number; price_jod: number | null;
};

const css = `
.gx-prod{color:#e6f7ff}
.gx-panel{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.92));border:1px solid rgba(0,229,255,.14);border-radius:18px}
.gx-stat{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06)}
.gx-stat b{font-size:18px;color:#e6f7ff;line-height:1}
.gx-stat span{font-size:11.5px;color:#7d92a8}
.gx-tab{padding:9px 16px;border-radius:12px;font-size:13px;font-weight:800;border:1px solid rgba(255,255,255,.08);color:#7d92a8;background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.gx-tab.on{background:rgba(0,229,255,.13);border-color:rgba(0,229,255,.4);color:#8fe9ff}
.gx-prod-card{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.12);border-radius:16px;padding:14px;transition:all .2s;position:relative;display:flex;gap:12px;align-items:flex-start}
.gx-prod-card:hover{border-color:rgba(0,229,255,.35);box-shadow:0 8px 24px rgba(0,229,255,.1)}
.gx-prod-card.off{opacity:.55}
.gx-prod-img{width:64px;height:64px;flex-shrink:0;border-radius:12px;background:rgba(0,229,255,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,229,255,.15)}
.gx-prod-img img{width:100%;height:100%;object-fit:cover}
.gx-prod-body{flex:1;min-width:0}
.gx-prod-name{font-size:14.5px;font-weight:800;color:#e6f7ff;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.gx-prod-en{font-size:11.5px;color:#7d92a8;margin-top:2px}
.gx-prod-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;color:#a3b6c9}
.gx-pill{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:3px 8px}
.gx-prod-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)}
.gx-badge-featured{background:linear-gradient(135deg,#ffd54f,#ff9800);color:#001018;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800}
.gx-badge-off{background:rgba(255,80,80,.15);color:#ff8080;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;border:1px solid rgba(255,80,80,.3)}
.gx-badge-custom{background:linear-gradient(135deg,#a259ff,#00e5ff);color:#001018;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800}
.gx-price{color:#00e5ff;font-family:ui-monospace,monospace;font-weight:800}
.gx-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid transparent}
.gx-btn.primary{background:linear-gradient(135deg,#00e5ff,#0091ff);color:#001018}
.gx-btn.primary:hover{box-shadow:0 4px 14px rgba(0,229,255,.35)}
.gx-btn.outline{border-color:rgba(0,229,255,.28);color:#00e5ff;background:transparent}
.gx-btn.outline:hover{background:rgba(0,229,255,.08)}
.gx-btn.danger{border-color:rgba(255,80,80,.35);color:#ff8080;background:transparent}
.gx-btn.danger:hover{background:rgba(255,80,80,.1)}
.gx-adm-input{background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,229,255,.18)!important;color:#e6f7ff!important;border-radius:12px!important;height:40px}
.gx-adm-input:focus-visible{outline:none;border-color:rgba(0,229,255,.55)!important;box-shadow:0 0 0 3px rgba(0,229,255,.15)!important}
.gx-fieldset{border:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.22);border-radius:14px;padding:14px}
.gx-fieldset>legend,.gx-fs-title{font-size:11.5px;font-weight:800;color:#8fe9ff;letter-spacing:.3px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
.gx-variant{background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.15);border-radius:10px;padding:10px;margin-bottom:8px}
.gx-country{background:rgba(0,0,0,.3);border:1px dashed rgba(0,229,255,.2);border-radius:8px;padding:8px;font-size:12px}
.gx-prod-card.sel{border-color:rgba(0,229,255,.55);box-shadow:0 0 0 2px rgba(0,229,255,.18)}
.gx-check{width:17px;height:17px;accent-color:#00e5ff;cursor:pointer;margin-top:2px}
.gx-bulk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;border-radius:14px;background:linear-gradient(90deg,rgba(0,229,255,.12),rgba(162,89,255,.08));border:1px solid rgba(0,229,255,.3)}
.gx-chip{padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,.08);color:#7d92a8;background:transparent;cursor:pointer}
.gx-chip.on{background:rgba(0,229,255,.13);border-color:rgba(0,229,255,.4);color:#8fe9ff}
.gx-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.gx-row:hover{background:rgba(0,229,255,.04)}
.gx-skel{height:92px;border-radius:16px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09),rgba(255,255,255,.04));background-size:200% 100%;animation:gxsk 1.2s infinite}
@keyframes gxsk{0%{background-position:200% 0}100%{background-position:-200% 0}}
`;



const CURRENCIES = ["JOD", "USD", "EUR", "SAR", "AED", "TRY", "EGP", "KWD", "QAR", "OMR", "BHD"];
const COUNTRIES = ["US", "SA", "AE", "TR", "EG", "KW", "QA", "OM", "BH", "JO"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingVariants, setManagingVariants] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tab, setTab] = useState<"catalog" | "prices">("prices");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden" | "featured">("all");
  const [sortBy, setSortBy] = useState<"order" | "name" | "price" | "sales">("order");
  const [selected, setSelected] = useState<string[]>([]);

  const catsQ = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name_ar,name_en").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const prodsQ = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order").order("name_ar");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const variantCountQ = useQuery({
    queryKey: ["admin-variant-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("product_id");
      if (error) throw error;
      const m: Record<string, number> = {};
      (data ?? []).forEach((r: { product_id: string }) => { m[r.product_id] = (m[r.product_id] ?? 0) + 1; });
      return m;
    },
  });
  const variantCounts = variantCountQ.data ?? {};

  const categoriesMap = useMemo(() => {
    const m: Record<string, Category> = {};
    (catsQ.data ?? []).forEach((c) => { m[c.id] = c; });
    return m;
  }, [catsQ.data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = (prodsQ.data ?? []).filter((p) => {
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "hidden" && p.is_active) return false;
      if (statusFilter === "featured" && !p.is_featured) return false;
      if (!s) return true;
      return p.name_ar.toLowerCase().includes(s) || p.name_en.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s);
    });
    const sorted = [...list];
    if (sortBy === "name") sorted.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar"));
    else if (sortBy === "price") sorted.sort((a, b) => (Number(b.base_price_jod) || 0) - (Number(a.base_price_jod) || 0));
    else if (sortBy === "sales") sorted.sort((a, b) => (b.purchases_count || 0) - (a.purchases_count || 0));
    return sorted;
  }, [prodsQ.data, categoryFilter, search, statusFilter, sortBy]);


  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(patch as never).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم تطبيق التعديل"); setSelected([]); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); setSelected([]); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMut = useMutation({
    mutationFn: async ({ a, b }: { a: Product; b: Product }) => {
      const r1 = await supabase.from("products").update({ sort_order: b.sort_order } as never).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("products").update({ sort_order: a.sort_order } as never).eq("id", b.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function move(index: number, dir: -1 | 1) {
    const a = filtered[index];
    const b = filtered[index + dir];
    if (!a || !b) return;
    if (a.sort_order === b.sort_order) {
      toast.error("عدّل «ترتيب الظهور» يدوياً — الترتيب متطابق");
      return;
    }
    reorderMut.mutate({ a, b });
  }

  const toggleSel = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));


  const stats = useMemo(() => {
    const all = prodsQ.data ?? [];
    return {
      total: all.length,
      active: all.filter((p) => p.is_active).length,
      featured: all.filter((p) => p.is_featured).length,
      sales: all.reduce((n, p) => n + (p.purchases_count || 0), 0),
    };
  }, [prodsQ.data]);

  return (
    <div className="gx-prod space-y-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
            <ShoppingBag size={22} className="text-cyan-400" /> المنتجات
          </h1>
          <p className="text-sm text-cyan-100/60 mt-1">إدارة المنتجات وأسعار المتجر من مكان واحد</p>
        </div>
        {tab === "catalog" && (
          <button className="gx-btn primary" onClick={() => setCreating(true)}>
            <Plus size={14} /> منتج جديد
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gx-stat"><ShoppingBag size={18} className="text-cyan-400" /><div><b>{stats.total}</b><span className="block">إجمالي المنتجات</span></div></div>
        <div className="gx-stat"><Eye size={18} className="text-emerald-400" /><div><b>{stats.active}</b><span className="block">ظاهر للزبائن</span></div></div>
        <div className="gx-stat"><Star size={18} className="text-amber-400" /><div><b>{stats.featured}</b><span className="block">منتج مميّز</span></div></div>
        <div className="gx-stat"><Layers size={18} className="text-fuchsia-400" /><div><b>{stats.sales}</b><span className="block">عمليات شراء</span></div></div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className={`gx-tab ${tab === "catalog" ? "on" : ""}`} onClick={() => setTab("catalog")}>
          <ShoppingBag size={14} /> منتجات قاعدة البيانات
        </button>
        <button className={`gx-tab ${tab === "prices" ? "on" : ""}`} onClick={() => setTab("prices")}>
          <Layers size={14} /> أسعار المتجر الحيّة
        </button>
      </div>

      {tab === "prices" ? <CatalogPrices /> : (
      <div className="gx-panel p-4 space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none" />
          <Input placeholder="بحث بالاسم أو المعرّف أو رقم المنتج (SKU)" value={search} onChange={(e) => setSearch(e.target.value)} className="gx-adm-input ps-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="gx-adm-input w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأقسام</SelectItem>
            {(catsQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-cyan-100/60">{filtered.length} منتج</span>
      </div>

      {prodsQ.isLoading ? (
        <div className="text-center py-20 text-cyan-100/60">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-cyan-100/60">
          <ShoppingBag size={48} className="mx-auto opacity-30 mb-3" />
          <p>{(prodsQ.data ?? []).length === 0 ? "لا يوجد منتجات بعد. ابدأ بإضافة منتج أول." : "لا يوجد منتجات ضمن الفلاتر."}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className={`gx-prod-card ${p.is_active ? "" : "off"}`}>
              <div className="gx-prod-img">
                {p.image_url ? <img src={p.image_url} alt="" /> : <ShoppingBag size={26} className="text-cyan-400/50" />}
              </div>
              <div className="gx-prod-body">
                <div className="gx-prod-name">
                  {p.name_ar}
                  {p.is_featured && <span className="gx-badge-featured"><Star size={9} className="inline" /> مميّز</span>}
                  {p.badge && <span className="gx-badge-custom">{p.badge}</span>}
                  {!p.is_active && <span className="gx-badge-off">مخفي</span>}
                </div>
                <div className="gx-prod-en" dir="ltr" style={{ textAlign: "right" }}>{p.name_en}</div>
                <div className="gx-prod-meta">
                  <span
                    title="اضغط لنسخ المعرّف — استخدمه في الكوبونات"
                    onClick={() => { navigator.clipboard.writeText(p.slug); toast.success(`تم نسخ: ${p.slug}`); }}
                    style={{ cursor: "pointer", fontFamily: "ui-monospace,monospace", background: "rgba(0,229,255,.1)", color: "#00e5ff", padding: "3px 8px", borderRadius: 8, border: "1px solid rgba(0,229,255,.25)", fontWeight: 700 }}
                  >#{p.slug}</span>
                  {p.sku && (
                    <span
                      title="رقم المنتج (SKU) — اضغط للنسخ"
                      onClick={() => { navigator.clipboard.writeText(p.sku!); toast.success(`تم نسخ: ${p.sku}`); }}
                      style={{ cursor: "pointer", fontFamily: "ui-monospace,monospace", background: "rgba(162,89,255,.12)", color: "#c7a4ff", padding: "3px 8px", borderRadius: 8, border: "1px solid rgba(162,89,255,.3)", fontWeight: 800 }}
                    >{p.sku}</span>
                  )}
                  <span className="gx-pill">{p.category_id ? categoriesMap[p.category_id]?.name_ar ?? "بدون قسم" : "بدون قسم"}</span>
                  {p.base_price_jod !== null && <span className="gx-pill gx-price">{Number(p.base_price_jod).toFixed(2)} د.أ</span>}
                  <span className="gx-pill">مشتريات: {p.purchases_count}</span>
                </div>
                <div className="gx-prod-actions">
                  <button className="gx-btn primary" onClick={() => setManagingVariants(p)}>
                    <Layers size={12} /> الخيارات والأسعار
                  </button>
                  <button className="gx-btn outline" onClick={() => setEditing(p)}><Pencil size={12} /> تعديل</button>
                  <button className="gx-btn outline" onClick={() => toggleMut.mutate({ id: p.id, patch: { is_featured: !p.is_featured } })} title="تمييز">
                    <Star size={12} className={p.is_featured ? "fill-cyan-400 text-cyan-400" : ""} />
                  </button>
                  <button className="gx-btn outline" onClick={() => toggleMut.mutate({ id: p.id, patch: { is_active: !p.is_active } })}>
                    {p.is_active ? <><Eye size={12} /> ظاهر</> : <><EyeOff size={12} /> مخفي</>}
                  </button>
                  <button className="gx-btn danger" onClick={() => { if (confirm(`حذف "${p.name_ar}"؟`)) deleteMut.mutate(p.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}


      {(editing || creating) && (
        <ProductDialog
          product={editing}
          categories={catsQ.data ?? []}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ["admin-products"] }); }}
        />
      )}

      {managingVariants && (
        <VariantsDialog
          product={managingVariants}
          onClose={() => setManagingVariants(null)}
        />
      )}
    </div>
  );
}

function ProductDialog({ product, categories, onClose, onSaved }: { product: Product | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [nameAr, setNameAr] = useState(product?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(product?.name_en ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.category_id ?? "");
  const [descAr, setDescAr] = useState(product?.description_ar ?? "");
  const [descEn, setDescEn] = useState(product?.description_en ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [basePrice, setBasePrice] = useState<string>(product?.base_price_jod?.toString() ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [sortOrder, setSortOrder] = useState<number>(product?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState<boolean>(product?.is_featured ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!nameAr.trim() || !nameEn.trim()) { toast.error("الاسم بالعربي والإنجليزي مطلوبين"); return; }
    const finalSlug = slug.trim() || slugify(nameEn);
    if (!finalSlug) { toast.error("المعرّف مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        slug: finalSlug, sku: sku.trim().toUpperCase() || null, name_ar: nameAr.trim(), name_en: nameEn.trim(),
        description_ar: descAr.trim() || null, description_en: descEn.trim() || null,
        image_url: imageUrl.trim() || null, category_id: categoryId || null,
        base_price_jod: basePrice.trim() === "" ? null : Number(basePrice),
        badge: badge.trim() || null, sort_order: sortOrder,
        is_active: isActive, is_featured: isFeatured,
      };
      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
      toast.success(product ? "تم التحديث" : "تمت الإضافة");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    const ext = file.name.split(".").pop();
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    toast.success("تم رفع الصورة");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag size={17} className="text-cyan-400" /> {product ? `تعديل: ${product.name_ar}` : "منتج جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="gx-fieldset">
            <div className="gx-fs-title"><Pencil size={12} /> المعلومات الأساسية</div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>الاسم (عربي)</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="gx-adm-input" /></div>
              <div><Label>الاسم (English)</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="gx-adm-input" dir="ltr" /></div>
              <div>
                <Label>المعرّف (slug)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(nameEn)} className="gx-adm-input" dir="ltr" />
                <p className="text-[11px] text-cyan-100/45 mt-1">يُستخدم بالرابط وبالكوبونات</p>
              </div>
              <div>
                <Label>رقم المنتج (SKU)</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="مثال: S-3 أو FN-1000" className="gx-adm-input" dir="ltr" />
                <p className="text-[11px] text-cyan-100/45 mt-1">يتولّد تلقائياً — تقدر تعدّله، وبتقدر تبحث فيه وتربطه بالكوبونات</p>
              </div>
              <div>
                <Label>القسم</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="gx-adm-input"><SelectValue placeholder="اختر قسم" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="gx-fieldset">
            <div className="gx-fs-title"><ShoppingBag size={12} /> الصورة والوصف</div>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="gx-prod-img" style={{ width: 92, height: 92 }}>
                {imageUrl ? <img src={imageUrl} alt="" /> : <ShoppingBag size={30} className="text-cyan-400/40" />}
              </div>
              <div className="flex-1 min-w-[220px] space-y-2">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="رابط الصورة" className="gx-adm-input" dir="ltr" />
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-xs text-cyan-100/70" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div><Label>الوصف (عربي)</Label><Textarea value={descAr} onChange={(e) => setDescAr(e.target.value)} rows={3} /></div>
              <div><Label>الوصف (English)</Label><Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} dir="ltr" /></div>
            </div>
          </div>

          <div className="gx-fieldset">
            <div className="gx-fs-title"><Layers size={12} /> السعر والعرض</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>سعر أساسي (د.أ)</Label><Input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="اختياري لو في خيارات" className="gx-adm-input" /></div>
              <div><Label>شارة</Label><Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Premium / Hot / New" className="gx-adm-input" /></div>
              <div><Label>ترتيب الظهور</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="gx-adm-input" /></div>
            </div>
            <div className="flex gap-6 flex-wrap mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                <span className="text-sm">مفعّل (ظاهر للزبائن)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                <span className="text-sm">منتج مميّز (يظهر بالواجهة)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button className="gx-btn outline" onClick={onClose}>إلغاء</button>
            <button className="gx-btn primary" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ المنتج"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  );
}

function VariantsDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);
  const [managingCountry, setManagingCountry] = useState<Variant | null>(null);

  const q = useQuery({
    queryKey: ["admin-variants", product.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", product.id).order("sort_order").order("price_jod");
      if (error) throw error;
      return (data ?? []) as Variant[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-variants", product.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" /> خيارات وأسعار — {product.name_ar}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <button className="gx-btn primary" onClick={() => setAddingVariant(true)}><Plus size={12} /> خيار جديد</button>

          {q.isLoading ? (
            <div className="text-center py-6 text-cyan-100/60">جاري التحميل...</div>
          ) : (q.data ?? []).length === 0 ? (
            <div className="text-center py-6 text-cyan-100/60 border border-dashed border-cyan-400/20 rounded-lg">
              لا يوجد خيارات. أضف خيار (مثال: 25$ / 50$ / 100$).
            </div>
          ) : (q.data ?? []).map((v) => (
            <div key={v.id} className="gx-variant">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-cyan-100">{v.label_ar} <span className="text-xs text-cyan-100/60">/ {v.label_en}</span></div>
                  <div className="text-xs text-cyan-100/70 mt-1">
                    <span className="gx-price">{Number(v.price_jod).toFixed(2)} د.أ</span>
                    {v.face_value && v.face_currency && <span className="ms-2">• قيمة اسمية: {v.face_value} {v.face_currency}</span>}
                    {!v.is_active && <span className="gx-badge-off ms-2">مخفي</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="gx-btn outline" onClick={() => setManagingCountry(v)}><Globe size={12} /> الأسعار حسب الدولة</button>
                  <button className="gx-btn outline" onClick={() => setEditingVariant(v)}><Pencil size={12} /></button>
                  <button className="gx-btn danger" onClick={() => { if (confirm(`حذف "${v.label_ar}"؟`)) deleteMut.mutate(v.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(editingVariant || addingVariant) && (
          <VariantForm
            variant={editingVariant}
            productId={product.id}
            onClose={() => { setEditingVariant(null); setAddingVariant(false); }}
            onSaved={() => { setEditingVariant(null); setAddingVariant(false); qc.invalidateQueries({ queryKey: ["admin-variants", product.id] }); }}
          />
        )}

        {managingCountry && <CountryPricesDialog variant={managingCountry} onClose={() => setManagingCountry(null)} />}
      </DialogContent>
    </Dialog>
  );
}

function VariantForm({ variant, productId, onClose, onSaved }: { variant: Variant | null; productId: string; onClose: () => void; onSaved: () => void }) {
  const [labelAr, setLabelAr] = useState(variant?.label_ar ?? "");
  const [labelEn, setLabelEn] = useState(variant?.label_en ?? "");
  const [priceJod, setPriceJod] = useState<string>(variant?.price_jod?.toString() ?? "");
  const [faceValue, setFaceValue] = useState<string>(variant?.face_value?.toString() ?? "");
  const [faceCurrency, setFaceCurrency] = useState<string>(variant?.face_currency ?? "");
  const [sortOrder, setSortOrder] = useState<number>(variant?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(variant?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!labelAr.trim() || !labelEn.trim()) { toast.error("الاسم بالعربي والإنجليزي مطلوبين"); return; }
    if (!priceJod || isNaN(Number(priceJod))) { toast.error("السعر بالدينار مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        product_id: productId,
        label_ar: labelAr.trim(), label_en: labelEn.trim(),
        price_jod: Number(priceJod),
        face_value: faceValue.trim() === "" ? null : Number(faceValue),
        face_currency: faceCurrency.trim() || null,
        sort_order: sortOrder, is_active: isActive,
      };
      if (variant) {
        const { error } = await supabase.from("product_variants").update(payload).eq("id", variant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_variants").insert(payload);
        if (error) throw error;
      }
      toast.success(variant ? "تم التحديث" : "تمت الإضافة");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle>{variant ? "تعديل خيار" : "خيار جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم (عربي)</Label><Input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} className="gx-adm-input" placeholder="كرت 25$" /></div>
            <div><Label>الاسم (English)</Label><Input value={labelEn} onChange={(e) => setLabelEn(e.target.value)} className="gx-adm-input" dir="ltr" placeholder="$25 Card" /></div>
          </div>
          <div><Label>السعر بالدينار (د.أ)</Label><Input type="number" step="0.01" value={priceJod} onChange={(e) => setPriceJod(e.target.value)} className="gx-adm-input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>القيمة الاسمية</Label><Input type="number" step="0.01" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} className="gx-adm-input" placeholder="25" /></div>
            <div>
              <Label>عملة القيمة</Label>
              <Select value={faceCurrency} onValueChange={setFaceCurrency}>
                <SelectTrigger className="gx-adm-input"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>ترتيب</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="gx-adm-input" /></div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                <span className="text-sm">مفعّل</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button className="gx-btn outline" onClick={onClose}>إلغاء</button>
            <button className="gx-btn primary" onClick={save} disabled={saving}>{saving ? "..." : "حفظ"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CountryPricesDialog({ variant, onClose }: { variant: Variant; onClose: () => void }) {
  const qc = useQueryClient();
  const [country, setCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [priceLocal, setPriceLocal] = useState("");
  const [priceJod, setPriceJod] = useState("");

  const q = useQuery({
    queryKey: ["admin-country-prices", variant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_country_prices").select("*").eq("variant_id", variant.id).order("country_code");
      if (error) throw error;
      return (data ?? []) as CountryPrice[];
    },
  });

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (!priceLocal || isNaN(Number(priceLocal))) throw new Error("السعر المحلي مطلوب");
      const { error } = await supabase.from("product_country_prices").upsert({
        variant_id: variant.id,
        country_code: country.toUpperCase(),
        currency: currency.toUpperCase(),
        price_local: Number(priceLocal),
        price_jod: priceJod.trim() === "" ? null : Number(priceJod),
      }, { onConflict: "variant_id,country_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setPriceLocal(""); setPriceJod("");
      qc.invalidateQueries({ queryKey: ["admin-country-prices", variant.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_country_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-country-prices", variant.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe size={18} className="text-cyan-400" /> أسعار حسب الدولة — {variant.label_ar}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="gx-country">
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <Label className="text-xs">الدولة</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="gx-adm-input h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">العملة</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="gx-adm-input h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">السعر محلي</Label><Input type="number" step="0.01" value={priceLocal} onChange={(e) => setPriceLocal(e.target.value)} className="gx-adm-input h-9" /></div>
              <div><Label className="text-xs">مقابل د.أ (اختياري)</Label><Input type="number" step="0.01" value={priceJod} onChange={(e) => setPriceJod(e.target.value)} className="gx-adm-input h-9" /></div>
            </div>
            <button className="gx-btn primary w-full justify-center" onClick={() => upsertMut.mutate()} disabled={upsertMut.isPending}>
              <Plus size={12} /> إضافة / تحديث
            </button>
          </div>

          {q.isLoading ? (
            <div className="text-center py-4 text-cyan-100/60">جاري التحميل...</div>
          ) : (q.data ?? []).length === 0 ? (
            <div className="text-center py-4 text-cyan-100/60 text-sm">لا توجد أسعار محلية بعد.</div>
          ) : (
            <div className="space-y-2">
              {(q.data ?? []).map((cp) => (
                <div key={cp.id} className="flex items-center justify-between border border-cyan-400/15 rounded-lg p-2 bg-cyan-500/5">
                  <div className="flex items-center gap-3 text-sm">
                    <img src={`https://flagcdn.com/w40/${cp.country_code.toLowerCase()}.png`} alt="" className="w-7 h-5 rounded object-cover" />
                    <span className="font-bold text-cyan-100">{cp.country_code}</span>
                    <span className="gx-price">{Number(cp.price_local).toFixed(2)} {cp.currency}</span>
                    {cp.price_jod !== null && <span className="text-xs text-cyan-100/60">≈ {Number(cp.price_jod).toFixed(2)} د.أ</span>}
                  </div>
                  <button className="gx-btn danger" onClick={() => deleteMut.mutate(cp.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
