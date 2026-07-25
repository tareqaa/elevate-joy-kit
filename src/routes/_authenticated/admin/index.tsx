import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — GX Store" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [ordersRes, usersRes, revenueRes, pendingRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_jod").in("status", ["paid", "processing", "delivered"]),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const revenue = (revenueRes.data ?? []).reduce((s, o) => s + Number(o.total_jod || 0), 0);
      return {
        orders: ordersRes.count ?? 0,
        users: usersRes.count ?? 0,
        revenue,
        pending: pendingRes.count ?? 0,
      };
    },
  });

  const cards = [
    { title: "إجمالي الطلبات", value: stats.data?.orders ?? "—" },
    { title: "طلبات قيد الانتظار", value: stats.data?.pending ?? "—" },
    { title: "إجمالي المستخدمين", value: stats.data?.users ?? "—" },
    { title: "المبيعات (د.أ)", value: stats.data ? stats.data.revenue.toFixed(2) : "—" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
