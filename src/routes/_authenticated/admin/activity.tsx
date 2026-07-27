import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity as ActivityIcon, RefreshCcw, Download, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: () => ({ meta: [{ title: "سجل النشاطات — لوحة التحكم" }] }),
  component: ActivityPage,
});

type LogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  "order.status_changed": "تغيير حالة طلب",
  "role.granted": "منح صلاحية",
  "role.revoked": "سحب صلاحية",
  "product.created": "إنشاء منتج",
  "product.updated": "تعديل منتج",
  "product.deleted": "حذف منتج",
  "category.created": "إنشاء قسم",
  "category.updated": "تعديل قسم",
  "settings.updated": "تعديل إعدادات",
};

const ACTION_COLOR: Record<string, string> = {
  "order.status_changed": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "role.granted": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "role.revoked": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "settings.updated": "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function ActivityPage() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [range, setRange] = useState<string>("7d");

  const query = useQuery({
    queryKey: ["admin-activity", range],
    queryFn: async () => {
      const since = new Date();
      if (range === "24h") since.setHours(since.getHours() - 24);
      else if (range === "7d") since.setDate(since.getDate() - 7);
      else if (range === "30d") since.setDate(since.getDate() - 30);
      else since.setFullYear(since.getFullYear() - 5);
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    return rows.filter((r) => {
      if (action !== "all" && r.action !== action) return false;
      if (q) {
        const hay = `${r.actor_email ?? ""} ${r.action} ${JSON.stringify(r.metadata)}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [query.data, action, q]);

  const actions = useMemo(() => {
    const s = new Set<string>();
    (query.data ?? []).forEach((r) => s.add(r.action));
    return Array.from(s);
  }, [query.data]);

  function exportCsv() {
    const rows = filtered;
    const header = ["التاريخ", "المُنفّذ", "الحدث", "النوع", "المعرّف", "التفاصيل"];
    const lines = rows.map((r) => [
      new Date(r.created_at).toLocaleString("ar-JO"),
      r.actor_email ?? "",
      ACTION_LABEL[r.action] ?? r.action,
      r.entity_type ?? "",
      r.entity_id ?? "",
      JSON.stringify(r.metadata).replace(/"/g, '""'),
    ].map((c) => `"${c}"`).join(","));
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gx-activity-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center">
            <ActivityIcon size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">سجل النشاطات</h1>
            <p className="text-xs text-muted-foreground">جميع الإجراءات التي نفّذها المدراء</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            <RefreshCcw size={14} className="ml-1" /> تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={14} className="ml-1" /> تصدير CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث بالإيميل أو التفاصيل…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="نوع الحدث" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأحداث</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">آخر 24 ساعة</SelectItem>
                <SelectItem value="7d">آخر 7 أيام</SelectItem>
                <SelectItem value="30d">آخر 30 يوم</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2 font-medium">التاريخ</th>
                  <th className="p-2 font-medium">المُنفّذ</th>
                  <th className="p-2 font-medium">الحدث</th>
                  <th className="p-2 font-medium">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("ar-JO")}
                    </td>
                    <td className="p-2" dir="ltr">{r.actor_email ?? "—"}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={ACTION_COLOR[r.action] ?? ""}>
                        {ACTION_LABEL[r.action] ?? r.action}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs">
                      <MetaCell action={r.action} metadata={r.metadata} entity_id={r.entity_id} />
                    </td>
                  </tr>
                ))}
                {!query.isLoading && filtered.length === 0 && (
                  <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">لا توجد نشاطات</td></tr>
                )}
                {query.isLoading && (
                  <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">جاري التحميل…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaCell({ action, metadata, entity_id }: { action: string; metadata: Record<string, unknown>; entity_id: string | null }) {
  if (action === "order.status_changed") {
    return (
      <span>
        الطلب <b className="text-cyan-300">{String(metadata.order_number ?? entity_id)}</b>:{" "}
        <span className="text-muted-foreground">{String(metadata.from ?? "?")}</span>
        {" → "}
        <span className="text-emerald-400">{String(metadata.to ?? "?")}</span>
      </span>
    );
  }
  if (action === "role.granted" || action === "role.revoked") {
    return (
      <span>
        <b className="text-cyan-300">{String(metadata.role ?? "?")}</b>{" — "}
        <span dir="ltr">{String(metadata.target_email ?? entity_id ?? "")}</span>
      </span>
    );
  }
  if (action === "settings.updated") {
    return <span>مفاتيح: <b className="text-cyan-300">{String((metadata.keys as string[])?.join?.(", ") ?? "")}</b></span>;
  }
  return <span className="text-muted-foreground">{JSON.stringify(metadata)}</span>;
}
