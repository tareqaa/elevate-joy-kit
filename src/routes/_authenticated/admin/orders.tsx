import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pager, usePager } from "@/components/gx/Pager";
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
  Undo2, AlertTriangle, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "الطلبات — لوحة التحكم" }] }),
  component: OrdersAdmin,
});

const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled", "refunded"] as const;
const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", paid: "مدفوع", processing: "قيد التجهيز", delivered: "مُسلَّم", cancelled: "ملغى", refunded: "مُسترجع",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  paid: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  processing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  refunded: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
};
const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock, paid: CreditCard, processing: PackageIcon, delivered: CheckCircle2, cancelled: XCircle, refunded: Undo2,
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
  subtotal_jod?: number | null;
  paid_jod?: number | null;
  discount_jod?: number | null;
  coins_used?: number | null;
  coins_discount_jod?: number | null;
  coins_refunded?: number | null;
  refunded_jod?: number | null;

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

  const pager = usePager(filtered, 10, `${statusFilter}|${dateRange}|${minAmount}|${search}`);

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
                <th>التواصل</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((o) => {
                const Ico = STATUS_ICON[o.status] || Clock;
                const isTg = o.contact_type === "telegram";
                const contactLabel = isTg ? "تيليجرام" : "واتساب";
                const contactHref = o.customer_whatsapp
                  ? (isTg
                      ? `https://t.me/${o.customer_whatsapp.replace(/^@+/, "")}`
                      : `https://wa.me/${o.customer_whatsapp.replace(/[^\d]/g, "")}`)
                  : null;
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
                    <td className="text-xs whitespace-nowrap">
                      {o.customer_whatsapp ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase text-cyan-400/60">{contactLabel}</span>
                          <a
                            href={contactHref ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            dir="ltr"
                            className="text-cyan-300 hover:text-cyan-100 hover:underline font-mono"
                          >
                            {o.customer_whatsapp}
                          </a>
                        </div>
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
                <tr><td colSpan={8} className="gx-adm-empty">لا يوجد طلبات ضمن الفلاتر الحالية</td></tr>
              )}

            </tbody>
          </table>
        </div>

        <Pager page={pager.page} pageCount={pager.pageCount} total={pager.total} size={pager.size}
          onPage={pager.setPage} onSize={pager.setSize} />

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

  const contactHref = order.customer_whatsapp
    ? (order.contact_type === "telegram"
      ? `https://t.me/${order.customer_whatsapp.replace(/^@+/, "")}`
      : `https://wa.me/${order.customer_whatsapp.replace(/[^\d]/g, "")}`)
    : null;
  const contactLabel = order.contact_type === "telegram" ? "تيليجرام" : "واتساب";

  const dialogCss = `
    .gx-od-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    .gx-od-tile{background:rgba(0,229,255,.05);border:1px solid rgba(0,229,255,.15);border-radius:12px;padding:10px 12px}
    .gx-od-tile .k{font-size:10px;color:#7d92a8;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:3px}
    .gx-od-tile .v{font-size:14px;color:#e6f7ff;font-weight:700}
    .gx-od-sec{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px}
    .gx-od-sec-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06)}
    .gx-od-sec-t{font-size:13px;font-weight:800;color:#00e5ff;display:flex;align-items:center;gap:6px}
    .gx-od-item{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.25);font-size:13px}
    .gx-od-item + .gx-od-item{margin-top:6px}
    .gx-od-code{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;position:relative}
    .gx-od-code + .gx-od-code{margin-top:10px}
    .gx-od-actions{position:sticky;bottom:0;background:linear-gradient(180deg,transparent,#0b0e17 40%);padding-top:12px;margin-top:8px}
  `;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0" dir="rtl">
        <style dangerouslySetInnerHTML={{ __html: dialogCss }} />

        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-l from-cyan-500/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className={`gx-adm-badge ${STATUS_COLOR[status]}`}>
                  {STATUS_AR[status] ?? status}
                </span>
                <span className="text-sm text-cyan-100/60">طلب</span>
                <span className="font-mono text-xl text-cyan-300" dir="ltr">{order.order_number}</span>
              </div>
              <div className="text-xs text-cyan-100/60">{new Date(order.created_at).toLocaleString("ar-EG")}</div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary tiles */}
          <div className="gx-od-summary">
            <div className="gx-od-tile">
              <div className="k">العميل</div>
              <div className="v">{order.customer_name || (order.user_id ? "مستخدم مسجّل" : "زائر")}</div>
              {order.user_username && <div className="text-xs text-cyan-400/70 mt-0.5">@{order.user_username}</div>}
            </div>
            <div className="gx-od-tile">
              <div className="k">{contactLabel}</div>
              <div className="v">
                {contactHref ? (
                  <a href={contactHref} target="_blank" rel="noreferrer" dir="ltr" className="text-cyan-300 hover:underline font-mono text-sm">
                    {order.customer_whatsapp}
                  </a>
                ) : <span className="text-cyan-100/40">—</span>}
              </div>
            </div>
            <div className="gx-od-tile">
              <div className="k">الإيميل</div>
              <div className="v text-sm">
                {order.user_email ? (
                  <a href={`mailto:${order.user_email}`} dir="ltr" className="text-cyan-300 hover:underline">{order.user_email}</a>
                ) : <span className="text-cyan-100/40">—</span>}
              </div>
            </div>
            <div className="gx-od-tile">
              <div className="k">الإجمالي</div>
              <div className="v text-emerald-300">{Number(order.total_jod).toFixed(2)} <span className="text-xs text-cyan-400/70">د.أ</span></div>
            </div>
          </div>

          {/* Products */}
          <div className="gx-od-sec">
            <div className="gx-od-sec-h">
              <div className="gx-od-sec-t"><PackageIcon size={14} /> المنتجات ({items.length})</div>
            </div>
            <div>
              {(items as Array<{ name?: string; qty?: number; price?: number; usernames?: string[] }>).map((it, i) => (
                <div key={i} className="gx-od-item">
                  <div>
                    <div className="font-semibold text-cyan-100">{it.name}</div>
                    {it.usernames && it.usernames.length > 0 && (
                      <div className="text-[11px] text-cyan-400/70 mt-0.5">يوزرات: {it.usernames.join(", ")}</div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-cyan-400/70 text-xs">× {it.qty}</div>
                    <div className="font-mono font-bold text-emerald-300">{((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="gx-od-sec">
            <div className="gx-od-sec-h"><div className="gx-od-sec-t"><Clock size={14} /> حالة الطلب</div></div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="gx-adm-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_AR[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery data */}
          <div className="gx-od-sec">
            <div className="gx-od-sec-h">
              <div className="gx-od-sec-t"><CheckCircle2 size={14} /> بيانات التسليم</div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={addCode} className="h-8 text-xs">+ كود</Button>
                <Button type="button" size="sm" variant="outline" onClick={addAccount} className="h-8 text-xs">+ حساب</Button>
              </div>
            </div>
            {codes.length === 0 && <div className="text-xs text-cyan-100/50 text-center py-3">لا يوجد بيانات تسليم — أضف كود أو حساب</div>}
            <div>
              {codes.map((c, i) => {
                const isAccount = c.kind === "account";
                return (
                  <div key={i} className="gx-od-code">
                    <div className="flex gap-2 items-center mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isAccount ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"}`}>
                        {isAccount ? "حساب" : "كود"}
                      </span>
                      <Input placeholder="الوصف (مثلاً: كود PS 25$ / حساب Netflix)" value={c.label} onChange={(e) => updateCode(i, { label: e.target.value })} className="gx-adm-input flex-1 h-9 text-sm" />
                      <button type="button" onClick={() => removeCode(i)} className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10" title="حذف">
                        <XCircle size={16} />
                      </button>
                    </div>
                    {isAccount ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input placeholder="الإيميل" dir="ltr" value={c.email || ""} onChange={(e) => updateCode(i, { email: e.target.value })} className="gx-adm-input h-9 text-sm" />
                        <Input placeholder="كلمة السر" dir="ltr" value={c.password || ""} onChange={(e) => updateCode(i, { password: e.target.value })} className="gx-adm-input h-9 text-sm" />
                      </div>
                    ) : (
                      <Input placeholder="الكود" dir="ltr" value={c.value} onChange={(e) => updateCode(i, { value: e.target.value })} className="gx-adm-input h-9 text-sm font-mono" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="gx-od-sec">
            <div className="gx-od-sec-h"><div className="gx-od-sec-t">📝 ملاحظة للعميل</div></div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="ملاحظة اختيارية تظهر للعميل عند التسليم..." className="gx-adm-input" />
          </div>

          {/* Refund */}
          <AmountsBlock order={order} />

          {/* Refund */}
          <RefundBlock order={order} onDone={onClose} />



          {/* Actions */}
          <div className="gx-od-actions flex justify-between items-center gap-2 flex-wrap border-t border-white/10 pt-4">
            <div className="flex gap-2 flex-wrap">
              {status !== "cancelled" && (
                <Button variant="outline" onClick={cancelOrder} className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                  <XCircle size={15} className="ml-1" /> إلغاء
                </Button>
              )}
              {status === "pending" && (
                <Button onClick={() => { setStatus("paid"); onSave(buildPatch("paid")); }} className="bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/20">
                  <CheckCircle2 size={15} className="ml-1" /> تأكيد الدفع
                </Button>
              )}
              {status !== "delivered" && status !== "cancelled" && (
                <Button onClick={markDelivered} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={15} className="ml-1" /> تسليم + إشعار
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={onClose}>إغلاق</Button>
              <Button onClick={save} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold">حفظ التعديلات</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/**
 * Refund an order. Runs the transactional `admin_refund_order` RPC which
 * reverses every effect of the order (credit, XP, coins, level, badges,
 * avatars, coupons, leaderboard) in a single atomic operation.
 */
function RefundBlock({ order, onDone }: { order: OrderWithEmail; onDone?: () => void }) {
  const qc = useQueryClient();
  const paidTotal = Number(order.paid_jod ?? order.total_jod ?? 0);
  const alreadyRefundedJod = Number(order.refunded_jod ?? 0);
  const maxAmount = Math.max(Math.round((paidTotal - alreadyRefundedJod) * 100) / 100, 0);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const logQ = useQuery({
    queryKey: ["order-refund-log", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refund_log")
        .select("id, amount_jod, xp_removed, coins_removed, level_before, level_after, badges_removed, avatars_locked, coupons_revoked, reason, admin_email, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refunded = (logQ.data ?? []).reduce((s, t) => s + Number(t.amount_jod || 0), 0);
  const alreadyRefunded = order.status === "refunded" || maxAmount <= 0.004;
  const value = Number(amount);
  const amountValid = Number.isFinite(value) && value >= 0 && value <= maxAmount + 0.001;
  const reasonValid = reason.trim().length >= 3;

  async function runRefund() {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_refund_order", {
      _order_id: order.id,
      _amount: value,
      _reason: reason.trim(),
    });
    setBusy(false);
    const res = data as { ok?: boolean; message?: string; xp_removed?: number; coins_removed?: number } | null;
    if (error || !res?.ok) {
      toast.error(error?.message || res?.message || "فشل الاسترجاع — لم يتم تغيير أي بيانات");
      return;
    }
    toast.success(
      `تم الاسترجاع: ${value.toFixed(2)} د.أ` +
      (res.xp_removed ? ` • سحب ${res.xp_removed} XP` : "") +
      (res.coins_removed ? ` • سحب ${res.coins_removed} GX` : ""),
    );
    setConfirmOpen(false);
    setReason("");
    qc.invalidateQueries({ queryKey: ["order-refund-log", order.id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-loyalty-customers"] });
    qc.invalidateQueries({ queryKey: ["admin-credit-log"] });
    onDone?.();
  }

  return (
    <div className="gx-od-sec">
      <div className="gx-od-sec-h">
        <div className="gx-od-sec-t"><Undo2 size={14} /> استرجاع الطلب (Refund)</div>
        {refunded > 0 && (
          <span className="gx-adm-badge bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40">
            مُسترجع: {refunded.toFixed(2)} د.أ
          </span>
        )}
      </div>

      {alreadyRefunded ? (
        <div className="text-xs text-fuchsia-200/80">تم استرجاع هذا الطلب — لا يمكن استرجاعه مرة ثانية.</div>
      ) : !order.user_id ? (
        <div className="text-xs text-cyan-100/50">طلب زائر غير مسجّل — الاسترجاع للرصيد متاح فقط للعملاء المسجّلين.</div>
      ) : (
        <>
          <p className="text-[11px] text-cyan-100/55 mb-3 leading-relaxed">
            الاسترجاع بيرجّع قيمة الطلب لرصيد العميل، وبنفس الوقت بيسحب تلقائياً كل ما منحه هذا الطلب:
            نقاط الخبرة، عملات GX، تقدّم المستوى، الكوبونات غير المستخدمة، الشارات والأفاتارات غير المستحقة، ويحدّث ترتيب المتصدرين.
          </p>

          <div className="grid sm:grid-cols-[150px_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-[11px] text-cyan-100/60">المبلغ (د.أ)</Label>
              <Input dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="gx-adm-input h-9 text-sm font-mono" />
              {!amountValid && <div className="text-[10px] text-rose-400 mt-1">المبلغ لازم يكون بين 0 و {maxAmount.toFixed(2)}</div>}
            </div>
            <div>
              <Label className="text-[11px] text-cyan-100/60">سبب الاسترجاع (إلزامي)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="مثلاً: الكود ما اشتغل مع العميل" className="gx-adm-input h-9 text-sm" />
            </div>
            <Button onClick={() => setConfirmOpen(true)} disabled={!amountValid || !reasonValid}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold h-9 disabled:opacity-45">
              <Undo2 size={14} className="ml-1" /> استرجاع
            </Button>
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            {[0.25, 0.5, 1].map((r) => (
              <button key={r} type="button" className="gx-adm-chip"
                onClick={() => setAmount((maxAmount * r).toFixed(2))}>
                {r === 1 ? "كامل المبلغ" : `${r * 100}%`}
              </button>
            ))}
          </div>

          <Dialog open={confirmOpen} onOpenChange={(v) => { if (!busy) setConfirmOpen(v); }}>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-fuchsia-300">
                  <AlertTriangle size={18} /> تأكيد استرجاع الطلب
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-cyan-100/70 leading-relaxed">
                رح يتم استرجاع <b className="text-fuchsia-300 font-mono">{value.toFixed(2)} د.أ</b> لرصيد العميل على الطلب
                <span className="font-mono text-cyan-300" dir="ltr"> {order.order_number}</span>، وسحب كل مكافآت هذا الطلب
                (XP، GX Coins، المستوى، الشارات، الأفاتارات، الكوبونات غير المستخدمة).
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-cyan-100/70 space-y-1">
                <div>السبب: <span className="text-cyan-100">{reason.trim()}</span></div>
                <div className="text-[11px] text-amber-300/80">هذه العملية غير قابلة للتراجع، وبتتنفذ كوحدة واحدة — إذا فشل أي جزء ما بيتغير أي شي.</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy}>إلغاء</Button>
                <Button onClick={runRefund} disabled={busy} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">
                  {busy ? <><Loader2 size={14} className="ml-1 animate-spin" /> جاري التنفيذ…</> : "تأكيد الاسترجاع"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {(logQ.data ?? []).length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-cyan-300/60 font-bold">سجل الاسترجاعات</div>
          {(logQ.data ?? []).map((t) => (
            <div key={t.id} className="rounded-lg bg-black/30 border border-white/8 p-2.5 text-xs space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-cyan-100/80">{t.reason}</span>
                <span className="font-mono font-bold text-fuchsia-300">{Number(t.amount_jod).toFixed(2)} د.أ</span>
              </div>
              <div className="text-[10.5px] text-cyan-100/45 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{new Date(t.created_at).toLocaleString("ar-EG")}</span>
                {t.admin_email && <span dir="ltr">{t.admin_email}</span>}
                {t.xp_removed > 0 && <span>−{t.xp_removed} XP</span>}
                {t.coins_removed > 0 && <span>−{t.coins_removed} GX</span>}
                {t.level_before !== t.level_after && <span>المستوى: {t.level_before} ← {t.level_after}</span>}
                {t.badges_removed > 0 && <span>شارات مسحوبة: {t.badges_removed}</span>}
                {t.avatars_locked > 0 && <span>أفاتار مقفول: {t.avatars_locked}</span>}
                {t.coupons_revoked > 0 && <span>كوبونات ملغاة: {t.coupons_revoked}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
