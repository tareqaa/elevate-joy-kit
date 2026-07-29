import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ticket, Plus, Trash2, Save, X, Search, Percent, DollarSign, Calendar, Users, ShoppingBag, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: AdminCouponsPage,
});

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount_jod: number | null;
  min_order_jod: number;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  scope: "all" | "products" | "categories";
  product_slugs: string[];
  category_slugs: string[];
  is_active: boolean;
  created_at: string;
};

const EMPTY: Partial<Coupon> = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  max_discount_jod: null,
  min_order_jod: 0,
  expires_at: null,
  usage_limit: null,
  per_user_limit: 0,
  scope: "all",
  product_slugs: [],
  category_slugs: [],
  is_active: true,
};

function AdminCouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "disabled">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Coupon[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const code = (editing.code || "").trim().toUpperCase();
    if (!code) { toast.error("أدخل كود الكوبون"); return; }
    if (!editing.discount_value || editing.discount_value <= 0) { toast.error("قيمة الخصم مطلوبة"); return; }

    const payload = {
      code,
      description: editing.description || null,
      discount_type: editing.discount_type || "percent",
      discount_value: editing.discount_value,
      max_discount_jod: editing.max_discount_jod ?? null,
      min_order_jod: editing.min_order_jod ?? 0,
      expires_at: editing.expires_at || null,
      usage_limit: editing.usage_limit ?? null,
      per_user_limit: editing.per_user_limit ?? 0,
      scope: editing.scope || "all",
      product_slugs: editing.product_slugs || [],
      category_slugs: editing.category_slugs || [],
      is_active: editing.is_active ?? true,
    };

    const q = editing.id
      ? supabase.from("coupons").update(payload).eq("id", editing.id)
      : supabase.from("coupons").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "تم تحديث الكوبون" : "تم إنشاء الكوبون بنجاح");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الكوبون نهائياً؟")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function copyCode(c: Coupon) {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* noop */ }
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    const s = search.trim().toLowerCase();
    return rows.filter((c) => {
      const expired = c.expires_at && new Date(c.expires_at).getTime() < now;
      if (filter === "active" && (!c.is_active || expired)) return false;
      if (filter === "expired" && !expired) return false;
      if (filter === "disabled" && c.is_active) return false;
      if (!s) return true;
      return c.code.toLowerCase().includes(s) || (c.description || "").toLowerCase().includes(s);
    });
  }, [rows, filter, search]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: rows.length,
      active: rows.filter((c) => c.is_active && (!c.expires_at || new Date(c.expires_at).getTime() > now)).length,
      redeemed: rows.reduce((s, c) => s + (c.usage_count || 0), 0),
    };
  }, [rows]);

  return (
    <div dir="rtl" className="space-y-5">
      <style>{`
        .cp-input{width:100%;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(0,229,255,.18);color:#e6f7ff;font-size:13px;font-family:inherit;transition:all .15s}
        .cp-input:focus{outline:none;border-color:rgba(0,229,255,.55);box-shadow:0 0 0 3px rgba(0,229,255,.15)}
        .cp-chip{padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#a3b6c9;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
        .cp-chip:hover{color:#fff;border-color:rgba(0,229,255,.25)}
        .cp-chip.on{background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(0,150,255,.12));color:#00e5ff;border-color:rgba(0,229,255,.5)}
        .cp-card{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.12);border-radius:16px;padding:16px;transition:all .18s;position:relative;overflow:hidden}
        .cp-card:hover{border-color:rgba(0,229,255,.35);transform:translateY(-2px);box-shadow:0 12px 30px -12px rgba(0,229,255,.25)}
        .cp-card.off{opacity:.55}
        .cp-card.exp{border-color:rgba(244,63,94,.25)}
        .cp-code-box{background:rgba(0,0,0,.4);border:1px dashed rgba(0,229,255,.35);border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
        .cp-code-txt{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#00e5ff;font-size:18px;letter-spacing:1.5px}
        .cp-stat-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
        .cp-stat-pill{font-size:11px;padding:4px 9px;border-radius:8px;background:rgba(255,255,255,.05);color:#a3b6c9;font-weight:600;display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(255,255,255,.06)}
        .cp-actions{display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06)}
        .cp-btn{flex:1;padding:8px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:4px}
        .cp-btn-edit{background:rgba(0,229,255,.1);color:#00e5ff;border-color:rgba(0,229,255,.25)}
        .cp-btn-edit:hover{background:rgba(0,229,255,.18)}
        .cp-btn-tog{background:rgba(255,255,255,.05);color:#a3b6c9;border-color:rgba(255,255,255,.08)}
        .cp-btn-tog:hover{color:#fff}
        .cp-btn-del{background:rgba(244,63,94,.08);color:#fb7185;border-color:rgba(244,63,94,.2);flex:0 0 40px}
        .cp-btn-del:hover{background:rgba(244,63,94,.18)}
      `}</style>

      {/* Header + stats */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-cyan-400" /> إدارة الكوبونات
          </h1>
          <p className="text-sm text-slate-400 mt-1">أنشئ وأدر أكواد الخصم للمتجر — نسبة أو مبلغ ثابت، لمنتجات محددة أو السلة كاملة</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-4 h-4" /> كوبون جديد
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="cp-card !p-4"><div className="text-[11px] text-cyan-400/70 uppercase font-bold">الكل</div><div className="text-2xl font-black text-white mt-1">{stats.total}</div></div>
        <div className="cp-card !p-4"><div className="text-[11px] text-emerald-400/80 uppercase font-bold">مفعّل</div><div className="text-2xl font-black text-emerald-300 mt-1">{stats.active}</div></div>
        <div className="cp-card !p-4"><div className="text-[11px] text-cyan-400/70 uppercase font-bold">استخدامات</div><div className="text-2xl font-black text-cyan-300 mt-1">{stats.redeemed}</div></div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالكود أو الوصف" className="cp-input pr-9" />
        </div>
        {(["all", "active", "expired", "disabled"] as const).map((f) => (
          <button key={f} className={`cp-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : f === "active" ? "مفعّل" : f === "expired" ? "منتهي" : "متوقف"}
          </button>
        ))}
      </div>

      {/* Coupons grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="cp-card p-12 text-center">
          <Ticket className="w-12 h-12 text-cyan-400/40 mx-auto mb-3" />
          <div className="text-slate-300 font-bold mb-1">لا يوجد كوبونات</div>
          <div className="text-xs text-slate-500">أنشئ أول كوبون خصم للمتجر الآن</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
            return (
              <div key={c.id} className={`cp-card ${!c.is_active ? "off" : ""} ${expired ? "exp" : ""}`}>
                <div className="cp-code-box">
                  <span className="cp-code-txt">{c.code}</span>
                  <button onClick={() => copyCode(c)} className="text-cyan-400/70 hover:text-cyan-300 p-1" title="نسخ">
                    {copiedId === c.id ? <Check size={16} /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-black text-white">
                    {c.discount_type === "percent" ? `${c.discount_value}` : c.discount_value.toFixed(2)}
                  </div>
                  <div className="text-cyan-400 font-bold">
                    {c.discount_type === "percent" ? "%" : "د.أ"}
                  </div>
                  <div className="text-xs text-slate-500 mr-auto">
                    {c.scope === "all" ? "السلة كاملة" : c.scope === "products" ? `${c.product_slugs.length} منتج` : `${c.category_slugs.length} قسم`}
                  </div>
                </div>

                {c.description && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{c.description}</p>}

                <div className="cp-stat-row">
                  {c.min_order_jod > 0 && <span className="cp-stat-pill"><ShoppingBag size={11} /> حد أدنى {c.min_order_jod} د.أ</span>}
                  <span className="cp-stat-pill"><Users size={11} /> {c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</span>
                  {c.per_user_limit > 0 && <span className="cp-stat-pill">لكل مستخدم {c.per_user_limit}</span>}
                  {c.expires_at && (
                    <span className={`cp-stat-pill ${expired ? "!text-rose-400 !border-rose-500/30" : ""}`}>
                      <Calendar size={11} /> {new Date(c.expires_at).toLocaleDateString("ar")}
                    </span>
                  )}
                  {expired && <span className="cp-stat-pill !bg-rose-500/15 !text-rose-300 !border-rose-500/30">منتهي</span>}
                  {!c.is_active && <span className="cp-stat-pill !bg-slate-700/40 !text-slate-400">متوقف</span>}
                </div>

                <div className="cp-actions">
                  <button onClick={() => setEditing(c)} className="cp-btn cp-btn-edit">تعديل</button>
                  <button onClick={() => toggle(c)} className="cp-btn cp-btn-tog">{c.is_active ? "إيقاف" : "تفعيل"}</button>
                  <button onClick={() => remove(c.id)} className="cp-btn cp-btn-del" title="حذف"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <CouponEditor editing={editing} setEditing={setEditing} onSave={save} />}
    </div>
  );
}

function CouponEditor({
  editing, setEditing, onSave,
}: {
  editing: Partial<Coupon>;
  setEditing: (v: Partial<Coupon> | null) => void;
  onSave: () => void;
}) {
  const set = (patch: Partial<Coupon>) => setEditing({ ...editing, ...patch });
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditing(null)}>
      <div dir="rtl" className="w-full max-w-2xl max-h-[92vh] overflow-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 to-slate-900" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing.id ? "تعديل كوبون" : "كوبون جديد"}</h2>
              <p className="text-xs text-slate-400">{editing.id ? "عدّل تفاصيل الكوبون" : "أنشئ كود خصم لعملائك"}</p>
            </div>
          </div>
          <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Basics */}
          <Section title="الأساسيات">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="كود الكوبون *">
                <input value={editing.code || ""} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="cp-input font-mono font-bold tracking-widest" />
              </Field>
              <Field label="وصف داخلي">
                <input value={editing.description || ""} onChange={(e) => set({ description: e.target.value })} placeholder="ترحيب بعميل جديد" className="cp-input" />
              </Field>
            </div>
          </Section>

          {/* Discount */}
          <Section title="الخصم">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => set({ discount_type: "percent" })}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold ${editing.discount_type === "percent" ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300" : "bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white"}`}
              >
                <Percent size={16} /> نسبة مئوية
              </button>
              <button
                type="button"
                onClick={() => set({ discount_type: "fixed" })}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold ${editing.discount_type === "fixed" ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300" : "bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white"}`}
              >
                <DollarSign size={16} /> مبلغ ثابت
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={`قيمة الخصم * ${editing.discount_type === "percent" ? "(%)" : "(د.أ)"}`}>
                <input type="number" step="0.01" value={editing.discount_value ?? ""} onChange={(e) => set({ discount_value: Number(e.target.value) })} className="cp-input" />
              </Field>
              {editing.discount_type === "percent" && (
                <Field label="حد أقصى للخصم (د.أ)">
                  <input type="number" step="0.01" value={editing.max_discount_jod ?? ""} onChange={(e) => set({ max_discount_jod: e.target.value ? Number(e.target.value) : null })} placeholder="اختياري" className="cp-input" />
                </Field>
              )}
              <Field label="حد أدنى للطلب (د.أ)">
                <input type="number" step="0.01" value={editing.min_order_jod ?? 0} onChange={(e) => set({ min_order_jod: Number(e.target.value) })} className="cp-input" />
              </Field>
            </div>
          </Section>

          {/* Limits */}
          <Section title="حدود الاستخدام">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="عدد الاستخدامات الكلي">
                <input type="number" value={editing.usage_limit ?? ""} onChange={(e) => set({ usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="∞ غير محدود" className="cp-input" />
              </Field>
              <Field label="لكل مستخدم">
                <input type="number" value={editing.per_user_limit ?? 0} onChange={(e) => set({ per_user_limit: Number(e.target.value) })} placeholder="0 = غير محدود" className="cp-input" />
              </Field>
              <Field label="تاريخ الانتهاء">
                <input type="datetime-local" value={editing.expires_at ? editing.expires_at.slice(0, 16) : ""} onChange={(e) => set({ expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="cp-input" />
              </Field>
            </div>
          </Section>

          {/* Scope */}
          <Section title="النطاق">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                { v: "all", l: "السلة كاملة", d: "على كامل الطلب" },
                { v: "products", l: "منتجات محددة", d: "منتجات بالسلاج" },
                { v: "categories", l: "أقسام محددة", d: "أقسام بالسلاج" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => set({ scope: o.v })}
                  className={`p-3 rounded-xl border text-center transition-all ${editing.scope === o.v ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300" : "bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white"}`}
                >
                  <div className="font-bold text-sm">{o.l}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{o.d}</div>
                </button>
              ))}
            </div>
            {editing.scope === "products" && (
              <Field label="اختر المنتجات (كل منتج له رقم/كود ثابت)">
                <ProductPicker
                  selected={editing.product_slugs || []}
                  onChange={(v) => set({ product_slugs: v })}
                />
              </Field>
            )}
            {editing.scope === "categories" && (
              <Field label="سلاجز الأقسام (مفصولة بفاصلة)">
                <input value={(editing.category_slugs || []).join(",")} onChange={(e) => set({ category_slugs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="games,gift-cards" className="cp-input font-mono text-xs" />
              </Field>
            )}
          </Section>

          {/* Status toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/30 cursor-pointer hover:border-cyan-500/30">
            <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => set({ is_active: e.target.checked })} className="w-4 h-4 accent-cyan-500" />
            <div>
              <div className="text-sm font-bold text-white">تفعيل الكوبون</div>
              <div className="text-xs text-slate-400">اجعل الكوبون قابل للاستخدام في المتجر</div>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold">إلغاء</button>
          <button onClick={onSave} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/30">
            <Save className="w-4 h-4" /> {editing.id ? "حفظ التعديلات" : "إنشاء الكوبون"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-black text-cyan-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
        <span className="w-1 h-3 bg-cyan-400 rounded-full" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
