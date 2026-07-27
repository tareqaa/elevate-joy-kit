import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users as UsersIcon, Search, ShieldCheck, ShieldOff, Package,
  RefreshCcw, Crown, Download,
} from "lucide-react";

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
  total_spent: number;
  xp: number;
  level: number;
  created_at: string;
  roles: string[];
  orders_count: number;
};

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admins" | "users">("all");
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);

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

  const filtered = useMemo(() => {
    const rows = usersQ.data ?? [];
    return rows.filter((u) => {
      if (filter === "admins" && !u.roles.includes("admin")) return false;
      if (filter === "users" && u.roles.includes("admin")) return false;
      if (q) {
        const hay = `${u.full_name ?? ""} ${u.email ?? ""} ${u.username ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [usersQ.data, q, filter]);

  const stats = useMemo(() => {
    const rows = usersQ.data ?? [];
    return {
      total: rows.length,
      admins: rows.filter((u) => u.roles.includes("admin")).length,
      buyers: rows.filter((u) => u.orders_count > 0).length,
      revenue: rows.reduce((s, u) => s + Number(u.total_spent || 0), 0),
    };
  }, [usersQ.data]);

  function exportCsv() {
    const header = ["الاسم", "الإيميل", "المعرّف", "الطلبات", "الإنفاق (د.أ)", "الصلاحيات", "التسجيل"];
    const lines = filtered.map((u) => [
      u.full_name ?? "",
      u.email ?? "",
      u.username ?? "",
      u.orders_count,
      Number(u.total_spent || 0).toFixed(2),
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
            <h1 className="text-xl font-bold">المستخدمون</h1>
            <p className="text-xs text-muted-foreground">إدارة الحسابات والصلاحيات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => usersQ.refetch()}>
            <RefreshCcw size={14} className="ml-1" /> تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={14} className="ml-1" /> تصدير CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي المستخدمين" value={stats.total} color="cyan" />
        <StatCard label="المدراء" value={stats.admins} color="amber" />
        <StatCard label="مشترون فعليون" value={stats.buyers} color="emerald" />
        <StatCard label="إجمالي الإنفاق (د.أ)" value={stats.revenue.toFixed(2)} color="violet" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث بالاسم، الإيميل، أو المعرّف…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
            </div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
              {(["all", "admins", "users"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === f ? "bg-cyan-500 text-black" : "text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "الكل" : f === "admins" ? "المدراء" : "مستخدمون"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2 font-medium">المستخدم</th>
                  <th className="p-2 font-medium">المعرّف</th>
                  <th className="p-2 font-medium">الطلبات</th>
                  <th className="p-2 font-medium">الإنفاق</th>
                  <th className="p-2 font-medium">الصلاحية</th>
                  <th className="p-2 font-medium">التسجيل</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isAdmin = u.roles.includes("admin");
                  const initials = (u.full_name || u.email || "GX").trim().slice(0, 2).toUpperCase();
                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                      <td className="p-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-cyan-500/10 border border-cyan-500/30 grid place-items-center flex-shrink-0">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> :
                              <span className="text-xs font-bold text-cyan-300">{initials}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate flex items-center gap-1.5">
                              {u.full_name || "بدون اسم"}
                              {isAdmin && <Crown size={12} className="text-amber-400" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate" dir="ltr">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs" dir="ltr">{u.username ? `@${u.username}` : "—"}</td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${u.orders_count > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-muted-foreground"}`}>
                          <Package size={11} /> {u.orders_count}
                        </span>
                      </td>
                      <td className="p-2 text-xs">{Number(u.total_spent || 0).toFixed(2)} د.أ</td>
                      <td className="p-2">
                        {isAdmin ? <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">Admin</Badge>
                          : <span className="text-muted-foreground text-xs">مستخدم</span>}
                      </td>
                      <td className="p-2 text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("ar-JO")}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setDetailUser(u)}>تفاصيل</Button>
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
                  <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">لا نتائج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />
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
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function UserDetailDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const ordersQ = useQuery({
    queryKey: ["admin-user-orders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, order_number, status, total_jod, created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user?.full_name || user?.email}
            {user?.roles.includes("admin") && <Crown size={14} className="text-amber-400" />}
          </DialogTitle>
          <DialogDescription dir="ltr" className="text-right">{user?.email}</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="الطلبات" value={user.orders_count} />
              <MiniStat label="الإنفاق" value={`${Number(user.total_spent || 0).toFixed(2)} د.أ`} />
              <MiniStat label="المعرّف" value={user.username ? `@${user.username}` : "—"} />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">آخر الطلبات</div>
              <div className="rounded-lg border border-white/10 overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5">
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
                      <tr><td colSpan={4} className="text-center p-4 text-muted-foreground">لا يوجد طلبات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Link to="/admin/orders" onClick={onClose}>
            <Button variant="outline">فتح كل الطلبات</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}
