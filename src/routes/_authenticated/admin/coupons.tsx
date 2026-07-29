import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ticket, Plus, Trash2, Save, X } from "lucide-react";

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
    toast.success(editing.id ? "تم التحديث" : "تم إنشاء الكوبون");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الكوبون؟")) return;
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

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket className="w-6 h-6 text-cyan-400" /> إدارة الكوبونات
          </h1>
          <p className="text-sm text-slate-400 mt-1">إنشاء وإدارة كوبونات الخصم للمتجر</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-4 h-4" /> كوبون جديد
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">لا يوجد كوبونات — أنشئ أول كوبون الآن.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-slate-400 text-xs">
              <tr>
                <th className="p-3 text-right">الكود</th>
                <th className="p-3 text-right">الخصم</th>
                <th className="p-3 text-right">النطاق</th>
                <th className="p-3 text-right">الحد الأدنى</th>
                <th className="p-3 text-right">الاستخدام</th>
                <th className="p-3 text-right">الانتهاء</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {rows.map(c => (
                <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                  <td className="p-3 font-mono font-bold text-cyan-300">{c.code}</td>
                  <td className="p-3">{c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} JOD`}</td>
                  <td className="p-3 text-xs text-slate-400">{c.scope === "all" ? "السلة كاملة" : c.scope === "products" ? `منتجات (${c.product_slugs.length})` : `أقسام (${c.category_slugs.length})`}</td>
                  <td className="p-3 text-xs">{c.min_order_jod ? `${c.min_order_jod} JOD` : "—"}</td>
                  <td className="p-3 text-xs">{c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                  <td className="p-3 text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "—"}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(c)} className={`px-2 py-1 rounded text-xs font-bold ${c.is_active ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-slate-700/40 text-slate-400 border border-slate-700"}`}>
                      {c.is_active ? "مفعّل" : "متوقف"}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(c)} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">تعديل</button>
                      <button onClick={() => remove(c.id)} className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
      <div dir="rtl" className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{editing.id ? "تعديل كوبون" : "كوبون جديد"}</h2>
          <button onClick={() => setEditing(null)} className="p-2 rounded hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="الكود">
            <input value={editing.code || ""} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="gx-input" />
          </Field>
          <Field label="الوصف">
            <input value={editing.description || ""} onChange={(e) => set({ description: e.target.value })} placeholder="وصف داخلي" className="gx-input" />
          </Field>
          <Field label="نوع الخصم">
            <select value={editing.discount_type} onChange={(e) => set({ discount_type: e.target.value as "percent" | "fixed" })} className="gx-input">
              <option value="percent">نسبة %</option>
              <option value="fixed">مبلغ ثابت (JOD)</option>
            </select>
          </Field>
          <Field label="قيمة الخصم">
            <input type="number" step="0.01" value={editing.discount_value ?? ""} onChange={(e) => set({ discount_value: Number(e.target.value) })} className="gx-input" />
          </Field>
          <Field label="حد أقصى للخصم (JOD)">
            <input type="number" step="0.01" value={editing.max_discount_jod ?? ""} onChange={(e) => set({ max_discount_jod: e.target.value ? Number(e.target.value) : null })} placeholder="اختياري" className="gx-input" />
          </Field>
          <Field label="حد أدنى للطلب (JOD)">
            <input type="number" step="0.01" value={editing.min_order_jod ?? 0} onChange={(e) => set({ min_order_jod: Number(e.target.value) })} className="gx-input" />
          </Field>
          <Field label="عدد الاستخدامات الكلي">
            <input type="number" value={editing.usage_limit ?? ""} onChange={(e) => set({ usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="غير محدود" className="gx-input" />
          </Field>
          <Field label="حد استخدام لكل مستخدم">
            <input type="number" value={editing.per_user_limit ?? 0} onChange={(e) => set({ per_user_limit: Number(e.target.value) })} placeholder="0 = غير محدود" className="gx-input" />
          </Field>
          <Field label="تاريخ الانتهاء">
            <input type="datetime-local" value={editing.expires_at ? editing.expires_at.slice(0, 16) : ""} onChange={(e) => set({ expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="gx-input" />
          </Field>
          <Field label="النطاق">
            <select value={editing.scope} onChange={(e) => set({ scope: e.target.value as "all" | "products" | "categories" })} className="gx-input">
              <option value="all">السلة كاملة</option>
              <option value="products">منتجات محددة</option>
              <option value="categories">أقسام محددة</option>
            </select>
          </Field>
        </div>

        {editing.scope === "products" && (
          <Field label="سلاجز المنتجات (مفصولة بفاصلة)">
            <input value={(editing.product_slugs || []).join(",")} onChange={(e) => set({ product_slugs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="fortnite,snapchat-plus" className="gx-input" />
          </Field>
        )}
        {editing.scope === "categories" && (
          <Field label="سلاجز الأقسام (مفصولة بفاصلة)">
            <input value={(editing.category_slugs || []).join(",")} onChange={(e) => set({ category_slugs: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="games,gift-cards" className="gx-input" />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => set({ is_active: e.target.checked })} />
          مفعّل
        </label>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm">إلغاء</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-sm">
            <Save className="w-4 h-4" /> حفظ
          </button>
        </div>

        <style>{`.gx-input{width:100%;padding:9px 11px;border-radius:8px;background:#0b1220;border:1px solid #1e293b;color:#e2e8f0;font-size:13px;font-family:inherit}.gx-input:focus{outline:none;border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.15)}`}</style>
      </div>
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
