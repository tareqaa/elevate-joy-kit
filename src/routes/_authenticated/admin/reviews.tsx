import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pager, usePager } from "@/components/gx/Pager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Search, Check, X, EyeOff, Sparkles, Trash2, Save, MessageSquare, AlertTriangle } from "lucide-react";
import { containsProfanity, isAutoEligible, statusLabel, type ReviewRow, type ReviewStatus } from "@/lib/gx/reviews";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({ meta: [{ title: "المراجعات — لوحة التحكم" }] }),
  component: AdminReviewsPage,
});

const css = `
.rv-card{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.92));border:1px solid rgba(0,229,255,.12);border-radius:16px;padding:14px}
.rv-input{width:100%;padding:9px 12px;border-radius:10px;background:rgba(0,0,0,.35);border:1px solid rgba(0,229,255,.18);color:#e6f7ff;font-size:13px;font-family:inherit;outline:none}
.rv-chip{padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#a3b6c9;font-size:12px;font-weight:700;cursor:pointer}
.rv-chip.on{background:rgba(0,229,255,.16);color:#00e5ff;border-color:rgba(0,229,255,.5)}
.rv-btn{padding:7px 11px;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:5px}
.rv-ok{background:rgba(52,211,153,.12);color:#6ee7b7;border-color:rgba(52,211,153,.3)}
.rv-no{background:rgba(244,63,94,.1);color:#fb7185;border-color:rgba(244,63,94,.25)}
.rv-mut{background:rgba(255,255,255,.05);color:#a3b6c9;border-color:rgba(255,255,255,.1)}
.rv-star{background:none;border:0;cursor:pointer;padding:1px;line-height:0}
.rv-pill{font-size:11px;padding:3px 9px;border-radius:8px;background:rgba(255,255,255,.05);color:#a3b6c9;border:1px solid rgba(255,255,255,.07)}
`;

const FILTERS: { v: "all" | ReviewStatus | "featured"; l: string }[] = [
  { v: "all", l: "الكل" },
  { v: "featured", l: "على الرئيسية" },
  { v: "pending", l: "بانتظار المراجعة" },
  { v: "approved", l: "منشور" },
  { v: "rejected", l: "مرفوض" },
  { v: "hidden", l: "مخفي" },
];

function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ReviewStatus | "featured">("all");
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { comment: string; rating: number; name: string }>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as ReviewRow[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function patch(id: string, values: Partial<ReviewRow>) {
    const { error } = await supabase.from("reviews").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...values } as ReviewRow : r)));
    toast.success("تم التحديث — انعكس على الصفحة الرئيسية مباشرة");
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه المراجعة نهائياً؟")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("تم الحذف");
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "featured" ? !r.is_featured : filter !== "all" && r.status !== filter) return false;
      if (!s) return true;
      return [r.display_name, r.order_number, r.product_name, r.product_slug, r.comment]
        .some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [rows, filter, q]);

  const pager = usePager(filtered, 8, `${filter}|${q}`);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    published: rows.filter((r) => r.status === "approved" && r.is_featured && r.rating >= 4).length,
    avg: rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—",
  }), [rows]);

  return (
    <div dir="rtl" className="space-y-5">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-cyan-400" /> إدارة المراجعات
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          كل مراجعة تصل هنا أولاً. المنشور على الصفحة الرئيسية = معتمد + مميّز + 4 نجوم فأكثر.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rv-card"><div className="text-[11px] text-cyan-400/70 font-bold">الكل</div><div className="text-2xl font-black text-white mt-1">{stats.total}</div></div>
        <div className="rv-card"><div className="text-[11px] text-amber-400/80 font-bold">بالانتظار</div><div className="text-2xl font-black text-amber-300 mt-1">{stats.pending}</div></div>
        <div className="rv-card"><div className="text-[11px] text-emerald-400/80 font-bold">على الرئيسية</div><div className="text-2xl font-black text-emerald-300 mt-1">{stats.published}</div></div>
        <div className="rv-card"><div className="text-[11px] text-cyan-400/70 font-bold">متوسط التقييم</div><div className="text-2xl font-black text-cyan-300 mt-1">{stats.avg}</div></div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70" />
          <input className="rv-input pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الطلب أو المنتج" />
        </div>
        {FILTERS.map((f) => (
          <button key={f.v} className={`rv-chip ${filter === f.v ? "on" : ""}`} onClick={() => setFilter(f.v)}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="rv-card p-12 text-center text-slate-400">لا يوجد مراجعات ضمن هذا الفلتر</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pager.slice.map((r) => {
            const draft = drafts[r.id] ?? { comment: r.comment, rating: r.rating, name: r.display_name || "" };
            const dirty = draft.comment !== r.comment || draft.rating !== r.rating || draft.name !== (r.display_name || "");
            const flagged = containsProfanity(r.comment);
            const eligible = isAutoEligible(r.rating, r.comment);
            return (
              <div key={r.id} className="rv-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <input
                      className="rv-input !py-1.5 !text-sm font-bold text-white mb-1"
                      value={draft.name}
                      placeholder="عميل GX"
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...draft, name: e.target.value } }))}
                    />
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      <span className="rv-pill">{new Date(r.created_at).toLocaleDateString("ar")}</span>
                      {r.order_number && <span className="rv-pill" dir="ltr">{r.order_number}</span>}
                    </div>

                  </div>
                  <span className={`rv-pill ${r.status === "approved" ? "!text-emerald-300 !border-emerald-500/30" : r.status === "pending" ? "!text-amber-300 !border-amber-500/30" : "!text-rose-300 !border-rose-500/30"}`}>
                    {statusLabel(r.status)}{r.is_featured ? " • مميّز" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className="rv-star" onClick={() => setDrafts((d) => ({ ...d, [r.id]: { ...draft, rating: n } }))}>
                      <Star size={18} fill={draft.rating >= n ? "#ffd54f" : "transparent"} color={draft.rating >= n ? "#ffd54f" : "#3d4c5c"} />
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 me-2">{draft.rating}/5</span>
                </div>

                <textarea
                  className="rv-input" rows={3} value={draft.comment}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...draft, comment: e.target.value } }))}
                />

                {!eligible && (
                  <div className="flex items-center gap-2 text-[11.5px] text-amber-300/90">
                    <AlertTriangle size={13} />
                    {flagged ? "تحتوي ألفاظاً غير لائقة — لن تظهر على الرئيسية" : "أقل من 4 نجوم — لن تظهر على الرئيسية"}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  {dirty && (
                    <button className="rv-btn rv-ok" onClick={() => patch(r.id, { comment: draft.comment, rating: draft.rating, display_name: draft.name.trim() || null })}>
                      <Save size={13} /> حفظ التعديل
                    </button>
                  )}
                  <button className="rv-btn rv-ok" onClick={() => patch(r.id, { status: "approved" })}><Check size={13} /> اعتماد</button>
                  <button className="rv-btn rv-no" onClick={() => patch(r.id, { status: "rejected" })}><X size={13} /> رفض</button>
                  <button className="rv-btn rv-mut" onClick={() => patch(r.id, { status: "hidden" })}><EyeOff size={13} /> إخفاء</button>
                  <button className="rv-btn rv-mut" onClick={() => patch(r.id, { is_featured: !r.is_featured })}>
                    <Sparkles size={13} /> {r.is_featured ? "إلغاء التمييز" : "تمييز"}
                  </button>
                  <button className="rv-btn rv-no" onClick={() => remove(r.id)}><Trash2 size={13} /> حذف</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && (
        <Pager page={pager.page} pageCount={pager.pageCount} total={pager.total} size={pager.size}
          onPage={pager.setPage} onSize={pager.setSize} sizes={[8, 16, 32]} />
      )}
    </div>
  );

}
