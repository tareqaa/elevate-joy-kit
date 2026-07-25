import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — GX Store" }] }),
  component: AccountPage,
});

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "قيد الانتظار", variant: "secondary" },
  paid: { label: "تم الدفع", variant: "outline" },
  processing: { label: "قيد التجهيز", variant: "outline" },
  delivered: { label: "مُسلَّم", variant: "default" },
  cancelled: { label: "ملغى", variant: "destructive" },
};

function AccountPage() {
  const { user } = Route.useRouteContext();

  const profileQ = useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ordersQ = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const xp = profileQ.data?.xp ?? 0;
  const level = profileQ.data?.level ?? 1;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const prevLevelXp = Math.pow(level - 1, 2) * 100;
  const progress = Math.min(100, ((xp - prevLevelXp) / Math.max(nextLevelXp - prevLevelXp, 1)) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>مرحباً {profileQ.data?.full_name || user.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <div>الإيميل: <span dir="ltr">{user.email}</span></div>
              <div>إجمالي مشترياتك: <b>{Number(profileQ.data?.total_spent ?? 0).toFixed(2)} د.أ</b></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>المستوى {level}</span>
              <Badge variant="secondary">{xp} XP</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.max(0, nextLevelXp - xp)} XP للمستوى القادم
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل الطلبات</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersQ.isLoading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}
          {ordersQ.data && ordersQ.data.length === 0 && (
            <p className="text-sm text-muted-foreground">ما عندك طلبات لسا. <a href="/app/index.html" className="text-primary underline">ابدأ التسوق</a></p>
          )}
          <div className="space-y-3">
            {ordersQ.data?.map((o) => {
              const status = STATUS_LABELS[o.status] ?? { label: o.status, variant: "secondary" as const };
              const items = Array.isArray(o.items) ? o.items : [];
              const delivery = o.delivery_data && typeof o.delivery_data === "object" ? o.delivery_data as Record<string, unknown> : {};
              const codes = Array.isArray((delivery as { codes?: unknown }).codes) ? (delivery as { codes: Array<{ label?: string; value?: string }> }).codes : [];
              return (
                <div key={o.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-mono text-sm">{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("ar-EG")}
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    {items.map((it: { name?: string; qty?: number; price?: number }, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.name} × {it.qty}</span>
                        <span>{((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} د.أ</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between font-bold border-t pt-2">
                    <span>الإجمالي</span>
                    <span>{Number(o.total_jod).toFixed(2)} د.أ</span>
                  </div>
                  {o.status === "delivered" && codes.length > 0 && (
                    <div className="mt-3 bg-muted/50 rounded p-3 space-y-2">
                      <div className="text-sm font-semibold">🎁 تفاصيل التسليم:</div>
                      {codes.map((c, i) => (
                        <div key={i} className="text-sm">
                          <div className="text-muted-foreground">{c.label}</div>
                          <div className="font-mono bg-background border rounded p-2 mt-1 select-all" dir="ltr">{c.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {o.admin_notes && (
                    <div className="mt-3 text-sm bg-muted/30 rounded p-2">
                      <span className="font-semibold">ملاحظة:</span> {o.admin_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
