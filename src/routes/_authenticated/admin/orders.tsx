import { csvRow } from "@/lib/gx/csv";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
  Undo2, AlertTriangle, Loader2, ShieldAlert, Ban, ShieldCheck, Monitor, Mail, Copy, Eye, Lock,
  Calendar, Globe, KeyRound, Check, DollarSign, Plus, ChevronDown, ChevronUp, Send, Pencil,
  Trash2, Minus, Save,
} from "lucide-react";
import { sendOrderStatusEmail, sendPaymentConfirmedEmail, sendIncompleteOrderPaymentEmail, getOrderSecretLinkFn } from "@/lib/gx/order-email.functions";
import { detectRegionCode, formatFullRegion } from "@/lib/gx/region";

const QUICK_CATALOG_PRESETS = [
  // iTunes / Apple
  { name: "بطاقات آيتونز ($5 أمريكي)", price: 4.15, slug: "itunes" },
  { name: "بطاقات آيتونز ($10 أمريكي)", price: 8.00, slug: "itunes" },
  { name: "بطاقات آيتونز ($15 أمريكي)", price: 11.50, slug: "itunes" },
  { name: "بطاقات آيتونز ($20 أمريكي)", price: 15.00, slug: "itunes" },
  { name: "بطاقات آيتونز ($25 أمريكي)", price: 18.75, slug: "itunes" },
  { name: "بطاقات آيتونز ($50 أمريكي)", price: 37.00, slug: "itunes" },
  { name: "بطاقات آيتونز ($100 أمريكي)", price: 73.00, slug: "itunes" },
  // PlayStation
  { name: "بطاقات بلايستيشن ($10 أمريكي)", price: 8.00, slug: "playstation" },
  { name: "بطاقات بلايستيشن ($20 أمريكي)", price: 15.00, slug: "playstation" },
  { name: "بطاقات بلايستيشن ($25 أمريكي)", price: 18.75, slug: "playstation" },
  { name: "بطاقات بلايستيشن ($50 أمريكي)", price: 37.00, slug: "playstation" },
  { name: "بطاقات بلايستيشن ($100 أمريكي)", price: 73.00, slug: "playstation" },
  // Xbox
  { name: "بطاقات إكسبوكس ($10 أمريكي)", price: 7.75, slug: "xbox" },
  { name: "بطاقات إكسبوكس ($15 أمريكي)", price: 11.25, slug: "xbox" },
  { name: "بطاقات إكسبوكس ($25 أمريكي)", price: 18.00, slug: "xbox" },
  { name: "بطاقات إكسبوكس ($50 أمريكي)", price: 36.00, slug: "xbox" },
  { name: "Xbox Game Pass Ultimate (1 شهر)", price: 8.50, slug: "xbox-game-pass-ultimate" },
  // Razer Gold
  { name: "بطاقات ريزر جولد ($5 أمريكي)", price: 4.10, slug: "razer-gold" },
  { name: "بطاقات ريزر جولد ($10 أمريكي)", price: 8.00, slug: "razer-gold" },
  { name: "بطاقات ريزر جولد ($20 أمريكي)", price: 15.50, slug: "razer-gold" },
  { name: "بطاقات ريزر جولد ($50 أمريكي)", price: 38.00, slug: "razer-gold" },
  // Steam
  { name: "بطاقات ستيم ($5 أمريكي)", price: 4.25, slug: "steam" },
  { name: "بطاقات ستيم ($10 أمريكي)", price: 8.25, slug: "steam" },
  { name: "بطاقات ستيم ($20 أمريكي)", price: 16.00, slug: "steam" },
  { name: "بطاقات ستيم ($50 أمريكي)", price: 39.00, slug: "steam" },
  // Games & Top-ups
  { name: "روبلوكس (800 Robux)", price: 7.50, slug: "roblox" },
  { name: "روبلوكس (1000 Robux)", price: 9.00, slug: "roblox" },
  { name: "روبلوكس (2000 Robux)", price: 17.50, slug: "roblox" },
  { name: "فورتنايت (1000 V-Bucks)", price: 7.50, slug: "fortnite" },
  // Subscriptions
  { name: "اشتراك TOD بجميع الباقات (12 شهر)", price: 29.00, slug: "tod" },
  { name: "يوتيوب بريميوم (12 شهر)", price: 14.00, slug: "youtube-premium" },
  { name: "شاهد VIP شامل الباقات (12 شهر)", price: 22.00, slug: "shahid-vip" },
  { name: "ديسكورد نيترو (1 شهر)", price: 3.50, slug: "discord-nitro" },
  { name: "حساب Microsoft 365 (12 شهر)", price: 7.00, slug: "microsoft-365" },
];


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
  customer_email?: string | null;
  delivery_data: unknown;
  subtotal_jod?: number | null;
  paid_jod?: number | null;
  discount_jod?: number | null;
  coins_used?: number | null;
  coins_discount_jod?: number | null;
  coins_refunded?: number | null;
  refunded_jod?: number | null;
  client_ip?: string | null;
  user_agent?: string | null;
  client_meta?: Record<string, unknown> | null;
  codes_revealed_at?: string | null;
  codes_last_revealed_at?: string | null;
  codes_reveal_count?: number | null;

  created_at: string;
};

function formatOrderFullDateTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const datePart = d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return `${timePart} (${datePart})`;
  } catch {
    return isoStr;
  }
}

function formatOrderTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function formatRevealDateTime(isoStr?: string | null): { date: string; time: string; full: string } {
  if (!isoStr) return { date: "—", time: "—", full: "—" };
  try {
    const d = new Date(isoStr);
    const date = d.toLocaleDateString("ar-EG", {
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const time = d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return { date, time, full: `${time} • ${date}` };
  } catch {
    return { date: isoStr, time: isoStr, full: isoStr };
  }
}

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
  const body = rows.map((r) => csvRow(cols.map((c) => (r as unknown as Record<string, unknown>)[c]))).join("\n");
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
      return rows.map<OrderWithEmail>((r) => {
        const guestEmail = r.customer_email || ((r.delivery_data && typeof r.delivery_data === "object") ? (r.delivery_data as Record<string, unknown>).customer_email as string : null) || null;
        return {
          ...r,
          user_email: r.user_id ? (profilesMap[r.user_id]?.email ?? guestEmail) : guestEmail,
          user_username: r.user_id ? profilesMap[r.user_id]?.username ?? null : null,
        };
      });
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
                <th>كشف واستلام الكود</th>
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
                      {o.user_email || o.customer_email ? (
                        <a href={`mailto:${o.user_email || o.customer_email}`} className="text-cyan-300 hover:text-cyan-100 hover:underline">{o.user_email || o.customer_email}</a>
                      ) : (
                        <span className="text-cyan-100/40">—</span>
                      )}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      {o.customer_whatsapp ? (
                        <div className="flex flex-col gap-1 items-start">
                          <a
                            href={contactHref ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            dir="ltr"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-100 font-mono font-bold transition shadow-sm"
                            title={`فتح محادثة ${contactLabel} مع العميل`}
                          >
                            <span>{isTg ? "✈️" : "💬"}</span>
                            <span>{o.customer_whatsapp}</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-cyan-100/40">—</span>
                      )}
                    </td>
                    <td className="font-bold">
                      {(() => {
                        const delData = o.delivery_data && typeof o.delivery_data === "object" ? (o.delivery_data as any) : {};
                        const feeJod = Number(delData.fee_jod || 0);
                        const totalWithFee = Number(delData.total_with_fee_jod || (Number(o.total_jod) + feeJod));
                        if (feeJod > 0) {
                          return (
                            <div>
                              <div className="text-white font-mono text-sm font-extrabold">
                                {totalWithFee.toFixed(2)}
                                <span className="text-xs text-cyan-400/80 me-1"> د.أ</span>
                              </div>
                              <div className="text-[10px] text-amber-300 font-mono">
                                (شامل ضريبة 3%: +{feeJod.toFixed(2)})
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div>{Number(o.total_jod).toFixed(2)}<span className="text-xs text-cyan-400/70 me-1"> د.أ</span></div>
                        );
                      })()}
                      {(() => {
                        const delData = o.delivery_data && typeof o.delivery_data === "object" ? (o.delivery_data as any) : {};
                        const pm = (delData.payment_method || "").toLowerCase();
                        if (pm === "binance_pay" || pm === "binance") {
                          return (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[10px] font-extrabold bg-amber-500/20 text-yellow-300 border border-amber-500/40 px-1.5 py-0.2 rounded whitespace-nowrap">
                                🟡 Binance Pay
                              </span>
                              {delData.total_usdt && (
                                <span className="text-[10px] font-mono text-white/90">
                                  {delData.total_usdt}U
                                </span>
                              )}
                            </div>
                          );
                        }
                        if (pm === "cliq") {
                          return (
                            <div className="mt-0.5">
                              <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded whitespace-nowrap">
                                🇯🇴 كليك
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td>
                      <span className={`gx-adm-badge ${STATUS_COLOR[o.status]}`}>
                        <Ico size={12} />
                        {STATUS_AR[o.status] ?? o.status}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const delData = o.delivery_data && typeof o.delivery_data === "object" ? (o.delivery_data as any) : {};
                        const rowCodes: any[] = Array.isArray(delData.codes) ? delData.codes : [];
                        const isRowTopup = rowCodes.length > 0 && rowCodes.every((c: any) => c.kind === "topup");

                        if (isRowTopup) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 whitespace-nowrap">
                              <CheckCircle2 size={11} className="text-emerald-400" />
                              <span>شحن مباشر ✓</span>
                            </span>
                          );
                        }

                        const totalCodes = rowCodes.length;
                        const revCodes = rowCodes.filter((c: any) => Boolean(c.revealed_at));
                        const revCount = revCodes.length;
                        const lastRevCode = revCodes.slice().sort((a, b) => new Date(b.revealed_at).getTime() - new Date(a.revealed_at).getTime())[0];
                        const displayDate = lastRevCode?.revealed_at || o.codes_revealed_at;
                        const displayIp = lastRevCode?.revealed_ip || delData.last_reveal_ip || o.client_ip;

                        if (totalCodes > 0) {
                          if (revCount === totalCodes) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/35 whitespace-nowrap shadow-sm"
                                  title={`كُشفت جميع الأكواد (${totalCodes}/${totalCodes})${displayIp ? ` • IP: ${displayIp}` : ""}${displayDate ? ` • ${formatRevealDateTime(displayDate).full}` : ""}`}
                                >
                                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                  <span>كُشفت كلها ({totalCodes}/{totalCodes})</span>
                                </span>
                                {displayDate && (
                                  <span className="text-[10px] text-cyan-200/80 font-mono">
                                    {formatOrderTime(displayDate)}
                                    {displayIp ? ` • ${displayIp}` : ""}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          if (revCount > 0) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded-lg border border-cyan-500/35 whitespace-nowrap shadow-sm"
                                  title={`كُشف ${revCount} من أصل ${totalCodes} كود${displayIp ? ` • IP: ${displayIp}` : ""}${displayDate ? ` • ${formatRevealDateTime(displayDate).full}` : ""}`}
                                >
                                  <Eye size={12} className="text-cyan-400 shrink-0" />
                                  <span>كُشف {revCount} من {totalCodes}</span>
                                </span>
                                <span className="text-[10px] text-amber-300/90 font-mono">
                                  {totalCodes - revCount} كود مقفل
                                  {displayDate ? ` • ${formatOrderTime(displayDate)}` : ""}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/80 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 whitespace-nowrap"
                              title={`يوجد ${totalCodes} كود لم يقم العميل بفتح أي منها بعد`}
                            >
                              <Lock size={11} className="text-amber-400" />
                              <span>لم يُكشف (0/{totalCodes})</span>
                            </span>
                          );
                        }

                        if (o.codes_revealed_at) {
                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/35 whitespace-nowrap shadow-sm">
                                <Eye size={12} className="text-emerald-400 shrink-0" />
                                <span>انفتح: {formatOrderTime(o.codes_revealed_at)}</span>
                              </span>
                              <span className="text-[10px] text-cyan-200/70 font-mono">
                                {new Date(o.codes_revealed_at).toLocaleDateString("ar-EG", { month: "numeric", day: "numeric" })}
                              </span>
                            </div>
                          );
                        }

                        if (o.status === "delivered") {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/70 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                              <Lock size={11} className="text-amber-400" />
                              <span>لم يُكشف بعد</span>
                            </span>
                          );
                        }

                        return <span className="text-cyan-100/30 text-xs">—</span>;
                      })()}
                    </td>
                    <td>
                      <button className="gx-adm-btn-primary" onClick={() => setSelected(o)}>إكمال / تعديل</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="gx-adm-empty">لا يوجد طلبات ضمن الفلاتر الحالية</td></tr>
              )}

            </tbody>
          </table>
        </div>

        <Pager page={pager.page} pageCount={pager.pageCount} total={pager.total} size={pager.size}
          onPage={pager.setPage} onSize={pager.setSize} />

        {selected && (
          <OrderDialog
            order={ordersQ.data?.find((x) => x.id === selected.id) || selected}
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
    let email: string | null = row.customer_email || ((row.delivery_data && typeof row.delivery_data === "object") ? (row.delivery_data as Record<string, unknown>).customer_email as string : null) || null;
    let uname: string | null = null;
    if (row.user_id) {
      const { data: p } = await supabase.from("profiles").select("email,username").eq("id", row.user_id).maybeSingle();
      email = p?.email ?? email; uname = p?.username ?? null;
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

type CodeKind = "code" | "account" | "topup";
type DeliveryCode = {
  label: string;
  value: string;
  email?: string;
  password?: string;
  kind?: CodeKind;
  region?: string;
  extra?: string;
  revealed_at?: string | null;
  revealed_ip?: string | null;
  revealed_country?: string | null;
  revealed_city?: string | null;
  revealed_ua?: string | null;
  reveal_count?: number | null;
  last_revealed_at?: string | null;
  last_revealed_ip?: string | null;
  status?: "active" | "cancelled" | "refunded";
  is_cancelled?: boolean;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  backup_email?: string;
  backup_code?: string;
  extra_fields?: Array<{ label: string; value: string }>;
  notes?: string;
};

function OrderDialog({ order, onClose, onSave }: { order: OrderWithEmail; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const initialEmailLang = (order.delivery_data && typeof order.delivery_data === "object" && (order.delivery_data as any).lang === "en") ? "en" : "ar";
  const [emailLang, setEmailLang] = useState<"ar" | "en">(initialEmailLang);

  useEffect(() => {
    const dLang = order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).lang : null;
    if (dLang === "en" || dLang === "ar") {
      setEmailLang(dLang);
    }
  }, [order.id, (order.delivery_data as any)?.lang]);

  const [showFinancialTools, setShowFinancialTools] = useState(false);

  type EditableOrderItem = {
    cartId?: string;
    id?: string;
    name: string;
    qty: number;
    price: number;
    product_slug?: string | null;
    slug?: string | null;
    usernames?: string[] | null;
    region?: string | null;
  };

  const [isEditingItems, setIsEditingItems] = useState(false);
  const [localItems, setLocalItems] = useState<EditableOrderItem[]>(() => {
    return (Array.isArray(order.items) ? order.items : []).map((it: any) => ({
      cartId: it.cartId || it.id || "",
      name: it.name || "منتج",
      qty: Math.max(1, Number(it.qty || it.quantity || 1)),
      price: Number(it.price || 0),
      product_slug: it.product_slug || it.slug || "",
      usernames: it.usernames || null,
      region: it.region || "",
    }));
  });
  const [localTotal, setLocalTotal] = useState(Number(order.total_jod || 0));
  const [localSubtotal, setLocalSubtotal] = useState(Number(order.subtotal_jod ?? order.total_jod ?? 0));
  const [isReverting, setIsReverting] = useState(false);

  // Synchronize localItems and totals whenever order updates in cache/database
  useEffect(() => {
    if (!isEditingItems) {
      const itemsArr = Array.isArray(order.items) ? order.items : [];
      setLocalItems(itemsArr.map((it: any) => ({
        cartId: it.cartId || it.id || "",
        name: it.name || "منتج",
        qty: Math.max(1, Number(it.qty || it.quantity || 1)),
        price: Number(it.price || 0),
        product_slug: it.product_slug || it.slug || "",
        usernames: it.usernames || null,
        region: it.region || "",
      })));
      setLocalTotal(Number(order.total_jod || 0));
      setLocalSubtotal(Number(order.subtotal_jod ?? order.total_jod ?? 0));
    }
  }, [order.items, order.total_jod, order.subtotal_jod, isEditingItems]);

  // Edit draft state
  const [draftItems, setDraftItems] = useState<EditableOrderItem[]>([]);
  const [draftSubtotal, setDraftSubtotal] = useState<number>(0);
  const [draftTotal, setDraftTotal] = useState<number>(0);
  const [manualTotalOverride, setManualTotalOverride] = useState(false);
  const [autoSyncCodes, setAutoSyncCodes] = useState(true);
  const [isSavingItems, setIsSavingItems] = useState(false);

  // Quick add state
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>("");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");

  const startEditingItems = () => {
    const cloned = localItems.map((it) => ({ ...it }));
    setDraftItems(cloned);
    const sub = cloned.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    const roundedSub = Math.round(sub * 1000) / 1000;
    setDraftSubtotal(roundedSub);
    const discount = Number(order.discount_jod || 0);
    const roundedTot = Math.max(0, Math.round((roundedSub - discount) * 1000) / 1000);
    setDraftTotal(roundedTot);
    setManualTotalOverride(false);
    setIsEditingItems(true);
  };

  const updateDraftSubtotalAndTotal = (items: EditableOrderItem[], overrideTotal?: number) => {
    const sub = items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    const roundedSub = Math.round(sub * 1000) / 1000;
    setDraftSubtotal(roundedSub);
    if (overrideTotal != null) {
      setDraftTotal(overrideTotal);
    } else if (!manualTotalOverride) {
      const discount = Number(order.discount_jod || 0);
      const roundedTot = Math.max(0, Math.round((roundedSub - discount) * 1000) / 1000);
      setDraftTotal(roundedTot);
    }
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty < 1 || newQty > 99) return;
    const next = draftItems.map((item, i) => (i === index ? { ...item, qty: newQty } : item));
    setDraftItems(next);
    updateDraftSubtotalAndTotal(next);
  };

  const handleItemPriceChange = (index: number, priceStr: string) => {
    const p = parseFloat(priceStr);
    const next = draftItems.map((item, i) => (i === index ? { ...item, price: isNaN(p) ? 0 : p } : item));
    setDraftItems(next);
    updateDraftSubtotalAndTotal(next);
  };

  const handleItemNameChange = (index: number, name: string) => {
    const next = draftItems.map((item, i) => (i === index ? { ...item, name } : item));
    setDraftItems(next);
  };

  const handleRemoveItem = (index: number) => {
    if (draftItems.length <= 1) {
      toast.error("يجب أن يحتوي الطلب على صنف واحد على الأقل");
      return;
    }
    const next = draftItems.filter((_, i) => i !== index);
    setDraftItems(next);
    updateDraftSubtotalAndTotal(next);
  };

  const handleAddPresetItem = () => {
    if (selectedPresetIndex === "") return;
    const idx = parseInt(selectedPresetIndex, 10);
    const preset = QUICK_CATALOG_PRESETS[idx];
    if (!preset) return;
    const newItem: EditableOrderItem = {
      cartId: `${preset.slug}-${Date.now()}`,
      product_slug: preset.slug,
      name: preset.name,
      qty: 1,
      price: preset.price,
    };
    const next = [...draftItems, newItem];
    setDraftItems(next);
    updateDraftSubtotalAndTotal(next);
    setSelectedPresetIndex("");
    toast.success(`تمت إضافة "${preset.name}" إلى مسودة الطلب`);
  };

  const handleAddCustomItem = () => {
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice);
    const qty = parseInt(customItemQty, 10) || 1;
    if (!name) {
      toast.error("يرجى كتابة اسم المنتج");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("يرجى تحديد سعر صالح للمنتج");
      return;
    }
    const newItem: EditableOrderItem = {
      cartId: `custom-${Date.now()}`,
      name,
      qty: Math.max(1, Math.min(99, qty)),
      price,
    };
    const next = [...draftItems, newItem];
    setDraftItems(next);
    updateDraftSubtotalAndTotal(next);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
    toast.success(`تمت إضافة "${name}" إلى مسودة الطلب`);
  };

  const handleCancelEditingDraft = () => {
    setDraftItems(localItems.map((it) => ({ ...it })));
    setDraftSubtotal(localSubtotal);
    setDraftTotal(localTotal);
    setManualTotalOverride(false);
    setSelectedPresetIndex("");
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
    setIsEditingItems(false);
    toast.info("تم إلغاء التعديل والعودة دون تطبيق أي تغييرات");
  };

  const handleSaveDraftItems = async () => {
    if (draftItems.length === 0) {
      toast.error("لا يمكن حفظ الطلب بدون منتجات");
      return;
    }
    setIsSavingItems(true);
    try {
      const cleanItems = draftItems.map((it) => ({
        cartId: it.cartId || it.product_slug || "custom-item",
        product_slug: it.product_slug || null,
        name: it.name.trim() || "منتج",
        qty: Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1))),
        price: Math.max(0, Math.round(Number(it.price || 0) * 1000) / 1000),
        usernames: it.usernames || null,
        region: it.region || null,
      }));

      const existingDel = order.delivery_data && typeof order.delivery_data === "object"
        ? (order.delivery_data as Record<string, unknown>)
        : {};

      let newDeliveryData = { ...existingDel };

      // Snapshot original order data before first edit so admin can revert at any time!
      if (!existingDel.original_items) {
        newDeliveryData.original_items = (Array.isArray(order.items) && order.items.length > 0) ? order.items : localItems;
        newDeliveryData.original_total_jod = order.total_jod ?? localTotal;
        newDeliveryData.original_subtotal_jod = order.subtotal_jod ?? localSubtotal;
        newDeliveryData.original_codes = existingDel.codes || codes;
      }
      newDeliveryData.is_edited_by_admin = true;
      newDeliveryData.last_edited_at = new Date().toISOString();

      // Recalculate fees if Binance Pay
      const pm = (existingDel.payment_method || "").toString().toLowerCase();
      if (pm === "binance_pay" || pm === "binance") {
        const feeJod = Math.round((draftTotal * 0.03) * 1000) / 1000;
        const totalWithFee = Math.round((draftTotal + feeJod) * 1000) / 1000;
        newDeliveryData.fee_jod = feeJod;
        newDeliveryData.total_with_fee_jod = totalWithFee;
        newDeliveryData.fee_rate = "3%";
        newDeliveryData.tax_amount = feeJod;
        newDeliveryData.total_usdt = (totalWithFee * 1.41).toFixed(2);
      }

      // Sync codes if autoSyncCodes is checked
      let updatedCodes = [...codes];
      if (autoSyncCodes) {
        cleanItems.forEach((it) => {
          const qty = it.qty || 1;
          const detected = detectRegionCode({
            region: it.region,
            cartId: it.cartId,
            name: it.name,
            slug: it.product_slug,
          });
          const defaultReg = detected === "global" ? "Global" : detected.toUpperCase();
          const existingMatches = updatedCodes.filter((c) => c.label && c.label.includes(it.name)).length;
          const needed = qty - existingMatches;
          for (let k = 0; k < needed; k++) {
            updatedCodes.push({
              kind: "code",
              label: qty > 1 ? `${it.name} (${existingMatches + k + 1}/${qty})` : it.name,
              value: "",
              email: "",
              password: "",
              extra: "",
              region: defaultReg,
            });
          }
        });
        newDeliveryData.codes = updatedCodes;
        setCodes(updatedCodes);
      }

      const patch: Record<string, unknown> = {
        items: cleanItems,
        subtotal_jod: draftSubtotal,
        total_jod: draftTotal,
        delivery_data: newDeliveryData,
      };

      const { error } = await supabase
        .from("orders")
        .update(patch as never)
        .eq("id", order.id);

      if (error) throw error;

      setLocalItems(cleanItems);
      setLocalSubtotal(draftSubtotal);
      setLocalTotal(draftTotal);
      setIsEditingItems(false);
      toast.success(`تم تحديث منتجات وقيمة الطلب بنجاح — الإجمالي: ${draftTotal.toFixed(2)} د.أ ✓`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleRevertToOriginalOrder = async () => {
    const existingDel = order.delivery_data && typeof order.delivery_data === "object"
      ? (order.delivery_data as Record<string, unknown>)
      : {};

    const origItems = existingDel.original_items as any[];
    const origTotal = Number(existingDel.original_total_jod ?? order.total_jod ?? 0);
    const origSubtotal = Number(existingDel.original_subtotal_jod ?? order.subtotal_jod ?? origTotal);
    const origCodes = (existingDel.original_codes as DeliveryCode[]) || [];

    if (!origItems || !Array.isArray(origItems) || origItems.length === 0) {
      toast.error("لا توجد نسخة أصلية محفوظة مسبقاً لهذا الطلب. يمكنك تعديل الكمية يدوياً وحفظها.");
      return;
    }

    if (!confirm("هل أنت متأكد من التراجع عن جميع التعديلات واسترجاع الطلب الأصلي كما اشتراه العميل؟")) {
      return;
    }

    setIsReverting(true);
    try {
      const newDel = { ...existingDel };
      newDel.is_edited_by_admin = false;
      newDel.reverted_at = new Date().toISOString();
      delete newDel.original_items;
      delete newDel.original_total_jod;
      delete newDel.original_subtotal_jod;
      delete newDel.original_codes;
      if (origCodes.length > 0) {
        newDel.codes = origCodes;
      }

      // If Binance Pay, recalculate fee for original amount
      const pm = (existingDel.payment_method || "").toString().toLowerCase();
      if (pm === "binance_pay" || pm === "binance") {
        const feeJod = Math.round((origTotal * 0.03) * 1000) / 1000;
        const totalWithFee = Math.round((origTotal + feeJod) * 1000) / 1000;
        newDel.fee_jod = feeJod;
        newDel.total_with_fee_jod = totalWithFee;
        newDel.fee_rate = "3%";
        newDel.tax_amount = feeJod;
        newDel.total_usdt = (totalWithFee * 1.41).toFixed(2);
      }

      const patch: Record<string, unknown> = {
        items: origItems,
        subtotal_jod: origSubtotal,
        total_jod: origTotal,
        delivery_data: newDel,
      };

      const { error } = await supabase
        .from("orders")
        .update(patch as never)
        .eq("id", order.id);

      if (error) throw error;

      const restoredLocal = origItems.map((it: any) => ({
        cartId: it.cartId || it.id || "",
        name: it.name || "منتج",
        qty: Math.max(1, Number(it.qty || it.quantity || 1)),
        price: Number(it.price || 0),
        product_slug: it.product_slug || it.slug || "",
        usernames: it.usernames || null,
        region: it.region || "",
      }));

      setLocalItems(restoredLocal);
      setLocalSubtotal(origSubtotal);
      setLocalTotal(origTotal);
      if (origCodes.length > 0) {
        setCodes(origCodes);
      }
      setIsEditingItems(false);
      onSave(patch);
      toast.success(`تم التراجع عن التعديل واسترجاع الأصناف والقيمة الأصلية (${origTotal.toFixed(2)} د.أ) بنجاح ✓`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء استرجاع الطلب الأصلي");
    } finally {
      setIsReverting(false);
    }
  };

  const existingDelivery = order.delivery_data && typeof order.delivery_data === "object" ? order.delivery_data as { codes?: DeliveryCode[] } : {};

  const initialCodes = (() => {
    if (existingDelivery.codes && existingDelivery.codes.length > 0) {
      return existingDelivery.codes.map((c: any) => ({
        kind: (c.kind || (c.email ? "account" : "code")) as CodeKind,
        label: c.label || "",
        value: c.value || "",
        email: c.email || "",
        password: c.password || "",
        extra: c.extra || (c.kind === "account" && c.value ? c.value : "") || "",
        region: c.region || "",
        revealed_at: c.revealed_at ?? null,
        revealed_ip: c.revealed_ip ?? null,
        revealed_country: c.revealed_country ?? null,
        revealed_city: c.revealed_city ?? null,
        revealed_ua: c.revealed_ua ?? null,
        reveal_count: c.reveal_count ?? null,
        last_revealed_at: c.last_revealed_at ?? null,
        last_revealed_ip: c.last_revealed_ip ?? null,
        status: (c.is_cancelled || c.status === "cancelled" || c.status === "refunded") ? "cancelled" : (c.status || "active"),
        is_cancelled: Boolean(c.is_cancelled || c.status === "cancelled" || c.status === "refunded"),
        cancelled_at: c.cancelled_at ?? null,
        cancel_reason: c.cancel_reason ?? null,
        backup_email: c.backup_email || "",
        backup_code: c.backup_code || "",
        extra_fields: Array.isArray(c.extra_fields) ? c.extra_fields : [],
        notes: c.notes || "",
      }));
    }
    const seeded: DeliveryCode[] = [];
    (localItems as Array<{ name?: string; qty?: number; cartId?: string; id?: string; slug?: string; product_slug?: string; region?: string }>).forEach((it) => {
      const qty = Math.max(1, Number(it.qty) || 1);
      const detected = detectRegionCode({
        region: it.region,
        cartId: it.cartId || it.id,
        name: it.name,
        slug: it.product_slug || it.slug,
      });
      const defaultReg = detected === "global" ? "Global" : detected.toUpperCase();
      for (let k = 0; k < qty; k++) {
        seeded.push({
          kind: "code",
          label: qty > 1 ? `${it.name || "منتج"} (${k + 1}/${qty})` : (it.name || "منتج"),
          value: "", email: "", password: "", extra: "", region: defaultReg,
        });
      }
    });
    return seeded.length > 0 ? seeded : [{ kind: "code" as const, label: "", value: "", email: "", password: "", extra: "", region: "Global" }];
  })();
  const [codes, setCodes] = useState<DeliveryCode[]>(initialCodes);
  const [copyingLink, setCopyingLink] = useState(false);

  const [revealInfo, setRevealInfo] = useState<{
    revealed_at: string | null;
    last_revealed_at: string | null;
    count: number;
    loading: boolean;
  }>({
    revealed_at: order.codes_revealed_at ?? null,
    last_revealed_at: order.codes_last_revealed_at ?? null,
    count: order.codes_reveal_count ?? 0,
    loading: false,
  });

  useEffect(() => {
    setRevealInfo({
      revealed_at: order.codes_revealed_at ?? null,
      last_revealed_at: order.codes_last_revealed_at ?? null,
      count: order.codes_reveal_count ?? 0,
      loading: false,
    });
  }, [order.codes_revealed_at, order.codes_last_revealed_at, order.codes_reveal_count]);

  const refreshRevealStatus = async () => {
    try {
      setRevealInfo((prev) => ({ ...prev, loading: true }));
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("delivery_data, codes_revealed_at, codes_last_revealed_at, codes_reveal_count")
        .eq("id", order.id)
        .maybeSingle();
      if (!error && data) {
        setRevealInfo({
          revealed_at: data.codes_revealed_at,
          last_revealed_at: data.codes_last_revealed_at,
          count: data.codes_reveal_count ?? 0,
          loading: false,
        });
        if (data.delivery_data && typeof data.delivery_data === "object" && Array.isArray(data.delivery_data.codes)) {
          setCodes(data.delivery_data.codes.map((c: any) => ({
            kind: (c.kind || (c.email ? "account" : "code")) as CodeKind,
            label: c.label || "",
            value: c.value || "",
            email: c.email || "",
            password: c.password || "",
            extra: c.extra || (c.kind === "account" && c.value ? c.value : "") || "",
            region: c.region || "",
            revealed_at: c.revealed_at ?? null,
            revealed_ip: c.revealed_ip ?? null,
            revealed_country: c.revealed_country ?? null,
            revealed_city: c.revealed_city ?? null,
            revealed_ua: c.revealed_ua ?? null,
            reveal_count: c.reveal_count ?? null,
            last_revealed_at: c.last_revealed_at ?? null,
            last_revealed_ip: c.last_revealed_ip ?? null,
            status: (c.is_cancelled || c.status === "cancelled" || c.status === "refunded") ? "cancelled" : (c.status || "active"),
            is_cancelled: Boolean(c.is_cancelled || c.status === "cancelled" || c.status === "refunded"),
            cancelled_at: c.cancelled_at ?? null,
            cancel_reason: c.cancel_reason ?? null,
            backup_email: c.backup_email || "",
            backup_code: c.backup_code || "",
            extra_fields: Array.isArray(c.extra_fields) ? c.extra_fields : [],
            notes: c.notes || "",
          })));
        }
        toast.success("تم تحديث حالة استلام وكشف الأكواد مباشرة");
      } else {
        setRevealInfo((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setRevealInfo((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCopySecretLink = async () => {
    try {
      setCopyingLink(true);
      const targetEmail = order.user_email || order.customer_email || (order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).customer_email : null);
      const res = await getOrderSecretLinkFn({
        data: {
          orderNumber: order.order_number,
          customerEmail: targetEmail || "",
          orderId: order.id,
        },
      });
      if (res.ok && res.secretUrl) {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(res.secretUrl);
        } else {
          const ta = document.createElement("textarea");
          ta.value = res.secretUrl;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        toast.success("تم نسخ الرابط السري المشفر لطلب العميل (GX Store Token) بنجاح! يمكنك إرساله للعميل.");
      } else {
        toast.error("تعذر توليد الرابط السري للطلب");
      }
    } catch {
      toast.error("حدث خطأ أثناء نسخ الرابط");
    } finally {
      setCopyingLink(false);
    }
  };

  function addCode() { setCodes([...codes, { kind: "code", label: "", value: "", email: "", password: "", extra: "", region: "Global" }]); }
  function addAccount() { setCodes([...codes, { kind: "account", label: "", value: "", email: "", password: "", extra: "", region: "" }]); }
  function addTopup() { setCodes([...codes, { kind: "topup", label: "", value: "", email: "", password: "", extra: "", region: "" }]); }
  function updateCode(i: number, patch: Partial<DeliveryCode>) { setCodes(codes.map((c, idx) => idx === i ? { ...c, ...patch } : c)); }
  function removeCode(i: number) { setCodes(codes.filter((_, idx) => idx !== i)); }

  const toggleCancelCode = async (i: number) => {
    const nextCodes = [...codes];
    const target = { ...nextCodes[i] };
    const willCancel = !target.is_cancelled && target.status !== "cancelled";
    target.is_cancelled = willCancel;
    target.status = willCancel ? "cancelled" : "active";
    if (willCancel) {
      target.cancelled_at = new Date().toISOString();
    } else {
      target.cancelled_at = null;
    }
    nextCodes[i] = target;
    setCodes(nextCodes);

    // Save immediately to DB so client realtime updates at once!
    try {
      const patch = buildPatch(status);
      const { error } = await supabase
        .from("orders")
        .update({ delivery_data: patch.delivery_data })
        .eq("id", order.id);

      if (error) {
        toast.error("فشل تحديث حالة الكود: " + error.message);
      } else {
        toast.success(
          willCancel
            ? "تم إلغاء هذا الكود وحجبه لحظياً عن العميل ✓"
            : "تمت إعادة تفعيل هذا الكود بنجاح ✓"
        );
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      }
    } catch (e: any) {
      toast.error(e?.message || "حدث خطأ أثناء حفظ حالة الكود");
    }
  };

  function buildPatch(nextStatus: string) {
    const cleanCodes = codes.map((c) => {
      const kind = c.kind || "code";
      const extra = (c.extra || "").trim();
      const isCanc = Boolean(c.is_cancelled || c.status === "cancelled" || c.status === "refunded");
      return {
        kind,
        label: (c.label || "").trim(),
        value: (c.value || (kind === "account" ? extra : "")).trim(),
        email: (c.email || "").trim(),
        password: (c.password || "").trim(),
        extra,
        // Keys always carry a region; accounts and top-ups never do.
        region: kind === "code" ? ((c.region || "").trim() || "Global") : "",
        revealed_at: c.revealed_at ?? null,
        revealed_ip: c.revealed_ip ?? null,
        revealed_country: c.revealed_country ?? null,
        revealed_city: c.revealed_city ?? null,
        revealed_ua: c.revealed_ua ?? null,
        reveal_count: c.reveal_count ?? null,
        last_revealed_at: c.last_revealed_at ?? null,
        last_revealed_ip: c.last_revealed_ip ?? null,
        status: isCanc ? "cancelled" : (c.status || "active"),
        is_cancelled: isCanc,
        cancelled_at: c.cancelled_at ?? null,
        cancel_reason: c.cancel_reason ?? null,
        backup_email: (c.backup_email || "").trim() || null,
        backup_code: (c.backup_code || "").trim() || null,
        extra_fields: Array.isArray(c.extra_fields) ? c.extra_fields.filter((f) => f.label || f.value) : [],
        notes: (c.notes || "").trim() || null,
      };
    }).filter((c) => c.label || c.value || c.email || c.password || c.extra || c.is_cancelled);

    const existingDel = order.delivery_data && typeof order.delivery_data === "object"
      ? (order.delivery_data as Record<string, unknown>)
      : {};

    const effectivePaid = (nextStatus === "delivered" || nextStatus === "paid")
      ? (Number(order.paid_jod || 0) > 0 ? Number(order.paid_jod) : Number(order.total_jod || 0))
      : order.paid_jod;

    return {
      status: nextStatus,
      paid_jod: effectivePaid,
      admin_notes: notes.trim() || null,
      items: localItems,
      subtotal_jod: localSubtotal,
      total_jod: localTotal,
      delivery_data: {
        ...existingDel,
        codes: cleanCodes,
      },
    };
  }

  function save() { onSave(buildPatch(status)); }

  async function markDelivered() {
    const anyValue = codes.some((c) => (c.value || "").trim() || (c.email || "").trim() || (c.password || "").trim() || (c.extra || "").trim());
    const missingRegion = codes.some((c) => (c.kind || "code") === "code" && (c.value || "").trim() && !(c.region || "").trim());
    if (missingRegion) { alert("في مفاتيح بدون ريجون. حدّد المنطقة لكل مفتاح قبل التسليم."); return; }
    if (!anyValue && !confirm("ما في أكواد/حسابات مدخلة. تأكد من تسليم الطلب بدون بيانات؟")) return;

    setStatus("delivered");
    onSave(buildPatch("delivered"));

    const targetEmail = order.user_email || order.customer_email || (order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).customer_email : null);
    if (notifyCustomer && targetEmail && targetEmail.includes("@")) {
      try {
        const emailItems = localItems.map((it: any, itemIdx: number) => {
          const matchingCode = codes[itemIdx] || codes[0] || null;
          const fullRegion = formatFullRegion(
            {
              region: matchingCode?.region || it.region,
              cartId: it.cartId || it.id,
              name: it.name,
              slug: it.product_slug || it.slug,
            },
            emailLang,
            { withDetails: true }
          );

          return {
            name: it.name || "منتج رقمي",
            qty: it.qty || it.quantity || 1,
            price: it.price != null ? Number(it.price) : undefined,
            image: it.image || it.image_url || undefined,
            region: fullRegion,
            variant: it.variant || undefined,
            slug: it.product_slug || it.slug || it.cartId || it.id || undefined,
          };
        });

        const emailRes = await sendOrderStatusEmail({
          data: {
            orderNumber: order.order_number,
            status: "delivered",
            customerEmail: targetEmail.trim(),
            customerName: order.customer_name || undefined,
            totalJod: Number(order.total_jod || 0),
            subtotalJod: Number(order.subtotal_jod ?? order.total_jod ?? 0),
            discountJod: Number(order.discount_jod || 0),
            paymentMethod: (order.delivery_data as any)?.payment_method || "",
            items: emailItems,
            notes: notes.trim() || undefined,
            createdAt: order.created_at,
            lang: emailLang,
          },
        });
        if (emailRes && !emailRes.ok) {
          toast.warning(`تم تسليم الطلب، لكن تعذر إرسال الإيميل للعميل: ${emailRes.error || "مفتاح البريد غير مهيأ"}`);
        } else {
          toast.success(`تم تسليم الطلب وإرسال إشعار (${emailLang === "ar" ? "بالعربية" : "بالإنجليزية"}) للعميل (${targetEmail}) عبر noreply@gxstore.me!`);
        }
      } catch (err) {
        console.error("Order delivery email failed:", err);
        toast.warning("تم تسليم الطلب، لكن تعذر إرسال الإيميل للعميل.");
      }
    }
  }

  const [confirmingPayment, setConfirmingPayment] = useState(false);

  async function confirmPaymentReceipt() {
    setConfirmingPayment(true);
    try {
      setStatus("paid");
      onSave(buildPatch("paid"));

      const targetEmail = order.user_email || order.customer_email || (order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).customer_email : null);
      if (notifyCustomer && targetEmail && targetEmail.includes("@")) {
        const emailItems = localItems.map((it: any) => ({
          name: it.name || "منتج رقمي",
          qty: it.qty || it.quantity || 1,
          price: it.price != null ? Number(it.price) : undefined,
          image: it.image || it.image_url || undefined,
          region: it.region || undefined,
          variant: it.variant || undefined,
          slug: it.product_slug || it.slug || it.cartId || it.id || undefined,
        }));

        const emailRes = await sendPaymentConfirmedEmail({
          data: {
            orderNumber: order.order_number,
            customerEmail: targetEmail.trim(),
            customerName: order.customer_name || undefined,
            totalJod: Number(order.total_jod || 0),
            subtotalJod: Number(order.subtotal_jod ?? order.total_jod ?? 0),
            discountJod: Number(order.discount_jod || 0),
            paymentMethod: (order.delivery_data as any)?.payment_method || "",
            items: emailItems,
            notes: notes.trim() || undefined,
            createdAt: order.created_at,
            lang: emailLang,
          },
        });

        if (emailRes && !emailRes.ok) {
          toast.warning(`تم تأكيد استلام الدفع، لكن تعذر إرسال الإيميل للعميل: ${emailRes.error || "مفتاح البريد غير مهيأ"}`);
        } else {
          toast.success(`تم تأكيد استلام الدفع وإرسال إشعار التأكيد للعميل (${targetEmail}) بنجاح!`);
        }
      } else {
        toast.success("تم تأكيد استلام الدفع وتحديث حالة الطلب!");
      }
    } catch (err: any) {
      console.error("Confirm payment receipt error:", err);
      toast.error(err?.message || "حدث خطأ أثناء تأكيد استلام الدفع");
    } finally {
      setConfirmingPayment(false);
    }
  }

  async function cancelOrder() {
    const cancelReason = prompt("سبب إلغاء الطلب (اختياري، يظهر للعميل في الإيميل وصفحة الطلب):", "") ?? "";
    if (!confirm("متأكد إنك بدك تلغي هالطلب؟")) return;
    setStatus("cancelled");
    const patch = buildPatch("cancelled");
    if (cancelReason.trim()) {
      patch.admin_notes = cancelReason.trim();
    }
    onSave(patch);

    const targetEmail = order.user_email || order.customer_email || (order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).customer_email : null);
    if (notifyCustomer && targetEmail && targetEmail.includes("@")) {
      try {
        const emailRes = await sendOrderStatusEmail({
          data: {
            orderNumber: order.order_number,
            status: "cancelled",
            customerEmail: targetEmail.trim(),
            customerName: order.customer_name || undefined,
            totalJod: Number(order.total_jod || 0),
            subtotalJod: Number(order.subtotal_jod ?? order.total_jod ?? 0),
            discountJod: Number(order.discount_jod || 0),
            paymentMethod: (order.delivery_data as any)?.payment_method || "",
            notes: cancelReason.trim() || undefined,
            createdAt: order.created_at,
            lang: emailLang,
          },
        });
        if (emailRes && !emailRes.ok) {
          toast.warning(`تم إلغاء الطلب، لكن تعذر إرسال إشعار الإلغاء للعميل: ${emailRes.error || "مفتاح البريد غير مهيأ"}`);
        } else {
          toast.success(`تم إلغاء الطلب وإرسال إشعار للعميل عبر noreply@gxstore.me.`);
        }
      } catch (err) {
        console.error("Cancel email error:", err);
        toast.warning("تم إلغاء الطلب، لكن تعذر إرسال الإيميل للعميل.");
      }
    }
  }

  const [sendingPaymentReminder, setSendingPaymentReminder] = useState(false);

  async function sendPaymentReminder() {
    const targetEmail = order.user_email || order.customer_email || (order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any).customer_email : null);
    let email = targetEmail ? String(targetEmail).trim() : "";
    if (!email || !email.includes("@")) {
      const prompted = prompt("أدخل البريد الإلكتروني للعميل لإرسال إشعار استكمال الدفع:", "");
      if (!prompted || !prompted.includes("@")) {
        toast.error("يرجى إدخال بريد إلكتروني صالح لإرسال الإشعار.");
        return;
      }
      email = prompted.trim();
    }

    if (!confirm(`هل أنت متأكد من إرسال إشعار استكمال الدفع ورابط الواتساب إلى (${email})؟`)) {
      return;
    }

    setSendingPaymentReminder(true);
    try {
      const emailItems = localItems.map((it: any) => ({
        name: it.name || "منتج رقمي",
        qty: it.qty || it.quantity || 1,
        price: it.price != null ? Number(it.price) : undefined,
        image: it.image || it.image_url || undefined,
        region: it.region || undefined,
        variant: it.variant || undefined,
        slug: it.product_slug || it.slug || it.cartId || it.id || undefined,
      }));

      const res = await sendIncompleteOrderPaymentEmail({
        data: {
          orderNumber: order.order_number,
          customerEmail: email,
          customerName: order.customer_name || undefined,
          customerWhatsapp: order.customer_whatsapp || undefined,
          totalJod: Number(order.total_jod || 0),
          subtotalJod: Number(order.subtotal_jod ?? order.total_jod ?? 0),
          discountJod: Number(order.discount_jod || 0),
          paymentMethod: (order.delivery_data as any)?.payment_method || "",
          items: emailItems,
          notes: notes.trim() || undefined,
          createdAt: order.created_at,
          lang: emailLang,
        },
      });

      if (res && res.ok) {
        toast.success(`تم إرسال إشعار استكمال الدفع (${emailLang === "ar" ? "بالعربية" : "بالإنجليزية"}) للعميل (${email}) بنجاح!`);
      } else {
        toast.error(res?.error || "فشل إرسال إشعار استكمال الدفع");
      }
    } catch (err: any) {
      console.error("Payment reminder email error:", err);
      toast.error(err?.message || "حدث خطأ أثناء إرسال الإشعار");
    } finally {
      setSendingPaymentReminder(false);
    }
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
    .gx-od-reveal{display:flex;align-items:flex-start;gap:10px;border-radius:12px;padding:10px 12px;margin-bottom:12px;border:1px solid}
    .gx-od-reveal .dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex-shrink:0}
    .gx-od-reveal .t{font-size:12.5px;font-weight:800}
    .gx-od-reveal .s{font-size:11px;opacity:.75;margin-top:2px}
    .gx-od-reveal.on{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.3);color:#6ee7b7}
    .gx-od-reveal.on .dot{background:#10b981;box-shadow:0 0 8px #10b981}
    .gx-od-reveal.off{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.3);color:#fbbf24}
    .gx-od-reveal.off .dot{background:#f59e0b;box-shadow:0 0 8px #f59e0b}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySecretLink}
                  disabled={copyingLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all shadow-sm"
                  title="نسخ الرابط السري المشفر لطلب العميل (GX Store Secure Link)"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyingLink ? "جارٍ التوليد..." : "نسخ رابط الطلب السري (Token)"}</span>
                </button>
                <div className="text-xs text-cyan-100/60">{new Date(order.created_at).toLocaleString("ar-EG")}</div>
              </div>
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
                  <a href={contactHref} target="_blank" rel="noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-100 hover:underline font-mono text-sm font-bold">
                    <span>💬</span>
                    <span>{order.customer_whatsapp}</span>
                  </a>
                ) : <span className="text-cyan-100/40">—</span>}
              </div>
            </div>
            <div className="gx-od-tile">
              <div className="k">الإيميل</div>
              <div className="v text-sm">
                {order.user_email || order.customer_email ? (
                  <a href={`mailto:${order.user_email || order.customer_email}`} dir="ltr" className="text-cyan-300 hover:underline">{order.user_email || order.customer_email}</a>
                ) : <span className="text-cyan-100/40">—</span>}
              </div>
            </div>
            <div className="gx-od-tile">
              <div className="flex items-center justify-between">
                <div className="k">الإجمالي</div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingItems) startEditingItems();
                    setTimeout(() => {
                      document.getElementById("gx-admin-items-editor")?.scrollIntoView({ behavior: "smooth" });
                    }, 80);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                  title="تعديل منتجات الطلب، الكميات، أو القيمة الإجمالية"
                >
                  <Pencil size={11} /> تعديل القيمة والمنتجات
                </button>
              </div>
              <div className="v text-emerald-300 font-mono text-base font-extrabold">
                {(() => {
                  const delData = order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any) : {};
                  const feeJod = Number(delData.fee_jod || 0);
                  const totalWithFee = Number(delData.total_with_fee_jod || (localTotal + feeJod));
                  if (feeJod > 0) {
                    return (
                      <div>
                        <div>
                          {totalWithFee.toFixed(2)} <span className="text-xs text-cyan-400/70">د.أ (شامل رسوم الخدمة)</span>
                        </div>
                        <div className="text-xs text-amber-300/90 font-normal mt-0.5">
                          الأساسي: {localTotal.toFixed(2)} د.أ + رسوم الخدمة (3%): {feeJod.toFixed(2)} د.أ
                        </div>
                      </div>
                    );
                  }
                  return (
                    <>
                      {localTotal.toFixed(2)} <span className="text-xs text-cyan-400/70">د.أ</span>
                    </>
                  );
                })()}
              </div>
            </div>
            {(() => {
              const delData = order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any) : {};
              const pm = (delData.payment_method || "").toLowerCase();
              if (pm === "binance_pay" || pm === "binance") {
                return (
                  <div className="gx-od-tile col-span-full border border-amber-500/40 bg-amber-950/20 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🟡</span>
                        <span className="font-extrabold text-yellow-300 text-sm">طريقة الدفع: بايننس باي (Binance Pay)</span>
                        <span className="text-xs bg-amber-500/20 text-yellow-200 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                          ID: 835207366
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {delData.fee_jod && Number(delData.fee_jod) > 0 && (
                          <span className="text-xs font-semibold text-amber-200 bg-black/40 px-2 py-1 rounded border border-amber-500/30 font-mono">
                            رسوم الخدمة (3%): +{Number(delData.fee_jod).toFixed(2)} د.أ
                          </span>
                        )}
                        {delData.total_usdt && (
                          <div className="text-sm font-extrabold text-white bg-black/50 px-2.5 py-1 rounded border border-white/10 font-mono">
                            المطلوب: {delData.total_usdt} USDT
                          </div>
                        )}
                      </div>
                    </div>
                    {delData.binance_order_id && (
                      <div className="mt-2 text-xs flex items-center gap-2 flex-wrap bg-black/40 p-2 rounded-lg border border-amber-500/20">
                        <span className="text-amber-200/80 font-bold">رقم عملية التحويل من العميل (Binance Order ID):</span>
                        <span className="font-mono font-black text-cyan-300 text-sm select-all tracking-wider">
                          {delData.binance_order_id}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              if (pm === "cliq") {
                return (
                  <div className="gx-od-tile col-span-full border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇯🇴</span>
                      <span className="font-bold text-cyan-200 text-sm">طريقة الدفع: كليك (CliQ - الأردن)</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Code Reveal Status Banner */}
          {(() => {
            const isTopupOrder = codes.length > 0 && codes.every((c) => c.kind === "topup");
            if (isTopupOrder) {
              return (
                <div className="border border-emerald-500/40 rounded-xl p-4 bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-cyan-950/60 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-emerald-300">
                        ⚡ طلب شحن وتعبئة مباشر على حساب العميل
                      </div>
                      <div className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                        تم تنفيذ وشحن هذا الطلب مباشرة على حساب/معرّف العميل دون الحاجة لأكواد تفعيل رقمية أو إجراء كشف.
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const total = codes.length;
            const revList = codes.filter((c) => Boolean(c.revealed_at));
            const revCount = revList.length;
            const unrevCount = total - revCount;
            const isAllRev = total > 0 && revCount === total;
            const isPartialRev = total > 0 && revCount > 0 && revCount < total;

            const themeClasses = isAllRev
              ? "bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-cyan-950/70 border-emerald-500/40 shadow-emerald-950/40"
              : isPartialRev
                ? "bg-gradient-to-r from-cyan-950/80 via-amber-950/50 to-black/80 border-cyan-500/40 shadow-cyan-950/30"
                : "bg-gradient-to-r from-amber-950/40 via-stone-900/40 to-black/60 border-amber-500/30 shadow-amber-950/20";

            return (
              <div className={`border rounded-xl p-4 transition-all shadow-md ${themeClasses}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${isAllRev
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                          : isPartialRev
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}
                    >
                      {isAllRev ? <Eye size={22} /> : isPartialRev ? <AlertTriangle size={22} /> : <Lock size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-extrabold ${isAllRev ? "text-emerald-300" : isPartialRev ? "text-cyan-200" : "text-amber-300"
                            }`}
                        >
                          {isAllRev
                            ? `🔓 جميع الأكواد مكشوفة ومستلمة (${revCount}/${total} كود)`
                            : isPartialRev
                              ? `⚠️ كشف جزئي: تم كشف ${revCount} من أصل ${total} كود`
                              : total > 0
                                ? `🔒 جميع الأكواد مقفلة ومحمية (0/${total} كود مكشوف)`
                                : "📦 بانتظار إضافة بيانات التسليم والأكواد"}
                        </span>

                        {isPartialRev && (
                          <span className="text-[11px] font-bold bg-amber-500/25 text-amber-200 px-2 py-0.5 rounded border border-amber-500/40">
                            يوجد {unrevCount} كود لم يفتحه العميل بعد
                          </span>
                        )}

                        {revealInfo.count > 0 && (
                          <span className="text-[11px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-cyan-200 border border-white/10">
                            مرات الكشف: {revealInfo.count}
                          </span>
                        )}
                      </div>

                      <div className="text-xs mt-1.5 leading-relaxed text-cyan-100/85">
                        {isAllRev ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>قام العميل بكشف واستلام جميع الأكواد عبر الرابط بنجاح.</span>
                            {revealInfo.revealed_at && (
                              <span className="text-emerald-300 font-mono" dir="ltr">
                                أول فتح: {formatOrderTime(revealInfo.revealed_at)}
                              </span>
                            )}
                          </div>
                        ) : isPartialRev ? (
                          <span>
                            العميل كشف بعض الأكواد فقط، بينما لا تزال بقية الأكواد مقفلة ومحمية. يمكنك رؤية وقت وتاريخ و IP كشف كل كود بشكل مستقل في بطاقات الأكواد أدناه.
                          </span>
                        ) : total > 0 ? (
                          <span>
                            محمي: الأكواد لا تزال مشفرة ومقفلة. لا يتم تسجيل الكشف إلا عندما يوافق العميل على الشروط وينقر على إظهار الكود من الرابط.
                          </span>
                        ) : (
                          <span>أضف الأكواد بالأسفل ثم سلّم الطلب لإتاحة الرابط للعميل.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={refreshRevealStatus}
                    disabled={revealInfo.loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                    title="تحديث حالة فتح الأكواد مباشرة من قاعدة البيانات"
                  >
                    <RefreshCw size={13} className={revealInfo.loading ? "animate-spin text-cyan-400" : ""} />
                    <span>{revealInfo.loading ? "جارٍ التحقق..." : "تحديث حالة الأكواد"}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          <SecurityBlock order={order} />



          {/* Products & Items Editor */}
          <div className="gx-od-sec" id="gx-admin-items-editor">
            <div className="gx-od-sec-h flex items-center justify-between">
              <div className="gx-od-sec-t">
                <PackageIcon size={14} /> المنتجات ({localItems.length})
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isEditingItems) {
                    handleCancelEditingDraft();
                  } else {
                    startEditingItems();
                  }
                }}
                className="text-xs text-cyan-300 hover:text-white font-bold flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer shadow-sm"
              >
                <Pencil size={12} />
                {isEditingItems ? "إلغاء وضع التعديل (دون حفظ) ✕" : "تعديل المنتجات والكميات ✎"}
              </button>
            </div>

            {/* Revert Banner if previously edited */}
            {(() => {
              const delData = order.delivery_data && typeof order.delivery_data === "object" ? (order.delivery_data as any) : {};
              const hasBeenEdited = Boolean(delData.is_edited_by_admin && delData.original_items);
              if (!hasBeenEdited) return null;
              return (
                <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-200">
                        تم تعديل هذا الطلب إدارياً {delData.original_total_jod != null ? `(الإجمالي الأصلي: ${Number(delData.original_total_jod).toFixed(2)} د.أ)` : ""}
                      </div>
                      <div className="text-[11px] text-amber-400/80">
                        يمكنك التراجع عن جميع التعديلات واسترجاع أصناف وكميات الطلب الأصلية كما اشتراها العميل.
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevertToOriginalOrder}
                    disabled={isReverting}
                    className="h-8 text-xs font-bold border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 hover:text-white cursor-pointer"
                  >
                    {isReverting ? "جاري الاسترجاع..." : "↶ تراجع عن التعديل واسترجاع الطلب الأصلي"}
                  </Button>
                </div>
              );
            })()}

            {!isEditingItems ? (
              <div>
                {localItems.map((it, i) => (
                  <div key={i} className="gx-od-item">
                    <div>
                      <div className="font-semibold text-cyan-100">{it.name}</div>
                      {it.usernames && it.usernames.length > 0 && (
                        <div className="text-[11px] text-cyan-400/70 mt-0.5">يوزرات: {it.usernames.join(", ")}</div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-cyan-400/70 text-xs">× {it.qty}</div>
                      <div className="font-mono font-bold text-emerald-300">
                        {((Number(it.price) || 0) * (Number(it.qty) || 1)).toFixed(2)} د.أ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-cyan-400/30 bg-cyan-950/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                  <div>
                    <div className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                      <span>📦 تعديل أصناف وكميات الطلب مباشرة</span>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                        وضع التعديل
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      عدّل الكميات، غيّر الأسعار، أضف أو احذف منتجات وسيتم تحديث إجمالي الطلب تلقائياً.
                    </div>
                  </div>
                </div>

                {/* Editable Items List */}
                <div className="space-y-2.5">
                  {draftItems.map((it, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-black/50 border border-white/10 hover:border-cyan-400/30 transition space-y-2"
                    >
                      <div>
                        <Label className="text-[10px] text-cyan-200/70 font-semibold mb-1 block">اسم المنتج:</Label>
                        <Input
                          value={it.name}
                          onChange={(e) => handleItemNameChange(i, e.target.value)}
                          placeholder="اسم المنتج..."
                          className="gx-adm-input text-xs font-semibold h-8"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                        {/* Price Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">سعر الوحدة:</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.price}
                            onChange={(e) => handleItemPriceChange(i, e.target.value)}
                            className="gx-adm-input w-24 h-7 text-xs font-mono font-bold text-emerald-300"
                            dir="ltr"
                          />
                          <span className="text-[10px] text-cyan-400/80">د.أ</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400">الكمية:</span>
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(i, it.qty - 1)}
                            disabled={it.qty <= 1}
                            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 grid place-items-center text-white transition cursor-pointer"
                            title="تقليل الكمية"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-sm text-cyan-200">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(i, it.qty + 1)}
                            disabled={it.qty >= 99}
                            className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 grid place-items-center text-white transition cursor-pointer"
                            title="زيادة الكمية"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-left font-mono font-black text-sm text-emerald-400">
                          {((Number(it.price) || 0) * (Number(it.qty) || 1)).toFixed(2)} د.أ
                        </div>

                        {/* Delete Item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(i)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 p-1.5 rounded transition cursor-pointer"
                          title="حذف هذا الصنف من الطلب"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Item Section */}
                <div className="p-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 space-y-2.5">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Plus size={13} />
                    <span>إضافة منتج أو بطاقة جديدة إلى الطلب</span>
                  </div>

                  {/* 1. Quick Add from Catalog Presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedPresetIndex}
                      onChange={(e) => setSelectedPresetIndex(e.target.value)}
                      className="gx-adm-input flex-1 min-w-[200px] h-8 text-xs font-semibold bg-[#0b101c] text-cyan-100"
                    >
                      <option value="">⚡ اختر من المنتجات والبطاقات الشائعة لإضافتها فوراً...</option>
                      {QUICK_CATALOG_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>
                          {p.name} — {p.price.toFixed(2)} د.أ
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddPresetItem}
                      disabled={selectedPresetIndex === ""}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 disabled:opacity-40 transition cursor-pointer"
                    >
                      + إضافة المختار
                    </button>
                  </div>

                  {/* 2. Custom Item Add */}
                  <div className="pt-2 border-t border-cyan-500/15 flex items-center gap-2 flex-wrap">
                    <Input
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="أو اكتب اسم منتج مخصص..."
                      className="gx-adm-input flex-1 min-w-[150px] h-8 text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      placeholder="السعر د.أ"
                      className="gx-adm-input w-24 h-8 text-xs font-mono font-bold text-emerald-300"
                      dir="ltr"
                    />
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={customItemQty}
                      onChange={(e) => setCustomItemQty(e.target.value)}
                      placeholder="الكمية"
                      className="gx-adm-input w-16 h-8 text-xs font-mono text-center"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer border border-white/15"
                    >
                      + صنف مخصص
                    </button>
                  </div>
                </div>

                {/* Totals Summary & Manual Adjustment */}
                <div className="p-3 rounded-lg bg-black/60 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>مجموع المنتجات الجديد (Subtotal):</span>
                    <span className="font-mono font-bold text-cyan-200">{draftSubtotal.toFixed(2)} د.أ</span>
                  </div>

                  {Number(order.discount_jod || 0) > 0 && (
                    <div className="flex items-center justify-between text-xs text-amber-300">
                      <span>خصم الكوبونات / الرصيد:</span>
                      <span className="font-mono font-bold">-{Number(order.discount_jod).toFixed(2)} د.أ</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-white font-black">الإجمالي المطلوب للطلب:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={draftTotal}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDraftTotal(isNaN(val) ? 0 : val);
                          setManualTotalOverride(true);
                        }}
                        className="gx-adm-input w-28 h-8 font-mono font-black text-emerald-300 text-sm"
                        dir="ltr"
                      />
                      <span className="text-xs text-cyan-300 font-bold">د.أ</span>
                      {manualTotalOverride && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualTotalOverride(false);
                            updateDraftSubtotalAndTotal(draftItems);
                          }}
                          className="text-[11px] text-cyan-400 hover:underline mr-1 cursor-pointer"
                        >
                          (إعادة الحساب التلقائي)
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncCodes}
                        onChange={(e) => setAutoSyncCodes(e.target.checked)}
                        className="rounded border-cyan-500 text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                      <span>مزامنة خانات الأكواد للكميات والأصناف الجديدة تلقائياً</span>
                    </label>
                  </div>
                </div>

                {/* Save & Cancel Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditingDraft}
                    disabled={isSavingItems}
                    className="h-8 text-xs cursor-pointer"
                  >
                    إلغاء المسودة دون حفظ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDraftItems}
                    disabled={isSavingItems}
                    className="h-8 text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:opacity-95 cursor-pointer shadow-md"
                  >
                    {isSavingItems ? (
                      <>
                        <Loader2 size={13} className="ml-1 animate-spin" /> جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save size={13} className="ml-1" /> حفظ تعديلات المنتجات والقيمة
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
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
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="outline" onClick={addCode} className="h-8 text-xs">+ كود</Button>
                <Button type="button" size="sm" variant="outline" onClick={addAccount} className="h-8 text-xs">+ حساب</Button>
                <Button type="button" size="sm" variant="outline" onClick={addTopup} className="h-8 text-xs">+ تعبئة رصيد (Top Up)</Button>
              </div>
            </div>
            {codes.length === 0 && <div className="text-xs text-cyan-100/50 text-center py-3">لا يوجد بيانات تسليم — أضف كود أو حساب أو تعبئة</div>}
            <div>
              {codes.map((c, i) => {
                const kind = c.kind || "code";
                const isAccount = kind === "account";
                const isTopup = kind === "topup";
                const isCancelled = Boolean(c.is_cancelled || c.status === "cancelled" || c.status === "refunded");
                return (
                  <div key={i} className={`gx-od-code ${isCancelled ? "border-rose-500/50 bg-rose-950/25" : ""}`}>
                    <div className="flex gap-2 items-center mb-2 flex-wrap justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isCancelled
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : isTopup
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isAccount
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          }`}>
                          {isTopup ? "تعبئة" : isAccount ? "حساب" : "كود"} #{i + 1}
                        </span>

                        {/* Cancellation Toggle */}
                        {isCancelled ? (
                          <div className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-rose-300 bg-rose-500/25 border border-rose-500/50 px-2 py-0.5 rounded shrink-0">
                            <XCircle size={12} className="text-rose-400" />
                            <span>ملغي ومسترجع (Refunded)</span>
                            <button
                              type="button"
                              onClick={() => toggleCancelCode(i)}
                              className="text-[10px] text-cyan-300 hover:text-white underline mr-1"
                              title="إعادة تفعيل هذا الكود للعميل فوراً"
                            >
                              إعادة تفعيل
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleCancelCode(i)}
                            className="text-[10.5px] px-2 py-0.5 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 font-bold transition flex items-center gap-1"
                            title="إلغاء هذا الكود بشكل فوري وحجبه عن العميل"
                          >
                            <XCircle size={11} />
                            <span>إلغاء الكود (Refund)</span>
                          </button>
                        )}

                        {c.revealed_at ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded shrink-0">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span>مكشوف ✓</span>
                          </span>
                        ) : !isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-300/90 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                            <Lock size={11} className="text-amber-400" />
                            <span>لم يُكشف بعد</span>
                          </span>
                        ) : null}
                      </div>

                      <button type="button" onClick={() => removeCode(i)} className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10" title="حذف هذا الكود بالكامل من الطلب">
                        <XCircle size={16} />
                      </button>
                    </div>

                    <div className="mb-2">
                      <Input placeholder={isTopup ? "الوصف (مثلاً: شحن 1000 UC · اشتراك شهر)" : "الوصف (مثلاً: كود PS 25$ / حساب Netflix)"} value={c.label} onChange={(e) => updateCode(i, { label: e.target.value })} className="gx-adm-input h-9 text-sm w-full" />
                    </div>

                    {isAccount ? (
                      <div className="space-y-2">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <Input placeholder="الإيميل / اسم المستخدم" dir="ltr" value={c.email || ""} onChange={(e) => updateCode(i, { email: e.target.value })} className="gx-adm-input h-9 text-sm" />
                          <Input placeholder="كلمة السر" dir="ltr" value={c.password || ""} onChange={(e) => updateCode(i, { password: e.target.value })} className="gx-adm-input h-9 text-sm" />
                        </div>
                        <Textarea
                          placeholder="معلومات وتفاصيل إضافية للحساب (اختياري: إيميل احتياطي، أكواد احتياطية، PIN، تعليمات تسجيل الدخول...)"
                          value={c.extra ?? c.value ?? ""}
                          onChange={(e) => updateCode(i, { extra: e.target.value, value: e.target.value })}
                          rows={2}
                          className="gx-adm-input text-xs leading-relaxed"
                        />
                      </div>
                    ) : isTopup ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input placeholder="الحساب/المعرّف الذي تمت التعبئة عليه (ID / إيميل / رقم)" dir="ltr" value={c.email || ""} onChange={(e) => updateCode(i, { email: e.target.value })} className="gx-adm-input h-9 text-sm" />
                        <Input placeholder="تفاصيل التعبئة (المبلغ / المدة / ملاحظة)" value={c.value} onChange={(e) => updateCode(i, { value: e.target.value })} className="gx-adm-input h-9 text-sm" />
                      </div>
                    ) : (
                      <Input placeholder="الكود الرقمي" dir="ltr" value={c.value} onChange={(e) => updateCode(i, { value: e.target.value })} className="gx-adm-input h-9 text-sm font-mono" />
                    )}

                    {!isAccount && !isTopup && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="text-[10px] font-bold text-cyan-100/60">الريجون (مطلوب للمفاتيح):</span>
                          {[
                            { code: "Global", label: "عالمي 🌐" },
                            { code: "SA", label: "سعودي 🇸🇦" },
                            { code: "AE", label: "إماراتي 🇦🇪" },
                            { code: "US", label: "أمريكي 🇺🇸" },
                            { code: "UK", label: "بريطاني 🇬🇧" },
                            { code: "TR", label: "تركي 🇹🇷" },
                            { code: "EU", label: "أوروبي 🇪🇺" },
                            { code: "KW", label: "كويتي 🇰🇼" },
                            { code: "QA", label: "قطري 🇶🇦" },
                            { code: "BH", label: "بحريني 🇧🇭" },
                            { code: "OM", label: "عُماني 🇴🇲" },
                            { code: "JO", label: "أردني 🇯🇴" },
                            { code: "EG", label: "مصري 🇪🇬" },
                          ].map((r) => {
                            const isSelected =
                              (c.region || "").trim().toLowerCase() === r.code.toLowerCase() ||
                              (c.region || "").trim().toLowerCase() === r.label.toLowerCase();
                            return (
                              <button
                                key={r.code}
                                type="button"
                                onClick={() => updateCode(i, { region: r.code })}
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-bold transition flex items-center gap-1 ${isSelected
                                  ? "bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-[0_0_8px_rgba(0,229,255,0.25)]"
                                  : "bg-white/5 text-cyan-100/60 border-white/10 hover:bg-white/10 hover:text-white"
                                  }`}
                              >
                                <span>{r.code}</span>
                                <span className="text-[9px] opacity-75">({r.label})</span>
                              </button>
                            );
                          })}
                        </div>
                        <Input
                          placeholder="المنطقة / الريجون (مثلاً: Global · US · EU · TR)"
                          value={c.region || ""}
                          onChange={(e) => updateCode(i, { region: e.target.value })}
                          className={`gx-adm-input h-9 text-sm ${!(c.region || "").trim() && (c.value || "").trim() ? "border-amber-500/60" : ""}`}
                        />
                        {!(c.region || "").trim() && (c.value || "").trim() && (
                          <div className="text-[10px] text-amber-400 mt-1">حدّد الريجون قبل التسليم — المفاتيح لازم يكون إلها منطقة.</div>
                        )}
                      </div>
                    )}

                    {/* Extensible Extra Fields & Recovery Credentials (for this item) */}
                    <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2 bg-black/20 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-cyan-200/90">
                          📌 معلومات إضافية خاصة بهذا المنتج (تظهر للعميل عند كشف هذا الكود/الحساب):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextCodes = [...codes];
                            const curr = nextCodes[i];
                            const fields = Array.isArray(curr.extra_fields) ? [...curr.extra_fields] : [];
                            fields.push({ label: "بيان إضافي", value: "" });
                            curr.extra_fields = fields;
                            setCodes(nextCodes);
                          }}
                          className="text-[10.5px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-bold transition flex items-center gap-1"
                        >
                          <Plus size={11} />
                          <span>إضافة حقل مخصص</span>
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="الإيميل الاحتياطي / Recovery Email (اختياري)"
                          dir="ltr"
                          value={c.backup_email || ""}
                          onChange={(e) => updateCode(i, { backup_email: e.target.value })}
                          className="gx-adm-input h-8 text-xs"
                        />
                        <Input
                          placeholder="رمز الأمان / PIN / Backup Code (اختياري)"
                          dir="ltr"
                          value={c.backup_code || ""}
                          onChange={(e) => updateCode(i, { backup_code: e.target.value })}
                          className="gx-adm-input h-8 text-xs font-mono"
                        />
                      </div>

                      {Array.isArray(c.extra_fields) && c.extra_fields.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {c.extra_fields.map((f, fIdx) => (
                            <div key={fIdx} className="flex items-center gap-2">
                              <Input
                                placeholder="اسم الحقل (مثلاً: سيرفر اللعبة)"
                                value={f.label}
                                onChange={(e) => {
                                  const nextCodes = [...codes];
                                  nextCodes[i].extra_fields![fIdx].label = e.target.value;
                                  setCodes(nextCodes);
                                }}
                                className="gx-adm-input h-8 text-xs w-1/3"
                              />
                              <Input
                                placeholder="القيمة"
                                value={f.value}
                                onChange={(e) => {
                                  const nextCodes = [...codes];
                                  nextCodes[i].extra_fields![fIdx].value = e.target.value;
                                  setCodes(nextCodes);
                                }}
                                className="gx-adm-input h-8 text-xs flex-1 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextCodes = [...codes];
                                  nextCodes[i].extra_fields = nextCodes[i].extra_fields!.filter((_, idx) => idx !== fIdx);
                                  setCodes(nextCodes);
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1"
                                title="حذف هذا الحقل"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Input
                        placeholder="ملاحظة أو تعليمات خاصة بهذا الكود/الحساب (تظهر للعميل بعد فتح الكود مباشرة)"
                        value={c.notes || ""}
                        onChange={(e) => updateCode(i, { notes: e.target.value })}
                        className="gx-adm-input h-8 text-xs"
                      />
                    </div>

                    {/* Per-Code Detailed Reveal Box */}
                    {c.revealed_at ? (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-black/60 border border-emerald-500/35 text-xs shadow-md">
                        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-emerald-500/20">
                          <div className="flex items-center gap-2 font-extrabold text-emerald-300">
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                            <span>تم فتح وكشف هذا الكود من قِبل العميل</span>
                            {(c.reveal_count || 1) > 1 && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/25 border border-emerald-500/40 rounded text-emerald-200">
                                كُشف {c.reveal_count} مرات
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] font-bold text-emerald-300/90 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                            كود #{i + 1}
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2 mt-2.5">
                          {/* Date & Time */}
                          <div className="flex items-start gap-2.5 bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                            <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Calendar size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10.5px] text-cyan-200/70 font-semibold">تاريخ ووقت الكشف بالزبط:</span>
                              <span className="font-extrabold text-white text-xs font-mono mt-0.5" dir="ltr">
                                {formatRevealDateTime(c.revealed_at).full}
                              </span>
                              <span className="text-[10px] text-emerald-300/80 mt-0.5">
                                الساعة: {formatRevealDateTime(c.revealed_at).time}
                              </span>
                            </div>
                          </div>

                          {/* IP & Location */}
                          <div className="flex items-start gap-2.5 bg-black/40 p-2.5 rounded-lg border border-emerald-500/20">
                            <div className="w-7 h-7 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Globe size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10.5px] text-cyan-200/70 font-semibold">عنوان IP للجهاز الذي فتح الكود:</span>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="font-extrabold font-mono text-cyan-200 text-xs tracking-wider bg-black/50 px-2 py-0.5 rounded border border-cyan-500/30" dir="ltr">
                                  {c.revealed_ip || (order as any).client_ip || "127.0.0.1"}
                                </span>
                                {(c.revealed_country || c.revealed_city) && (
                                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/35">
                                    {[c.revealed_country, c.revealed_city].filter(Boolean).join(" - ")}
                                  </span>
                                )}
                              </div>
                              {c.revealed_ua && (
                                <span className="text-[9.5px] font-mono text-cyan-100/50 truncate mt-1 max-w-[260px]" dir="ltr" title={c.revealed_ua}>
                                  {c.revealed_ua}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {c.last_revealed_at && c.last_revealed_at !== c.revealed_at && (
                          <div className="mt-2 pt-2 border-t border-emerald-500/15 flex items-center gap-2 text-[10.5px] text-cyan-200/70 flex-wrap font-mono">
                            <Clock size={12} className="text-cyan-400 shrink-0" />
                            <span>آخر فتح مسجل لهذا الكود:</span>
                            <strong className="text-white" dir="ltr">{formatRevealDateTime(c.last_revealed_at).full}</strong>
                            {c.last_revealed_ip && (
                              <span>(IP: <strong className="text-cyan-200" dir="ltr">{c.last_revealed_ip}</strong>)</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-amber-300/90 font-bold text-[11px]">
                          <Lock size={13} className="text-amber-400 shrink-0" />
                          <span>هذا الكود محمي ومقفل — لم يقم العميل بكشفه عبر الرابط حتى الآن</span>
                        </div>
                        <span className="text-[10px] text-amber-300/60 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          كود #{i + 1} لم يُكشف بعد
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="gx-od-sec">
            <div className="gx-od-sec-h"><div className="gx-od-sec-t">📝 معلومات وملاحظات إضافية للطلب (تظهر للعميل)</div></div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="معلومات أو ملاحظات إضافية تظهر للعميل في تفاصيل طلبه عند التسليم (مثل: إيميل وباسورد الحساب الأساسي، الإيميل الاحتياطي، تعليمات التأمين)..."
              className="gx-adm-input font-sans leading-relaxed text-sm"
            />
          </div>

          {/* Collapsible Advanced Financial & Refund Section */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setShowFinancialTools(!showFinancialTools)}
              className="w-full flex items-center justify-between p-3.5 text-right hover:bg-white/[0.04] transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400 shrink-0">
                  <DollarSign size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>خيارات استرجاع الرصيد (Refund) وتسوية عملات GX Coins</span>
                    <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      استرجاع / عملات
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    إجراء استرجاع مالي لرصيد محفظة العميل أو تسوية عملات GX المستخدمة بالطلب
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold shrink-0 mr-2">
                <span>{showFinancialTools ? "إخفاء الخيارات" : "إظهار الخيارات"}</span>
                {showFinancialTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showFinancialTools && (
              <div className="p-4 border-t border-white/10 space-y-4 bg-black/30">
                <AmountsBlock order={order} />
                <RefundBlock order={order} onDone={onClose} />
              </div>
            )}
          </div>

          {/* Email Notification Toggle & Language Selection */}
          <div className="p-3.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-300">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">إرسال إشعار بريدي فوري للعميل عند التسليم أو الإلغاء</div>
                  <div className="text-[11px] text-muted-foreground">المرسل الرسمي: <span className="font-mono text-cyan-400">noreply@gxstore.me</span> (يحتوي زر مباشر لصفحة الطلب وشعار المتجر)</div>
                </div>
              </div>
              <input
                type="checkbox"
                id="notifyCustomerCheck"
                checked={notifyCustomer}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="h-4 w-4 rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
              />
            </div>

            {notifyCustomer && (
              <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15">
                <span className="text-[11px] font-bold text-cyan-300">لغة الإشعار البريدي للعميل:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEmailLang("ar")}
                    className={`px-3 py-1 text-xs rounded-lg font-bold transition ${emailLang === "ar"
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                      : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                      }`}
                  >
                    العربية (AR) 🇸🇦
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailLang("en")}
                    className={`px-3 py-1 text-xs rounded-lg font-bold transition ${emailLang === "en"
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                      : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                      }`}
                  >
                    English (EN) 🇬🇧
                  </button>
                </div>
              </div>
            )}

            {/* Incomplete Order Payment Reminder Trigger */}
            {(status === "pending" || !order.paid_jod) && (
              <div className="pt-2.5 mt-2 border-t border-cyan-500/15 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[11.5px] text-cyan-200/90 leading-relaxed max-w-md">
                  💬 <strong className="text-white">إشعار طلب غير مكتمل:</strong> إرسال إيميل رسمي للزبون ينبهه بأن طلبه غير مكتمل مع زر مباشر يفتح الواتساب لاستكمال الدفع.
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={sendPaymentReminder}
                  disabled={sendingPaymentReminder}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3.5 shadow-sm shadow-emerald-500/20"
                  title="إرسال إشعار استكمال الدفع على إيميل العميل"
                >
                  {sendingPaymentReminder ? (
                    <Loader2 size={13} className="ml-1 animate-spin" />
                  ) : (
                    <Mail size={13} className="ml-1" />
                  )}
                  إرسال تذكير الدفع بالواتساب
                </Button>
              </div>
            )}
          </div>

          {/* Actions - Clean, Hierarchy-focused & Organized */}
          <div className="gx-od-actions flex justify-between items-center gap-3 flex-wrap border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {status !== "delivered" && status !== "cancelled" && (
                <Button
                  onClick={markDelivered}
                  className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 text-slate-950 font-black px-5 shadow-lg shadow-cyan-500/25 h-10 text-sm"
                >
                  <Send size={15} className="ml-1.5" /> تسليم الطلب وإرسال الأكواد للعميل
                </Button>
              )}
              {status === "pending" && (
                <Button
                  onClick={confirmPaymentReceipt}
                  disabled={confirmingPayment}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 shadow-md shadow-emerald-500/20"
                >
                  {confirmingPayment ? (
                    <><Loader2 size={15} className="ml-1.5 animate-spin" /> جارٍ التأكيد والإرسال...</>
                  ) : (
                    <><CheckCircle2 size={15} className="ml-1.5" /> تأكيد استلام الدفع</>
                  )}
                </Button>
              )}
              {status !== "cancelled" && (
                <Button
                  variant="outline"
                  onClick={cancelOrder}
                  className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 h-10"
                >
                  <XCircle size={15} className="ml-1" /> إلغاء الطلب
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={onClose} className="h-10 px-4 text-cyan-100/70 hover:text-white">
                إغلاق
              </Button>
              <Button
                onClick={save}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold h-10 px-5 shadow-sm"
              >
                حفظ التعديلات
              </Button>
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
    const res = data as { ok?: boolean; message?: string; xp_removed?: number; coins_removed?: number; coins_returned?: number; credit_returned?: number; full?: boolean } | null;
    if (error || !res?.ok) {
      toast.error(error?.message || res?.message || "فشل الاسترجاع — لم يتم تغيير أي بيانات");
      return;
    }
    toast.success(
      `تم الاسترجاع${res.full ? " الكامل" : " الجزئي"}: ${value.toFixed(2)} د.أ` +
      (res.coins_returned ? ` • إرجاع ${res.coins_returned} GX للعميل` : "") +
      (res.credit_returned ? ` • إرجاع ${Number(res.credit_returned).toFixed(2)} د.أ رصيد متجر` : "") +
      (res.xp_removed ? ` • سحب ${res.xp_removed} XP` : "") +
      (res.coins_removed ? ` • سحب ${res.coins_removed} GX مكافآت` : ""),
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

      {order.status === "pending" ? (
        <div className="text-xs text-amber-200/80 leading-relaxed">
          الطلب لسه قيد الانتظار (غير مدفوع) — ما في مبلغ مدفوع عشان يترجع.
          إذا بدك تلغيه، غيّر الحالة إلى «ملغى» وبيتم إرجاع GX Coins ورصيد المتجر المستخدمين تلقائياً بدون إنشاء Refund مالي.
        </div>
      ) : order.status === "cancelled" ? (
        <div className="text-xs text-amber-200/80 leading-relaxed">
          طلب ملغى — تم إرجاع GX Coins ورصيد المتجر المستخدمين تلقائياً، والاسترجاع المالي غير متاح.
        </div>
      ) : alreadyRefunded ? (
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

/**
 * Edit an order's value / GX Coins usage atomically via `admin_set_order_amounts`.
 * Lowering the coins returns the difference to the customer, raising them charges
 * the difference (blocked when the balance is too low). Refunded orders are locked.
 */
function AmountsBlock({ order }: { order: OrderWithEmail }) {
  const qc = useQueryClient();
  const [subtotal, setSubtotal] = useState(
    Number(order.subtotal_jod ?? (Number(order.total_jod) + Number(order.discount_jod ?? 0))).toFixed(2),
  );
  const [coins, setCoins] = useState(String(Number(order.coins_used ?? 0)));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const locked = order.status === "refunded" || Number(order.refunded_jod ?? 0) > 0;
  const sub = Number(subtotal);
  const c = Math.floor(Number(coins));
  const maxCoins = Math.floor(Math.max(sub, 0) * 0.5 * 1000);
  const coinsDisc = Math.round((c / 1000) * 1000) / 1000;
  const couponDisc = Math.max(Number(order.discount_jod ?? 0) - Number(order.coins_discount_jod ?? 0), 0);
  const newTotal = Math.max(sub - couponDisc - coinsDisc, 0);
  const delta = c - Number(order.coins_used ?? 0);
  const valid = Number.isFinite(sub) && sub >= 0 && Number.isFinite(c) && c >= 0 && c <= maxCoins;

  const REASON_PRESETS = [
    "تعديل إداري لقيمة الطلب",
    "خصم إضافي للعميل",
    "تسوية فرق دفع",
    "تعديل الكمية",
  ];

  async function save() {
    setBusy(true);
    const effectiveReason = reason.trim() || "تعديل إداري لقيمة الطلب";
    const { data, error } = await supabase.rpc("admin_set_order_amounts", {
      _order_id: order.id, _subtotal_jod: sub, _coins_used: c, _reason: effectiveReason,
    });
    setBusy(false);
    const res = data as { ok?: boolean; message?: string; coins_delta?: number } | null;
    if (error || !res?.ok) { toast.error(error?.message || res?.message || "فشل تعديل القيمة"); return; }
    toast.success(
      `تم تحديث قيمة الطلب بنجاح — الإجمالي ${newTotal.toFixed(2)} د.أ` +
      (res.coins_delta ? (res.coins_delta > 0 ? ` • خصم ${res.coins_delta} GX` : ` • إرجاع ${-res.coins_delta} GX`) : ""),
    );
    setReason("");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-loyalty-customers"] });
  }

  return (
    <div id="gx-admin-amounts-block" className="gx-od-sec border border-amber-500/30 bg-amber-500/5">
      <div className="gx-od-sec-h">
        <div className="gx-od-sec-t text-amber-300 font-bold flex items-center gap-2">
          <span>💰 تعديل قيمة الطلب و GX Coins</span>
        </div>
        <span className="gx-adm-badge bg-amber-500/15 text-amber-300 border-amber-500/40">
          مستخدم: {Number(order.coins_used ?? 0)} GX
          {Number(order.coins_refunded ?? 0) > 0 ? ` • مُعاد: ${Number(order.coins_refunded)}` : ""}
        </span>
      </div>

      {locked ? (
        <div className="text-xs text-fuchsia-200/80">تم استرجاع هذا الطلب — لا يمكن تعديل قيمته أو عملاته.</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-2.5 items-end">
            <div>
              <Label className="text-[11px] text-cyan-100/70 font-semibold">القيمة الإجمالية قبل الخصم (د.أ)</Label>
              <Input dir="ltr" inputMode="decimal" value={subtotal} onChange={(e) => setSubtotal(e.target.value)}
                className="gx-adm-input h-9 text-sm font-mono font-bold text-amber-200" />
            </div>
            <div>
              <Label className="text-[11px] text-cyan-100/70 font-semibold">GX Coins المستخدمة (حد أقصى {maxCoins})</Label>
              <Input dir="ltr" inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)}
                className="gx-adm-input h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-[11px] text-cyan-100/70 font-semibold">سبب التعديل</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: تعديل إداري لقيمة الطلب"
                className="gx-adm-input h-9 text-sm" />
            </div>
          </div>

          {/* Quick Reason Chips */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] text-muted-foreground ml-1">أسباب سريعة:</span>
            {REASON_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${reason === p
                    ? "bg-amber-500/30 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/10 text-cyan-200/70 hover:text-white hover:bg-white/10"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="text-[11.5px] text-cyan-100/80 mt-2.5 p-2 rounded-lg bg-black/40 border border-white/5 flex flex-wrap gap-x-5 gap-y-1 items-center">
            <span>خصم العملات: <b className="text-amber-300 font-mono">{coinsDisc.toFixed(2)}</b> د.أ</span>
            <span>خصم الكوبون: <b className="font-mono text-cyan-300">{couponDisc.toFixed(2)}</b> د.أ</span>
            <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              الإجمالي النهائي بعد التعديل: <b className="text-emerald-300 font-mono text-sm">{newTotal.toFixed(2)}</b> د.أ
            </span>
            {delta !== 0 && (
              <span className={delta > 0 ? "text-rose-300" : "text-emerald-300"}>
                {delta > 0 ? `سيتم خصم ${delta} GX من العميل` : `سيتم إرجاع ${-delta} GX للعميل`}
              </span>
            )}
          </div>
          {c > maxCoins && <div className="text-[10px] text-rose-400 mt-1 font-medium">⚠️ العملات تتجاوز 50% من قيمة الطلب المسموح بها</div>}
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={save} disabled={!valid || busy} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-9 px-4 shadow-sm disabled:opacity-45">
              {busy ? <><Loader2 size={14} className="ml-1 animate-spin" /> جاري الحفظ…</> : "حفظ وتثبيت القيمة الجديدة"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security: request fingerprint of the order + IP blocking
// ---------------------------------------------------------------------------
function parseUa(ua: string | null | undefined) {
  const s = ua || "";
  if (!s) return { device: "—", os: "—", browser: "—" };
  const os =
    /Windows NT 10/.test(s) ? "Windows 10/11" :
      /Windows/.test(s) ? "Windows" :
        /iPhone|iPad|iPod/.test(s) ? "iOS" :
          /Android/.test(s) ? "Android" :
            /Mac OS X/.test(s) ? "macOS" :
              /Linux/.test(s) ? "Linux" : "غير معروف";
  const browser =
    /Edg\//.test(s) ? "Edge" :
      /OPR\//.test(s) ? "Opera" :
        /Chrome\//.test(s) ? "Chrome" :
          /Firefox\//.test(s) ? "Firefox" :
            /Safari\//.test(s) ? "Safari" : "غير معروف";
  const device = /Mobile|Android|iPhone/.test(s) ? "هاتف" : /iPad|Tablet/.test(s) ? "تابلت" : "كمبيوتر";
  return { device, os, browser };
}

function SecurityBlock({ order }: { order: OrderWithEmail }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const ip = (order.client_ip || "").trim();
  const meta = (order.client_meta && typeof order.client_meta === "object" ? order.client_meta : {}) as Record<string, unknown>;
  const ua = parseUa(order.user_agent);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().replace(/"/g, "") : null);

  const blockedQ = useQuery({
    queryKey: ["blocked-ip", ip],
    enabled: !!ip,
    queryFn: async () => {
      const { data } = await supabase.from("blocked_ips").select("ip,reason,created_at").eq("ip", ip).maybeSingle();
      return data;
    },
  });

  const sameIpQ = useQuery({
    queryKey: ["orders-same-ip", ip],
    enabled: !!ip,
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("client_ip", ip);
      return count ?? 0;
    },
  });

  async function toggleBlock(block: boolean) {
    if (!ip) return;
    setBusy(true);
    const { data, error } = await supabase.rpc(block ? "admin_block_ip" : "admin_unblock_ip",
      block ? { _ip: ip, _reason: reason.trim() || null } : { _ip: ip });
    setBusy(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) { toast.error(error?.message || res?.error || "فشلت العملية"); return; }
    toast.success(block ? "تم حظر هذا العنوان" : "تم رفع الحظر");
    qc.invalidateQueries({ queryKey: ["blocked-ip", ip] });
  }

  const rows: Array<[string, string | null]> = [
    ["عنوان IP", ip || null],
    ["الجهاز", ua.device],
    ["نظام التشغيل", ua.os],
    ["المتصفح", ua.browser],
    ["الدولة", str(meta.country)],
    ["المدينة", str(meta.city)],
    ["اللغة", str(meta.language)],
    ["المنصّة", str(meta.platform)],
    ["مصدر الزيارة", str(meta.referer)],
  ];

  return (
    <div className="gx-od-sec">
      <div className="gx-od-sec-h">
        <div className="gx-od-sec-t"><ShieldAlert size={14} /> بيانات الأمان والجهاز</div>
        {ip && (sameIpQ.data ?? 0) > 1 && (
          <span className="text-[11px] text-amber-300">{sameIpQ.data} طلب من نفس العنوان</span>
        )}
      </div>

      {!ip && !order.user_agent ? (
        <p className="text-xs text-cyan-100/50 p-1">لا توجد بيانات جهاز لهذا الطلب (طلب قديم قبل تفعيل التتبع).</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/10 bg-black/20 px-3 py-1.5">
                <span className="text-[11px] text-cyan-400/70">{k}</span>
                <span className="text-xs font-mono text-cyan-100 truncate max-w-[60%]" dir="ltr">{v}</span>
              </div>
            ))}
          </div>

          {order.user_agent && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-cyan-400/70 flex items-center gap-1">
                <Monitor size={12} /> User-Agent الكامل
              </summary>
              <p className="mt-1 text-[11px] font-mono text-cyan-100/70 break-all" dir="ltr">{order.user_agent}</p>
            </details>
          )}

          {ip && (
            <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              {blockedQ.data ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-rose-300 flex items-center gap-1">
                    <Ban size={13} /> هذا العنوان محظور{blockedQ.data.reason ? ` — ${blockedQ.data.reason}` : ""}
                  </span>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => toggleBlock(false)}>
                    <ShieldCheck size={14} className="ms-1" /> رفع الحظر
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
                  <div>
                    <Label className="text-[11px] text-cyan-400/70">سبب الحظر (اختياري)</Label>
                    <Input className="gx-adm-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="محاولة احتيال…" />
                  </div>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => toggleBlock(true)}>
                    <Ban size={14} className="ms-1" /> حظر هذا الـ IP
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
