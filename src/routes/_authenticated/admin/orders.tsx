import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "الطلبات — لوحة التحكم" }] }),
  component: OrdersAdmin,
});

const STATUSES = ["pending", "paid", "processing", "delivered", "cancelled"] as const;
const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", paid: "مدفوع", processing: "قيد التجهيز", delivered: "مُسلَّم", cancelled: "ملغى",
};

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string | null;
  customer_whatsapp: string | null;
  items: unknown;
  total_jod: number;
  status: string;
  admin_notes: string | null;
  delivery_data: unknown;
  created_at: string;
};

type OrderWithEmail = OrderRow & { user_email: string | null; user_username: string | null };

function OrdersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<OrderWithEmail | null>(null);

  const ordersQ = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as typeof STATUSES[number]);
      const { data, error } = await q;
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
  });

  const filtered = (ordersQ.data ?? []).filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      (o.customer_name ?? "").toLowerCase().includes(s) ||
      (o.user_email ?? "").toLowerCase().includes(s) ||
      (o.user_username ?? "").toLowerCase().includes(s) ||
      (o.customer_whatsapp ?? "").toLowerCase().includes(s)
    );
  });

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle>الطلبات ({filtered.length})</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="بحث برقم الطلب / الاسم / الإيميل / اليوزر / واتساب" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_AR[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr className="text-right">
                <th className="p-2">رقم الطلب</th>
                <th className="p-2">التاريخ</th>
                <th className="p-2">العميل</th>
                <th className="p-2">الإيميل</th>
                <th className="p-2">الإجمالي</th>
                <th className="p-2">الحالة</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b hover:bg-accent/30">
                  <td className="p-2 font-mono">{o.order_number}</td>
                  <td className="p-2 text-xs">{new Date(o.created_at).toLocaleString("ar-EG")}</td>
                  <td className="p-2">
                    {o.customer_name || (o.user_id ? "مستخدم مسجّل" : "زائر")}
                    {o.user_username && <div className="text-xs text-muted-foreground">@{o.user_username}</div>}
                  </td>
                  <td className="p-2 text-xs" dir="ltr">
                    {o.user_email ? (
                      <a href={`mailto:${o.user_email}`} className="hover:text-primary underline-offset-2 hover:underline">{o.user_email}</a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2">{Number(o.total_jod).toFixed(2)} د.أ</td>
                  <td className="p-2"><Badge>{STATUS_AR[o.status] ?? o.status}</Badge></td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={() => setSelected(o)}>تفاصيل</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center p-6 text-muted-foreground">لا يوجد طلبات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {selected && (
        <OrderDialog
          order={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => updateMut.mutate({ id: selected.id, patch }, { onSuccess: () => setSelected(null) })}
        />
      )}
    </Card>
  );
}


function OrderDialog({ order, onClose, onSave }: { order: OrderWithEmail; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const items = Array.isArray(order.items) ? order.items : [];
  const existingDelivery = order.delivery_data && typeof order.delivery_data === "object" ? order.delivery_data as { codes?: Array<{ label: string; value: string }> } : {};
  const [codes, setCodes] = useState<Array<{ label: string; value: string }>>(existingDelivery.codes ?? [{ label: "", value: "" }]);

  function addCode() { setCodes([...codes, { label: "", value: "" }]); }
  function updateCode(i: number, patch: Partial<{ label: string; value: string }>) {
    setCodes(codes.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCode(i: number) { setCodes(codes.filter((_, idx) => idx !== i)); }

  function save() {
    const cleanCodes = codes.filter((c) => c.label.trim() || c.value.trim());
    onSave({
      status,
      admin_notes: notes.trim() || null,
      delivery_data: { codes: cleanCodes },
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>الطلب <span className="font-mono">{order.order_number}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <div><b>العميل:</b> {order.customer_name || "زائر"} {order.user_username && <span className="text-muted-foreground">(@{order.user_username})</span>}</div>
            {order.user_email && <div><b>الإيميل:</b> <a href={`mailto:${order.user_email}`} dir="ltr" className="text-primary hover:underline">{order.user_email}</a></div>}
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
                    <div className="text-xs text-muted-foreground mr-3">
                      يوزرات: {it.usernames.join(", ")}
                    </div>
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
            <div className="flex items-center justify-between">
              <Label>أكواد/بيانات التسليم للعميل</Label>
              <Button type="button" size="sm" variant="outline" onClick={addCode}>+ إضافة</Button>
            </div>
            <div className="space-y-2 mt-2">
              {codes.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="الوصف (مثلاً: كود PlayStation 25$)" value={c.label} onChange={(e) => updateCode(i, { label: e.target.value })} />
                  <Input placeholder="القيمة" dir="ltr" value={c.value} onChange={(e) => updateCode(i, { value: e.target.value })} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeCode(i)}>×</Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>ملاحظة للعميل</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>إغلاق</Button>
            <Button onClick={save}>حفظ</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
