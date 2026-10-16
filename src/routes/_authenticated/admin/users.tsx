import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pager, usePager } from "@/components/gx/Pager";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users as UsersIcon, Search, ShieldCheck, ShieldOff, Package,
  RefreshCcw, Crown, Download, Coins, Wallet, Star, Copy, ExternalLink,
  ArrowUpDown, Sparkles, Ticket, History, UserPlus, Mail, Clock,
  CheckCircle2, Trash2, AlertCircle,
} from "lucide-react";
import { sendCreditNotificationEmail } from "@/lib/gx/credit-email.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "المستخدمون — لوحة التحكم" }] }),
  component: UsersAdmin,
});

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  whatsapp?: string | null;
  total_spent: number;
  xp: number;
  level: number;
  level_code: string;
  gx_coins: number;
  store_credit_jod: number | null;
  created_at: string;
  roles: string[];
  orders_count: number;
};

type PendingEmailCredit = {
  id: string;
  email: string;
  amount_jod: number;
  coins: number;
  xp: number;
  reason: string;
  status: "pending" | "claimed" | "cancelled";
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  created_at: string;
};

type SortKey = "recent" | "spent" | "orders" | "xp" | "coins" | "credit";

function norm(s: string) {
  return s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "users" | "buyers">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [showPreCreditModal, setShowPreCreditModal] = useState(false);

  const pendingCreditsQ = useQuery({
    queryKey: ["admin-pending-email-credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_email_credits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PendingEmailCredit[];
    },
  });

  const cancelPreCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { data, error } = await supabase.rpc("admin_cancel_unregistered_email_credit", {
        _credit_id: creditId,
        _cancel_reason: "إلغاء يدوي من لوحة التحكم",
      });
      if (error) throw error;
      const res = data as any;
      if (res && res.ok === false) throw new Error(res.message || "تعذر إلغاء الرصيد");
      return res;
    },
    onSuccess: () => {
      toast.success("تم إلغاء الرصيد المعلق بنجاح");
      qc.invalidateQueries({ queryKey: ["admin-pending-email-credits"] });
    },
    onError: (err: any) => toast.error(err.message || "فشل إلغاء الرصيد"),
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("orders").select("user_id"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      const roleMap = new Map<string, Set<string>>();
      (rolesRes.data ?? []).forEach((r) => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, new Set());
        roleMap.get(r.user_id)!.add(r.role);
      });
      const orderMap = new Map<string, number>();
      (ordersRes.data ?? []).forEach((o) => {
        if (!o.user_id) return;
        orderMap.set(o.user_id, (orderMap.get(o.user_id) ?? 0) + 1);
      });
      return (profilesRes.data ?? []).map((p): UserRow => ({
        ...p,
        roles: Array.from(roleMap.get(p.id) ?? []),
        orders_count: orderMap.get(p.id) ?? 0,
      }));
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const levelCodes = useMemo(
    () => Array.from(new Set((usersQ.data ?? []).map((u) => u.level_code).filter(Boolean))),
    [usersQ.data],
  );

  const filtered = useMemo(() => {
    const rows = [...(usersQ.data ?? [])];
    const nq = norm(q);
    const out = rows.filter((u) => {
      if (filter === "admins" && !u.roles.includes("admin")) return false;
      if (filter === "users" && u.roles.includes("admin")) return false;
      if (filter === "buyers" && u.orders_count === 0) return false;
      if (levelFilter !== "all" && u.level_code !== levelFilter) return false;
      if (nq) {
        const hay = norm(`${u.full_name ?? ""} ${u.email ?? ""} ${u.username ?? ""} ${u.whatsapp ?? ""}`);
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      switch (sort) {
        case "spent": return Number(b.total_spent || 0) - Number(a.total_spent || 0);
        case "orders": return b.orders_count - a.orders_count;
        case "xp": return Number(b.xp || 0) - Number(a.xp || 0);
        case "coins": return Number(b.gx_coins || 0) - Number(a.gx_coins || 0);
        case "credit": return Number(b.store_credit_jod ?? 0) - Number(a.store_credit_jod ?? 0);
        default: return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return out;
  }, [usersQ.data, q, filter, levelFilter, sort]);

  const pager = usePager(filtered, 10, `${q}|${filter}|${levelFilter}|${sort}`);

  const pendingCredits = pendingCreditsQ.data ?? [];
  const pendingCount = useMemo(
    () => pendingCredits.filter((c) => c.status === "pending").length,
    [pendingCredits],
  );
  const pendingTotalJod = useMemo(
    () => pendingCredits.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount_jod || 0), 0),
    [pendingCredits],
  );

  const existingEmails = useMemo(() => {
    const s = new Set<string>();
    (usersQ.data ?? []).forEach((u) => {
      if (u.email) s.add(u.email.toLowerCase().trim());
    });
    return s;
  }, [usersQ.data]);

  const stats = useMemo(() => {
    const rows = usersQ.data ?? [];
    return {
      total: rows.length,
      admins: rows.filter((u) => u.roles.includes("admin")).length,
      buyers: rows.filter((u) => u.orders_count > 0).length,
      revenue: rows.reduce((s, u) => s + Number(u.total_spent || 0), 0),
      coins: rows.reduce((s, u) => s + Number(u.gx_coins || 0), 0),
      credit: rows.reduce((s, u) => s + Number(u.store_credit_jod ?? 0), 0),
    };
  }, [usersQ.data]);

  function exportCsv() {
    const header = ["الاسم", "الإيميل", "المعرّف", "الطلبات", "الإنفاق (د.أ)", "XP", "GX Coins", "رصيد المتجر", "المستوى", "الصلاحيات", "التسجيل"];
    const lines = filtered.map((u) => [
      u.full_name ?? "", u.email ?? "", u.username ?? "", u.orders_count,
      Number(u.total_spent || 0).toFixed(2), u.xp ?? 0, u.gx_coins ?? 0,
      Number(u.store_credit_jod ?? 0).toFixed(2), u.level_code ?? "",
      u.roles.join("|") || "user",
      new Date(u.created_at).toLocaleString("ar-JO"),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gx-users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center">
            <UsersIcon size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ملفات العملاء</h1>
            <p className="text-xs text-muted-foreground">الحسابات، الصلاحيات، الولاء والرصيد</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold shadow-md shadow-cyan-500/20"
            onClick={() => setShowPreCreditModal(true)}
          >
            <UserPlus size={14} className="ml-1" /> إضافة رصيد لإيميل غير مسجل
          </Button>
          <Button variant="outline" size="sm" onClick={() => { usersQ.refetch(); pendingCreditsQ.refetch(); }}>
            <RefreshCcw size={14} className="ml-1" /> تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={14} className="ml-1" /> تصدير CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="إجمالي المستخدمين" value={stats.total} color="cyan" />
        <StatCard label="المدراء" value={stats.admins} color="amber" />
        <StatCard label="مشترون فعليون" value={stats.buyers} color="emerald" />
        <StatCard label="إجمالي الإنفاق (د.أ)" value={stats.revenue.toFixed(2)} color="violet" />
        <StatCard label="GX Coins" value={stats.coins.toLocaleString("en-US")} color="amber" />
        <StatCard label="رصيد المتجر (د.أ)" value={stats.credit.toFixed(2)} color="cyan" />
        <StatCard
          label="رصيد معلق لم يسجل (د.أ)"
          value={`${pendingTotalJod.toFixed(2)} (${pendingCount})`}
          color="amber"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث بالاسم، الإيميل، المعرّف أو الواتساب…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              {(["all", "buyers", "admins", "users"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === f ? "bg-cyan-500 text-black" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "الكل" : f === "buyers" ? "مشترون" : f === "admins" ? "المدراء" : "مستخدمون"}
                </button>
              ))}
            </div>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
              className="h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs">
              <option value="all">كل المستويات</option>
              {levelCodes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-lg bg-white/5 border border-white/10 px-2 text-xs">
              <option value="recent">الأحدث تسجيلاً</option>
              <option value="spent">الأكثر إنفاقاً</option>
              <option value="orders">الأكثر طلبات</option>
              <option value="xp">الأعلى XP</option>
              <option value="coins">الأكثر عملات</option>
              <option value="credit">الأعلى رصيد متجر</option>
            </select>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
            <ArrowUpDown size={11} /> عرض {filtered.length} من {stats.total}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2 font-medium">المستخدم</th>
                  <th className="p-2 font-medium">المستوى</th>
                  <th className="p-2 font-medium">الطلبات</th>
                  <th className="p-2 font-medium">الإنفاق</th>
                  <th className="p-2 font-medium">العملات</th>
                  <th className="p-2 font-medium">الرصيد</th>
                  <th className="p-2 font-medium">التسجيل</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {usersQ.isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={8} className="p-3"><div className="h-8 rounded bg-white/5 animate-pulse" /></td>
                  </tr>
                ))}
                {pager.slice.map((u) => {
                  const isAdmin = u.roles.includes("admin");
                  const initials = (u.username || u.email || "GX").trim().slice(0, 2).toUpperCase();
                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                      <td className="p-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-cyan-500/10 border border-cyan-500/30 grid place-items-center flex-shrink-0">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> :
                              <span className="text-xs font-bold text-cyan-300">{initials}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5" dir="ltr">
                              {u.username ? `@${u.username}` : (u.email?.split("@")[0] || "gamer")}
                              {isAdmin && <Crown size={12} className="text-amber-400" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate" dir="ltr">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{u.level_code || "—"}</Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{Number(u.xp || 0).toLocaleString("en-US")} XP</div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${u.orders_count > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-muted-foreground"}`}>
                          <Package size={11} /> {u.orders_count}
                        </span>
                      </td>
                      <td className="p-2 text-xs">{Number(u.total_spent || 0).toFixed(2)} د.أ</td>
                      <td className="p-2 text-xs text-amber-300 font-bold">{Number(u.gx_coins || 0).toLocaleString("en-US")}</td>
                      <td className="p-2 text-xs text-sky-300 font-bold">{Number(u.store_credit_jod ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("ar-JO")}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setDetailUser(u)}>الملف</Button>
                          <Button size="sm" variant={isAdmin ? "outline" : "default"}
                            className={isAdmin ? "" : "bg-cyan-500 hover:bg-cyan-400 text-black"}
                            onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !isAdmin })}
                            disabled={toggleAdmin.isPending}>
                            {isAdmin ? <><ShieldOff size={13} className="ml-1" /> سحب</> : <><ShieldCheck size={13} className="ml-1" /> منح</>}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!usersQ.isLoading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">لا نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={pager.page} pageCount={pager.pageCount} total={pager.total} size={pager.size}
            onPage={pager.setPage} onSize={pager.setSize} />
        </CardContent>
      </Card>

      {/* Bottom Action Card for Unregistered Customers as requested */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 grid place-items-center flex-shrink-0 text-cyan-300">
            <UserPlus size={22} />
          </div>
          <div>
            <div className="font-bold text-sm md:text-base text-foreground flex items-center gap-2">
              <span>إضافة وتخصيص رصيد لعميل مش مسجل بالموقع</span>
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  {pendingCount} رصيد معلق بانتظار التسجيل
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              تستطيع إضافة رصيد لأي إيميل حتى لو ما كان مسجل، ومجرد ما العميل يدخل الموقع ويسجل حساب (Register) بلاقي الرصيد نازل بحسابه فوراً وبشكل تلقائي.
            </div>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs h-10 px-4 w-full md:w-auto whitespace-nowrap shadow-md shadow-cyan-500/20"
          onClick={() => setShowPreCreditModal(true)}
        >
          <UserPlus size={15} className="ml-1.5" /> إضافة رصيد لعميل غير مسجل
        </Button>
      </div>

      {/* Pending Pre-Registration Credits Table */}
      <PendingCreditsSection
        credits={pendingCredits}
        isLoading={pendingCreditsQ.isLoading}
        onCancel={(id) => cancelPreCredit.mutate(id)}
        isCancelling={cancelPreCredit.isPending}
      />

      <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />

      <PreRegistrationCreditDialog
        open={showPreCreditModal}
        onClose={() => setShowPreCreditModal(false)}
        existingEmails={existingEmails}
        onSuccess={() => {
          usersQ.refetch();
          pendingCreditsQ.refetch();
        }}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: "cyan" | "amber" | "emerald" | "violet" }) {
  const map = {
    cyan: "from-cyan-500/15 to-transparent border-cyan-500/25 text-cyan-300",
    amber: "from-amber-500/15 to-transparent border-amber-500/25 text-amber-300",
    emerald: "from-emerald-500/15 to-transparent border-emerald-500/25 text-emerald-300",
    violet: "from-violet-500/15 to-transparent border-violet-500/25 text-violet-300",
  } as const;
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${map[color]}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg md:text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

type DetailTab = "overview" | "orders" | "ledger" | "rewards";

function UserDetailDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [coinsDelta, setCoinsDelta] = useState("");
  const [xpDelta, setXpDelta] = useState("");
  const [creditDelta, setCreditDelta] = useState("");
  const [reason, setReason] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);

  const ordersQ = useQuery({
    queryKey: ["admin-user-orders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id, order_number, status, total_jod, created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ledgerQ = useQuery({
    queryKey: ["admin-user-ledger", user?.id],
    enabled: !!user?.id && tab === "ledger",
    queryFn: async () => {
      const [coins, xp, credit] = await Promise.all([
        supabase.from("gx_coin_transactions").select("id, amount, reason, source, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("xp_transactions").select("id, amount, reason, source, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("store_credit_transactions").select("id, amount_jod, reason, kind, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(40),
      ]);
      return {
        coins: coins.data ?? [],
        xp: xp.data ?? [],
        credit: credit.data ?? [],
      };
    },
  });

  const rewardsQ = useQuery({
    queryKey: ["admin-user-rewards", user?.id],
    enabled: !!user?.id && tab === "rewards",
    queryFn: async () => {
      const [coupons, badges] = await Promise.all([
        supabase.from("user_coupons").select("id, code, percent, max_discount_jod, level_code, used_at, expires_at").eq("user_id", user!.id).order("issued_at", { ascending: false }),
        supabase.from("user_badges").select("id, earned_at, badges(name_ar, icon, color)").eq("user_id", user!.id),
      ]);
      return { coupons: coupons.data ?? [], badges: (badges.data ?? []) as any[] };
    },
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error("اكتب سبب التعديل");
      const xp = parseInt(xpDelta || "0", 10) || 0;
      const coins = parseInt(coinsDelta || "0", 10) || 0;
      const credit = Number(creditDelta || "0") || 0;
      if (!xp && !coins && !credit) throw new Error("أدخل قيمة واحدة على الأقل");
      if (xp || coins) {
        const { error } = await supabase.rpc("admin_adjust_loyalty", {
          _user_id: user!.id, _xp: xp, _coins: coins, _reason: reason.trim(),
        });
        if (error) throw error;
      }
      if (credit) {
        if (credit < 0 && Math.abs(credit) > Number(user!.store_credit_jod ?? 0)) {
          throw new Error("المبلغ المسحوب أكبر من رصيد المستخدم");
        }
        const { data, error } = await supabase.rpc("admin_adjust_store_credit", {
          _user_id: user!.id, _amount: credit, _reason: reason.trim(),
        });
        if (error) throw error;
        const res = data as { ok?: boolean; message?: string } | null;
        if (res && res.ok === false) throw new Error(res.message || "تعذّر تعديل الرصيد");

        if (credit > 0 && user?.email && notifyEmail) {
          try {
            await sendCreditNotificationEmail({
              data: {
                email: user.email,
                amountJod: credit,
                reason: reason.trim() || "تعديل رصيد من الإدارة",
                isRegistered: true,
                username: user.username || undefined,
                coins: coins || undefined,
                xp: xp || undefined,
              },
            });
            toast.success("تم إرسال إشعار الرصيد للعميل عبر support@gxstore.me");
          } catch (mErr) {
            console.error("User email notification error:", mErr);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("تم تطبيق التعديل");
      setXpDelta(""); setCoinsDelta(""); setCreditDelta(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user-ledger", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs: { k: DetailTab; label: string; icon: any }[] = [
    { k: "overview", label: "نظرة عامة", icon: Sparkles },
    { k: "orders", label: "الطلبات", icon: Package },
    { k: "ledger", label: "سجل الحركات", icon: History },
    { k: "rewards", label: "المكافآت", icon: Ticket },
  ];

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) { setTab("overview"); onClose(); } }}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-cyan-500/10 border border-cyan-500/30 grid place-items-center">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> :
                <span className="text-xs font-bold text-cyan-300">GX</span>}
            </div>
            <span dir="ltr">{user?.username ? `@${user.username}` : user?.email}</span>
            {user?.roles.includes("admin") && <Crown size={14} className="text-amber-400" />}
            <Badge variant="outline" className="text-[10px] font-mono">{user?.level_code}</Badge>
          </DialogTitle>
          <DialogDescription dir="ltr" className="text-right flex items-center justify-end gap-2">
            {user?.username && (
              <button className="text-cyan-300 hover:underline inline-flex items-center gap-1"
                onClick={() => { navigator.clipboard.writeText(`@${user.username}`); toast.success("تم النسخ"); }}>
                @{user.username} <Copy size={11} />
              </button>
            )}
            <span>{user?.email}</span>
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10 w-fit">
              {tabs.map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition inline-flex items-center gap-1 ${tab === t.k ? "bg-cyan-500 text-black" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MiniStat label="الطلبات" value={user.orders_count} icon={<Package size={12} />} />
                  <MiniStat label="الإنفاق" value={`${Number(user.total_spent || 0).toFixed(2)} د.أ`} icon={<Star size={12} />} />
                  <MiniStat label="GX Coins" value={Number(user.gx_coins || 0).toLocaleString("en-US")} icon={<Coins size={12} className="text-amber-300" />} />
                  <MiniStat label="رصيد المتجر" value={`${Number(user.store_credit_jod ?? 0).toFixed(2)} د.أ`} icon={<Wallet size={12} className="text-sky-300" />} />
                  <MiniStat label="XP" value={Number(user.xp || 0).toLocaleString("en-US")} />
                  <MiniStat label="المستوى" value={user.level_code || "—"} />
                  <MiniStat label="واتساب" value={user.whatsapp || "—"} />
                  <MiniStat label="التسجيل" value={new Date(user.created_at).toLocaleDateString("ar-JO")} />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                  <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles size={14} className="text-cyan-300" /> تعديل يدوي</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <LabeledInput label="XP (+/-)" value={xpDelta} onChange={setXpDelta} placeholder="0" />
                    <LabeledInput label="GX Coins (+/-)" value={coinsDelta} onChange={setCoinsDelta} placeholder="0" />
                    <LabeledInput label="رصيد المتجر د.أ (+/-)" value={creditDelta} onChange={setCreditDelta} placeholder="0.00" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[100, 500, 1000].map((n) => (
                      <Button key={n} size="sm" variant="outline" className="text-[11px] h-7"
                        onClick={() => setCoinsDelta(String(n))}>+{n} عملة</Button>
                    ))}
                    {[1, 5].map((n) => (
                      <Button key={n} size="sm" variant="outline" className="text-[11px] h-7"
                        onClick={() => setCreditDelta(String(n))}>+{n} د.أ</Button>
                    ))}
                    {[1, 5].map((n) => (
                      <Button key={`mc${n}`} size="sm" variant="outline"
                        className="text-[11px] h-7 text-rose-300 border-rose-500/40"
                        disabled={Number(user.store_credit_jod ?? 0) <= 0}
                        onClick={() => setCreditDelta(String(-Math.min(n, Number(user.store_credit_jod ?? 0))))}>
                        −{n} د.أ
                      </Button>
                    ))}
                    <Button size="sm" variant="outline"
                      className="text-[11px] h-7 text-rose-300 border-rose-500/40"
                      disabled={Number(user.store_credit_jod ?? 0) <= 0}
                      onClick={() => setCreditDelta(String(-Number(user.store_credit_jod ?? 0)))}>
                      سحب كامل الرصيد
                    </Button>
                  </div>

                  <Input placeholder="سبب التعديل (إلزامي)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  {user.email && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-cyan-500 text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                      <span>إرسال إشعار بريدي للعميل عند إضافة الرصيد (من support@gxstore.me)</span>
                    </label>
                  )}
                  <Button className="bg-cyan-500 hover:bg-cyan-400 text-black w-full"
                    onClick={() => adjust.mutate()} disabled={adjust.isPending}>
                    {adjust.isPending ? "جارٍ التطبيق…" : "تطبيق التعديل"}
                  </Button>
                </div>
              </div>
            )}

            {tab === "orders" && (
              <div className="rounded-lg border border-white/10 overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 sticky top-0">
                    <tr className="text-right">
                      <th className="p-2 font-medium">رقم الطلب</th>
                      <th className="p-2 font-medium">الحالة</th>
                      <th className="p-2 font-medium">المبلغ</th>
                      <th className="p-2 font-medium">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersQ.data?.map((o) => (
                      <tr key={o.id} className="border-t border-white/5">
                        <td className="p-2 font-mono text-cyan-300">{o.order_number}</td>
                        <td className="p-2">{o.status}</td>
                        <td className="p-2">{Number(o.total_jod).toFixed(2)} د.أ</td>
                        <td className="p-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ar-JO")}</td>
                      </tr>
                    ))}
                    {ordersQ.data?.length === 0 && (
                      <tr><td colSpan={4} className="text-center p-6 text-muted-foreground">لا يوجد طلبات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "ledger" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LedgerBox title="GX Coins" color="text-amber-300" rows={(ledgerQ.data?.coins ?? []).map((r: any) => ({
                  id: r.id, amount: Number(r.amount), text: r.reason || r.source, date: r.created_at, suffix: "",
                }))} />
                <LedgerBox title="XP" color="text-violet-300" rows={(ledgerQ.data?.xp ?? []).map((r: any) => ({
                  id: r.id, amount: Number(r.amount), text: r.reason || r.source, date: r.created_at, suffix: "",
                }))} />
                <LedgerBox title="رصيد المتجر" color="text-sky-300" rows={(ledgerQ.data?.credit ?? []).map((r: any) => ({
                  id: r.id, amount: Number(r.amount_jod), text: r.reason || r.kind, date: r.created_at, suffix: " د.أ",
                }))} />
              </div>
            )}

            {tab === "rewards" && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold mb-2">كوبونات المستوى</div>
                  <div className="rounded-lg border border-white/10 divide-y divide-white/5 max-h-[200px] overflow-y-auto">
                    {(rewardsQ.data?.coupons ?? []).map((c: any) => {
                      const expired = new Date(c.expires_at) < new Date();
                      return (
                        <div key={c.id} className="p-2 flex items-center justify-between text-xs">
                          <button className="font-mono text-cyan-300 inline-flex items-center gap-1"
                            onClick={() => { navigator.clipboard.writeText(c.code); toast.success("تم النسخ"); }}>
                            {c.code} <Copy size={10} />
                          </button>
                          <span>{c.percent}%</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.used_at ? "مستخدم" : expired ? "منتهي" : "فعّال"}
                          </Badge>
                        </div>
                      );
                    })}
                    {rewardsQ.data && rewardsQ.data.coupons.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-xs">لا كوبونات</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">الشارات</div>
                  <div className="flex flex-wrap gap-2">
                    {(rewardsQ.data?.badges ?? []).map((b: any) => (
                      <div key={b.id} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs flex items-center gap-1.5">
                        <span>{b.badges?.icon}</span> {b.badges?.name_ar}
                      </div>
                    ))}
                    {rewardsQ.data && rewardsQ.data.badges.length === 0 && (
                      <div className="text-xs text-muted-foreground">لا شارات بعد</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {user?.username && (
            <a href={`/u/${user.username}`} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink size={13} className="ml-1" /> الملف العام</Button>
            </a>
          )}
          <Link to="/admin/orders" onClick={onClose}>
            <Button variant="outline">فتح كل الطلبات</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir="ltr" className="text-right" />
    </div>
  );
}

function LedgerBox({ title, color, rows }: {
  title: string; color: string;
  rows: { id: string; amount: number; text: string | null; date: string; suffix: string }[];
}) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className={`px-2.5 py-2 text-xs font-semibold bg-white/5 ${color}`}>{title}</div>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
        {rows.map((r) => (
          <div key={r.id} className="p-2 text-[11px] flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate">{r.text || "—"}</div>
              <div className="text-muted-foreground">{new Date(r.date).toLocaleDateString("ar-JO")}</div>
            </div>
            <span className={r.amount >= 0 ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
              {r.amount >= 0 ? "+" : ""}{r.amount}{r.suffix}
            </span>
          </div>
        ))}
        {rows.length === 0 && <div className="p-4 text-center text-muted-foreground text-[11px]">لا حركات</div>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-bold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function PreRegistrationCreditDialog({
  open,
  onClose,
  existingEmails,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  existingEmails: Set<string>;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [amountJod, setAmountJod] = useState("");
  const [reason, setReason] = useState("رصيد مسبق قبل التسجيل");
  const [coins, setCoins] = useState("");
  const [xp, setXp] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const cleanEmail = email.trim().toLowerCase();
  const isRegistered = useMemo(() => {
    return cleanEmail ? existingEmails.has(cleanEmail) : false;
  }, [cleanEmail, existingEmails]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("يرجى إدخال بريد إلكتروني صالح");
      }
      const amt = parseFloat(amountJod);
      if (!amt || amt <= 0) {
        throw new Error("يرجى إدخال مبلغ رصيد أكبر من 0 د.أ");
      }
      const c = parseInt(coins || "0", 10) || 0;
      const x = parseInt(xp || "0", 10) || 0;
      const { data, error } = await supabase.rpc("admin_add_unregistered_email_credit", {
        _email: cleanEmail,
        _amount_jod: amt,
        _reason: reason.trim() || "رصيد مسبق قبل التسجيل",
        _coins: c,
        _xp: x,
      });
      if (error) throw error;
      const res = data as any;
      if (res && res.ok === false) {
        throw new Error(res.message || "فشلت العملية");
      }

      if (sendEmail) {
        try {
          const emailRes = await sendCreditNotificationEmail({
            data: {
              email: cleanEmail,
              amountJod: amt,
              reason: reason.trim() || "رصيد مسبق قبل التسجيل",
              isRegistered,
              username: res?.username,
              coins: c,
              xp: x,
            },
          });
          if (emailRes?.ok) {
            toast.success("تم إرسال إشعار الرصيد للعميل عبر البريد (support@gxstore.me) بنجاح!");
          }
        } catch (mailErr) {
          console.error("Email send failed:", mailErr);
          toast.warning("تم حفظ الرصيد، لكن تعذر إرسال الإيميل للعميل");
        }
      }

      return res;
    },
    onSuccess: (res) => {
      toast.success(res?.message || "تمت إضافة وتخصيص الرصيد بنجاح!");
      setEmail("");
      setAmountJod("");
      setReason("رصيد مسبق قبل التسجيل");
      setCoins("");
      setXp("");
      setShowAdvanced(false);
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "حدث خطأ أثناء إضافة الرصيد");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-300">
              <UserPlus size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                إضافة رصيد لإيميل غير مسجل
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                تخصيص رصيد محفظة ينزل تلقائياً فور قيام العميل بالتسجيل في الموقع
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>البريد الإلكتروني للعميل <span className="text-rose-400">*</span></span>
              {cleanEmail && (
                <span className={`text-[11px] font-normal ${isRegistered ? "text-emerald-400" : "text-amber-400"}`}>
                  {isRegistered ? "مسجل بالموقع" : "غير مسجل حالياً"}
                </span>
              )}
            </label>
            <div className="relative">
              <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="pr-9 font-mono text-sm"
              />
            </div>

            {/* Smart dynamic detection indicator */}
            {cleanEmail && cleanEmail.includes("@") && (
              <div
                className={`p-2.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2 ${
                  isRegistered
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
                    : "bg-cyan-500/10 border-cyan-500/25 text-cyan-200"
                }`}
              >
                {isRegistered ? (
                  <>
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>هذا البريد مسجل بالفعل في الموقع:</strong> ستتم إضافة الرصيد إلى محفظته الحالية مباشرة فور الضغط على تأكيد.
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>هذا البريد غير مسجل بعد:</strong> سيتم حفظ الرصيد كـ (رصيد معلق)، ومجرد قيام العميل بالتسجيل أو فتح حساب على الموقع سيجد الرصيد في حسابه فوراً!
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              مبلغ الرصيد (بالدينار الأردني د.أ) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Wallet size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="0.00"
                value={amountJod}
                onChange={(e) => setAmountJod(e.target.value)}
                dir="ltr"
                className="pr-9 font-mono text-sm font-bold text-cyan-300"
              />
            </div>
            {/* Amount presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[1, 3, 5, 10, 15, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountJod(String(amt))}
                  className="px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 transition"
                >
                  +{amt} د.أ
                </button>
              ))}
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              سبب الإيداع / ملاحظة إدارية
            </label>
            <Input
              placeholder="مثال: تعويض طلب رقم #1234، هدية عميل، رصيد ترحيبي..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Optional extra loyalty rewards toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Coins size={12} />
              {showAdvanced ? "إخفاء مكافآت الولاء الإضافية" : "+ إضافة عملات GX أو XP ترحيبية (اختياري)"}
            </button>
            {showAdvanced && (
              <div className="mt-2 p-2.5 rounded-lg border border-white/10 bg-white/[0.02] grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">عملات GX Coins إضافية</div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={coins}
                    onChange={(e) => setCoins(e.target.value)}
                    dir="ltr"
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">نقاط خبرة XP إضافية</div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={xp}
                    onChange={(e) => setXp(e.target.value)}
                    dir="ltr"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Email notification toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-foreground">إرسال إشعار بريدي فوري للعميل</div>
                <div className="text-[11px] text-muted-foreground">المرسل الرسمي: support@gxstore.me</div>
              </div>
            </div>
            <input
              type="checkbox"
              id="sendEmailCheck"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={addMutation.isPending}>
            إلغاء
          </Button>
          <Button
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "جارٍ الحفظ والتخصيص…" : "تأكيد وحفظ الرصيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingCreditsSection({
  credits,
  isLoading,
  onCancel,
  isCancelling,
}: {
  credits: PendingEmailCredit[];
  isLoading: boolean;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "claimed" | "cancelled">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return credits.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        return c.email.toLowerCase().includes(s) || (c.reason || "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [credits, filter, search]);

  return (
    <Card className="border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-300">
              <Clock size={16} />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>سجل الأرصدة المعلقة قبل التسجيل</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {credits.length}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">
                الأرصدة المخصصة لإيميلات بانتظار قيام أصحابها بإنشاء حسابات في الموقع
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-48">
              <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالإيميل أو السبب…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pr-8"
              />
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
              {(["all", "pending", "claimed", "cancelled"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    filter === st ? "bg-cyan-500 text-black font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st === "all" ? "الكل" : st === "pending" ? "معلق" : st === "claimed" ? "تم التحصيل" : "ملغى"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b border-white/10 bg-white/[0.02]">
              <tr className="text-right">
                <th className="p-2.5 font-medium">البريد الإلكتروني</th>
                <th className="p-2.5 font-medium">الرصيد المخصص</th>
                <th className="p-2.5 font-medium">السبب / الملاحظة</th>
                <th className="p-2.5 font-medium">تاريخ الإضافة</th>
                <th className="p-2.5 font-medium">الحالة</th>
                <th className="p-2.5 font-medium text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    جارٍ تحميل الأرصدة المعلقة…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا توجد أرصدة مطابقة
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="p-2.5 font-mono text-cyan-300 select-all" dir="ltr">
                      {c.email}
                    </td>
                    <td className="p-2.5 font-bold text-sky-300">
                      {Number(c.amount_jod).toFixed(2)} د.أ
                      {(c.coins > 0 || c.xp > 0) && (
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {c.coins > 0 ? `+${c.coins} عملة ` : ""}
                          {c.xp > 0 ? `+${c.xp} XP` : ""}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground max-w-[200px] truncate" title={c.reason}>
                      {c.reason || "—"}
                    </td>
                    <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString("ar-JO", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      {c.status === "pending" && (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                          <Clock size={10} className="ml-1" /> معلق بانتظار التسجيل
                        </Badge>
                      )}
                      {c.status === "claimed" && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                          <CheckCircle2 size={10} className="ml-1" /> تم التحصيل (سجّل العميل)
                        </Badge>
                      )}
                      {c.status === "cancelled" && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          ملغى
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-left whitespace-nowrap">
                      {c.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs px-2"
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من إلغاء الرصيد المعلق (${c.amount_jod} د.أ) للإيميل: ${c.email}؟`)) {
                              onCancel(c.id);
                            }
                          }}
                          disabled={isCancelling}
                        >
                          <Trash2 size={12} className="ml-1" /> إلغاء
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

