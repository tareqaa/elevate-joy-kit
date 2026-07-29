import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, Download, Volume2, VolumeX, RefreshCw, Filter, Bell,
  CheckCircle2, XCircle, Clock, CreditCard, Package as PackageIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "الطلبات — لوحة التحكم" }] }),
  component: OrdersAdmin,
});

const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled"] as const;
const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", paid: "مدفوع", processing: "قيد التجهيز", delivered: "مُسلَّم", cancelled: "ملغى",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  paid: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  processing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};
const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock, paid: CreditCard, processing: PackageIcon, delivered: CheckCircle2, cancelled: XCircle,
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string | null;
  customer_whatsapp: string | null;
  contact_type: string | null;
  items: unknown;
  total_jod: number;
  status: string;
  admin_notes: string | null;
  delivery_data: unknown;
  created_at: string;
};

type OrderWithEmail = OrderRow & { user_email: string | null; user_username: string | null };

type DateRange = "all" | "today" | "7d" | "30d";

const ordersCss = `
.gx-adm-orders{color:#e6f7ff}
.gx-adm-card{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.12);border-radius:18px;padding:16px;box-shadow:0 8px 30px rgba(0,229,255,.05)}
.gx-adm-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.gx-adm-input{background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,229,255,.18)!important;color:#e6f7ff!important;border-radius:12px!important;height:40px}
.gx-adm-input:focus-visible{outline:none;border-color:rgba(0,229,255,.55)!important;box-shadow:0 0 0 3px rgba(0,229,255,.15)!important}
.gx-adm-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:#a3b6c9;font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap}
.gx-adm-chip:hover{color:#fff;border-color:rgba(0,229,255,.25)}
.gx-adm-chip.on{background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(0,150,255,.12));color:#00e5ff;border-color:rgba(0,229,255,.5);box-shadow:0 0 18px rgba(0,229,255,.18)}
.gx-adm-chip .n{font-size:11px;background:rgba(0,0,0,.35);padding:2px 7px;border-radius:999px}
.gx-adm-chip.on .n{background:rgba(0,229,255,.25);color:#e6faff}
.gx-adm-table{width:100%;border-collapse:separate;border-spacing:0}
.gx-adm-table th{position:sticky;top:0;background:rgba(6,10,16,.95);backdrop-filter:blur(8px);padding:12px;text-align:right;font-size:12px;color:#7d92a8;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid rgba(0,229,255,.15);font-weight:700}
.gx-adm-table td{padding:14px 12px;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px;color:#d9ecff;vertical-align:middle}
.gx-adm-row{transition:background .15s}
.gx-adm-row:hover{background:rgba(0,229,255,.04)}
.gx-adm-row.new{animation:gxRowFlash 2.4s ease-out}
@keyframes gxRowFlash{0%{background:rgba(0,229,255,.22)}100%{background:transparent}}
.gx-adm-num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#00e5ff;font-weight:700}
.gx-adm-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid}
.gx-adm-btn-icon{width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(0,229,255,.18);background:rgba(0,229,255,.05);color:#00e5ff;cursor:pointer;transition:all .15s}
.gx-adm-btn-icon:hover{background:rgba(0,229,255,.15);border-color:rgba(0,229,255,.4)}
.gx-adm-btn-icon.active{background:rgba(0,229,255,.2);border-color:rgba(0,229,255,.6);box-shadow:0 0 12px rgba(0,229,255,.3)}
.gx-adm-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#00e5ff,#0091ff);color:#001018;font-weight:700;font-size:13px;cursor:pointer;transition:transform .15s,box-shadow .15s}
.gx-adm-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(0,229,255,.35)}
.gx-adm-btn-outline{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:1px solid rgba(0,229,255,.28);background:transparent;color:#00e5ff;font-weight:600;font-size:13px;cursor:pointer;transition:all .15s}
.gx-adm-btn-outline:hover{background:rgba(0,229,255,.08)}
.gx-adm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}
.gx-adm-stat{background:linear-gradient(180deg,rgba(0,229,255,.06),rgba(0,229,255,.02));border:1px solid rgba(0,229,255,.15);border-radius:14px;padding:14px}
.gx-adm-stat .l{font-size:11px;color:#7d92a8;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
.gx-adm-stat .v{font-size:22px;color:#e6f7ff;font-weight:800;margin-top:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.gx-adm-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#00e5ff;font-weight:700}
.gx-adm-live .dot{width:8px;height:8px;border-radius:50%;background:#00e5ff;box-shadow:0 0 8px #00e5ff;animation:gxPulse 1.5s infinite}
@keyframes gxPulse{0%,100%{opacity:1}50%{opacity:.4}}
.gx-adm-empty{padding:60px 20px;text-align:center;color:#7d92a8}
`;

function beep() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.36);
    setTimeout(() => {
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.type = "sine"; o2.frequency.value = 1320;
      g2.gain.setValueAtTime(0.0001, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      o2.connect(g2); g2.connect(ctx.destination);
      o2.start(); o2.stop(ctx.currentTime + 0.31);
    }, 180);
  } catch { /* ignore */ }
}

function toCsv(rows: OrderWithEmail[]) {
  const cols = ["order_number", "created_at", "status", "customer_name", "user_email", "user_username", "customer_whatsapp", "total_jod"];
  const header = cols.join(",");
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(",")).join("\n");
  return "\uFEFF" + header + "\n" + body;
}

function OrdersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [selected, setSelected] = useState<OrderWithEmail | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("gx_admin_sound") !== "0";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => { localStorage.setItem("gx_admin_sound", soundOn ? "1" : "0"); }, [soundOn]);

  const ordersQ = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const rows = (data ?? []) as OrderRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      let profilesMap: Record<string, { email: string | null; username: string | null }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,email,username").in("id", userIds);
        profilesMap = Object.fromEntries((profs ?? []).map((p) => [p.id, { email: p.email, username: p.username }]));
      }
      return rows.map<OrderWithEmail>((r) => ({
        ...r,
        user_email: r.user_id ? profilesMap[r.user_id]?.email ?? null : null,
        user_username: r.user_id ? profilesMap[r.user_id]?.username ?? null : null,
      }));
    },
    refetchInterval: 30000,
  });

  // Detect new orders → play sound + flash
  useEffect(() => {
    const data = ordersQ.data;
    if (!data) return;
    if (isFirstLoadRef.current) {
      knownIdsRef.current = new Set(data.map((o) => o.id));
      isFirstLoadRef.current = false;
      return;
    }
    const fresh = data.filter((o) => !knownIdsRef.current.has(o.id));
    if (fresh.length > 0) {
      fresh.forEach((o) => knownIdsRef.current.add(o.id));
      setFlashIds(new Set(fresh.map((o) => o.id)));
      if (soundOn) beep();
      toast.success(`طلب جديد: ${fresh[0].order_number}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ""}`, {
        duration: 5000,
      });
      setTimeout(() => setFlashIds(new Set()), 2500);
    }
  }, [ordersQ.data, soundOn]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = dateRange === "today" ? now - 864e5 : dateRange === "7d" ? now - 7 * 864e5 : dateRange === "30d" ? now - 30 * 864e5 : 0;
    const min = Number(minAmount) || 0;
    const s = search.trim().toLowerCase();
    return (ordersQ.data ?? []).filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (cutoff && new Date(o.created_at).getTime() < cutoff) return false;
      if (min > 0 && Number(o.total_jod) < min) return false;
      if (!s) return true;
      return (
        o.order_number.toLowerCase().includes(s) ||
        (o.customer_name ?? "").toLowerCase().includes(s) ||
        (o.user_email ?? "").toLowerCase().includes(s) ||
        (o.user_username ?? "").toLowerCase().includes(s) ||
        (o.customer_whatsapp ?? "").toLowerCase().includes(s)
      );
    });
  }, [ordersQ.data, statusFilter, dateRange, minAmount, search]);

  const stats = useMemo(() => {
    const list = filtered;
    const total = list.reduce((s, o) => s + Number(o.total_jod || 0), 0);
    const pending = list.filter((o) => o.status === "pending").length;
    const delivered = list.filter((o) => o.status === "delivered").length;
    return { count: list.length, total, pending, delivered };
  }, [filtered]);

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (ordersQ.data ?? []).filter((o) => o.status === s).length;
    return acc;
  }, { all: (ordersQ.data ?? []).length } as Record<string, number>);

  const updateMut = useMutation({
    mutationFn: async (payload: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("orders").update(payload.patch as never).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gx-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${filtered.length} طلب`);
  }

  return (
    <div className="gx-adm-orders space-y-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: ordersCss }} />

      <QuickFulfill onPick={(o) => setSelected(o)} />

      <div className="gx-adm-card">
        <div className="gx-adm-toolbar mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-bold text-cyan-100 flex items-center gap-2">
              <PackageIcon size={20} className="text-cyan-400" />
              الطلبات
            </div>
            <span className="gx-adm-live"><span className="dot" />مباشر</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/70 pointer-events-none" />
              <Input
                placeholder="بحث برقم / اسم / إيميل / يوزر / واتساب"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="gx-adm-input ps-9 pe-9 w-72"
              />
            </div>
            <button className={`gx-adm-btn-icon ${showFilters ? "active" : ""}`} onClick={() => setShowFilters((v) => !v)} title="فلاتر متقدمة">
              <Filter size={16} />
            </button>
            <button className={`gx-adm-btn-icon ${soundOn ? "active" : ""}`} onClick={() => setSoundOn((v) => !v)} title={soundOn ? "إيقاف الصوت" : "تفعيل الصوت"}>
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button className="gx-adm-btn-icon" onClick={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })} title="تحديث">
              <RefreshCw size={16} className={ordersQ.isFetching ? "animate-spin" : ""} />
            </button>
            <button className="gx-adm-btn-outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download size={14} /> تصدير CSV
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-cyan-300/70 mb-1 block">النطاق الزمني</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="gx-adm-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفترات</SelectItem>
                  <SelectItem value="today">آخر 24 ساعة</SelectItem>
                  <SelectItem value="7d">آخر 7 أيام</SelectItem>
                  <SelectItem value="30d">آخر 30 يوم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-cyan-300/70 mb-1 block">أقل مبلغ (د.أ)</Label>
              <Input type="number" min="0" step="0.5" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="0" className="gx-adm-input" />
            </div>
            <div className="flex items-end">
              <button className="gx-adm-btn-outline w-full justify-center" onClick={() => { setDateRange("all"); setMinAmount(""); setStatusFilter("all"); setSearch(""); }}>
                إعادة تعيين الفلاتر
              </button>
            </div>
          </div>
        )}

        <div className="gx-adm-stats">
          <div className="gx-adm-stat"><div className="l">النتائج</div><div className="v">{stats.count}</div></div>
          <div className="gx-adm-stat"><div className="l">الإجمالي</div><div className="v">{stats.total.toFixed(2)}<span className="text-sm text-cyan-400/70 me-1"> د.أ</span></div></div>
          <div className="gx-adm-stat"><div className="l">قيد الانتظار</div><div className="v text-amber-300">{stats.pending}</div></div>
          <div className="gx-adm-stat"><div className="l">مُسلَّم</div><div className="v text-emerald-300">{stats.delivered}</div></div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(["all", ...STATUSES] as const).map((s) => {
            const on = statusFilter === s;
            const label = s === "all" ? "الكل" : STATUS_AR[s];
            const n = counts[s] ?? 0;
            return (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`gx-adm-chip ${on ? "on" : ""}`}>
                {label}
                {n > 0 && <span className="n">{n}</span>}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-xl border border-cyan-400/10">
          <table className="gx-adm-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>الإيميل</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const Ico = STATUS_ICON[o.status] || Clock;
                return (
                  <tr key={o.id} className={`gx-adm-row ${flashIds.has(o.id) ? "new" : ""}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        {flashIds.has(o.id) && <Bell size={13} className="text-cyan-400 animate-pulse" />}
                        <span className="gx-adm-num">{o.order_number}</span>
                      </div>
                    </td>
                    <td className="text-xs text-cyan-100/70 whitespace-nowrap">{new Date(o.created_at).toLocaleString("ar-EG")}</td>
                    <td>
                      <div className="font-semibold">{o.customer_name || (o.user_id ? "مستخدم مسجّل" : "زائر")}</div>
                      {o.user_username && <div className="text-xs text-cyan-400/70">@{o.user_username}</div>}
                    </td>
                    <td className="text-xs" dir="ltr">
                      {o.user_email ? (
                        <a href={`mailto:${o.user_email}`} className="text-cyan-300 hover:text-cyan-100 hover:underline">{o.user_email}</a>
                      ) : (
                        <span className="text-cyan-100/40">—</span>
                      )}
                    </td>
                    <td className="font-bold">{Number(o.total_jod).toFixed(2)}<span className="text-xs text-cyan-400/70 me-1"> د.أ</span></td>
                    <td>
                      <span className={`gx-adm-badge ${STATUS_COLOR[o.status]}`}>
                        <Ico size={12} />
                        {STATUS_AR[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>
                      <button className="gx-adm-btn-primary" onClick={() => setSelected(o)}>إكمال / تعديل</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="gx-adm-empty">لا يوجد طلبات ضمن الفلاتر الحالية</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <OrderDialog
            order={selected}
            onClose={() => setSelected(null)}
            onSave={(patch) => updateMut.mutate({ id: selected.id, patch }, { onSuccess: () => setSelected(null) })}
          />
        )}
      </div>
    </div>
  );
}

function QuickFulfill({ onPick }: { onPick: (o: OrderWithEmail) => void }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup() {
    const raw = q.trim();
    if (!raw) return;
    const term = raw.toUpperCase();
    setLoading(true);
    const { data, error } = await supabase
      .from("orders").select("*")
      .or(`order_number.eq.${term},order_number.ilike.%${term}%`)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setLoading(false);
    if (error || !data) { toast.error("لم يتم العثور على الطلب"); return; }
    const row = data as OrderRow;
    let email: string | null = null; let uname: string | null = null;
    if (row.user_id) {
      const { data: p } = await supabase.from("profiles").select("email,username").eq("id", row.user_id).maybeSingle();
      email = p?.email ?? null; uname = p?.username ?? null;
    }
    onPick({ ...row, user_email: email, user_username: uname });
  }

  return (
    <div className="gx-adm-card" style={{ borderColor: "rgba(0,229,255,.35)", background: "linear-gradient(180deg,rgba(0,229,255,.08),rgba(0,229,255,.02))" }}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="text-cyan-100 font-bold mb-1">⚡ إكمال طلب برقم الطلب</div>
          <p className="text-xs text-cyan-100/60">إذا وصلك رقم الطلب من واتساب أو إنستغرام أو فيسبوك، افتحه من هنا وأضف الأكواد وسلّمه فيوصل إشعار للعميل تلقائياً.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-2 items-center">
          <Input placeholder="GX-246686" value={q} onChange={(e) => setQ(e.target.value)} className="gx-adm-input w-52 font-mono" dir="ltr" />
          <button type="submit" disabled={loading || !q.trim()} className="gx-adm-btn-primary disabled:opacity-50">
            {loading ? "..." : "فتح الطلب"}
          </button>
        </form>
      </div>
    </div>
  );
}

type DeliveryCode = { label: string; value: string; email?: string; password?: string; kind?: "code" | "account" };

function OrderDialog({ order, onClose, onSave }: { order: OrderWithEmail; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const items = Array.isArray(order.items) ? order.items : [];
  const existingDelivery = order.delivery_data && typeof order.delivery_data === "object" ? order.delivery_data as { codes?: DeliveryCode[] } : {};

  const initialCodes = (() => {
    if (existingDelivery.codes && existingDelivery.codes.length > 0) {
      return existingDelivery.codes.map((c) => ({
        kind: (c.kind || (c.email ? "account" : "code")) as "code" | "account",
        label: c.label || "", value: c.value || "", email: c.email || "", password: c.password || "",
      }));
    }
    const seeded: DeliveryCode[] = [];
    (items as Array<{ name?: string; qty?: number }>).forEach((it) => {
      const qty = Math.max(1, Number(it.qty) || 1);
      for (let k = 0; k < qty; k++) {
        seeded.push({
          kind: "code",
          label: qty > 1 ? `${it.name || "منتج"} (${k + 1}/${qty})` : (it.name || "منتج"),
          value: "", email: "", password: "",
        });
      }
    });
    return seeded.length > 0 ? seeded : [{ kind: "code" as const, label: "", value: "", email: "", password: "" }];
  })();
  const [codes, setCodes] = useState<DeliveryCode[]>(initialCodes);

  function addCode() { setCodes([...codes, { kind: "code", label: "", value: "", email: "", password: "" }]); }
  function addAccount() { setCodes([...codes, { kind: "account", label: "", value: "", email: "", password: "" }]); }
  function updateCode(i: number, patch: Partial<DeliveryCode>) { setCodes(codes.map((c, idx) => idx === i ? { ...c, ...patch } : c)); }
  function removeCode(i: number) { setCodes(codes.filter((_, idx) => idx !== i)); }

  function buildPatch(nextStatus: string) {
    const cleanCodes = codes.map((c) => ({
      kind: c.kind || "code",
      label: (c.label || "").trim(), value: (c.value || "").trim(),
      email: (c.email || "").trim(), password: (c.password || "").trim(),
    })).filter((c) => c.label || c.value || c.email || c.password);
    return { status: nextStatus, admin_notes: notes.trim() || null, delivery_data: { codes: cleanCodes } };
  }
  function save() { onSave(buildPatch(status)); }
  function markDelivered() {
    const anyValue = codes.some((c) => (c.value || "").trim() || (c.email || "").trim() || (c.password || "").trim());
    if (!anyValue && !confirm("ما في أكواد/حسابات مدخلة. تأكد من تسليم الطلب بدون بيانات؟")) return;
    setStatus("delivered"); onSave(buildPatch("delivered"));
  }
  function cancelOrder() {
    if (!confirm("متأكد إنك بدك تلغي هالطلب؟")) return;
    setStatus("cancelled"); onSave(buildPatch("cancelled"));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>الطلب <span className="font-mono text-cyan-400">{order.order_number}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs text-muted-foreground">إكمال سريع لهذا الرقم</div>
                <div className="font-mono text-lg text-cyan-400" dir="ltr">{order.order_number}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={addCode}>+ كود</Button>
                <Button type="button" size="sm" variant="outline" onClick={addAccount}>+ حساب (إيميل)</Button>
                <Button type="button" size="sm" onClick={markDelivered} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  تسليم الطلب
                </Button>
              </div>
            </div>
          </div>

          <div className="text-sm space-y-1">
            <div><b>العميل:</b> {order.customer_name || "زائر"} {order.user_username && <span className="text-muted-foreground">(@{order.user_username})</span>}</div>
            {order.user_email && <div><b>الإيميل:</b> <a href={`mailto:${order.user_email}`} dir="ltr" className="text-cyan-400 hover:underline">{order.user_email}</a></div>}
            {order.customer_whatsapp && <div><b>واتساب:</b> <span dir="ltr">{order.customer_whatsapp}</span></div>}
            <div><b>التاريخ:</b> {new Date(order.created_at).toLocaleString("ar-EG")}</div>
            <div><b>الإجمالي:</b> {Number(order.total_jod).toFixed(2)} د.أ</div>
          </div>

          <div>
            <Label>المنتجات</Label>
            <div className="border rounded p-3 space-y-1 text-sm mt-1">
              {(items as Array<{ name?: string; qty?: number; price?: number; usernames?: string[] }>).map((it, i) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <span>{it.name} × {it.qty}</span>
                    <span>{((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} د.أ</span>
                  </div>
                  {it.usernames && it.usernames.length > 0 && (
                    <div className="text-xs text-muted-foreground mr-3">يوزرات: {it.usernames.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>الحالة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_AR[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label>بيانات التسليم للعميل</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addCode}>+ كود</Button>
                <Button type="button" size="sm" variant="outline" onClick={addAccount}>+ حساب (إيميل)</Button>
              </div>
            </div>
            <div className="space-y-3 mt-2">
              {codes.map((c, i) => {
                const isAccount = c.kind === "account";
                return (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                    <div className="flex gap-2 items-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isAccount ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"}`}>
                        {isAccount ? "حساب" : "كود"}
                      </span>
                      <Input placeholder="الوصف (مثلاً: حساب Netflix / كود PS 25$)" value={c.label} onChange={(e) => updateCode(i, { label: e.target.value })} className="flex-1" />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCode(i)}>×</Button>
                    </div>
                    {isAccount ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input placeholder="الإيميل" dir="ltr" value={c.email || ""} onChange={(e) => updateCode(i, { email: e.target.value })} />
                        <Input placeholder="كلمة السر" dir="ltr" value={c.password || ""} onChange={(e) => updateCode(i, { password: e.target.value })} />
                      </div>
                    ) : (
                      <Input placeholder="القيمة (الكود)" dir="ltr" value={c.value} onChange={(e) => updateCode(i, { value: e.target.value })} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Label>ملاحظة للعميل</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-between items-center gap-2 pt-2 flex-wrap border-t border-white/10 mt-2">
            <div className="flex gap-2 flex-wrap">
              {status !== "cancelled" && (
                <Button variant="outline" onClick={cancelOrder} className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                  ✖ إلغاء الطلب
                </Button>
              )}
              {status !== "delivered" && status !== "cancelled" && (
                <Button onClick={markDelivered} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  ✅ تسليم + إشعار العميل
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={onClose}>إغلاق</Button>
              <Button onClick={save}>حفظ التعديلات</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
