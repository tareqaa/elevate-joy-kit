import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Disc3, Plus, Trash2, Pencil, RefreshCcw, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/wheel")({
  head: () => ({ meta: [{ title: "عجلة الحظ — لوحة التحكم" }] }),
  component: WheelAdmin,
});

type RewardType = "xp" | "gx_coins" | "discount_percent" | "boost_double_coins" | "boost_double_xp" | "no_reward";
type Rarity = "common" | "rare" | "epic" | "legendary";

type PrizeRow = {
  id: string;
  name: string;
  icon: string;
  reward_type: RewardType;
  reward_value: number | null;
  rarity: Rarity;
  color: string;
  weight: number;
  coupon_max_discount_jod: number | null;
  coupon_valid_hours: number;
  is_active: boolean;
  sort_order: number;
};

const TYPES: { value: RewardType; label: string }[] = [
  { value: "xp", label: "نقاط XP" },
  { value: "gx_coins", label: "GX Coins" },
  { value: "discount_percent", label: "كوبون خصم نسبة %" },
  { value: "boost_double_coins", label: "مضاعفة GX Coins" },
  { value: "boost_double_xp", label: "مضاعفة XP" },
  { value: "no_reward", label: "بدون جائزة (حظ أوفر)" },
];

const RARITIES: { value: Rarity; label: string }[] = [
  { value: "common", label: "عادية" },
  { value: "rare", label: "نادرة" },
  { value: "epic", label: "ملحمية" },
  { value: "legendary", label: "أسطورية" },
];

function typeLabel(v: string) {
  return TYPES.find((t) => t.value === v)?.label ?? v;
}

function needsValue(t?: RewardType) {
  return t === "xp" || t === "gx_coins" || t === "discount_percent";
}

function WheelAdmin() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<PrizeRow> | null>(null);
  const [confirmDel, setConfirmDel] = useState<PrizeRow | null>(null);

  const prizesQ = useQuery({
    queryKey: ["admin-wheel-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wheel_prizes").select("*").order("sort_order").order("id");
      if (error) throw error;
      return (data ?? []) as unknown as PrizeRow[];
    },
  });

  const spinsQ = useQuery({
    queryKey: ["admin-wheel-spins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wheel_spins")
        .select("id, user_id, prize_snapshot, spun_at")
        .order("spun_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data ?? []) as {
        id: string; user_id: string; prize_snapshot: Record<string, unknown> | null; spun_at: string;
      }[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, email").in("id", ids);
        (profs ?? []).forEach((p: { id: string; username: string | null; email: string | null }) =>
          names.set(p.id, p.username || p.email || p.id.slice(0, 8)));
      }
      return rows.map((r) => ({ ...r, who: names.get(r.user_id) ?? r.user_id.slice(0, 8) }));
    },
  });

  const prizes = prizesQ.data ?? [];
  const activeWeight = useMemo(
    () => prizes.filter((p) => p.is_active).reduce((a, p) => a + (p.weight || 0), 0),
    [prizes],
  );

  const saveM = useMutation({
    mutationFn: async (row: Partial<PrizeRow>) => {
      const rt = (row.reward_type ?? "gx_coins") as RewardType;
      const payload = {
        name: (row.name ?? "").trim(),
        icon: (row.icon ?? "🎁").trim() || "🎁",
        reward_type: rt,
        reward_value: needsValue(rt) ? Number(row.reward_value) || 0 : null,
        rarity: (row.rarity ?? "common") as Rarity,
        color: (row.color ?? "#0ea5b7").trim() || "#0ea5b7",
        weight: Math.max(1, Number(row.weight) || 1),
        coupon_max_discount_jod:
          row.coupon_max_discount_jod === null || row.coupon_max_discount_jod === undefined ||
          row.coupon_max_discount_jod === ("" as unknown as number) ? null : Number(row.coupon_max_discount_jod),
        coupon_valid_hours: Math.max(1, Number(row.coupon_valid_hours) || 24),
        is_active: row.is_active ?? true,
        sort_order: Number(row.sort_order) || (prizes.length + 1),
      };
      if (!payload.name) throw new Error("اسم الجائزة مطلوب");
      if (needsValue(rt) && !(payload.reward_value && payload.reward_value > 0)) throw new Error("أدخل قيمة الجائزة");
      if (row.id) {
        const { error } = await supabase.from("wheel_prizes").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wheel_prizes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setEdit(null);
      void qc.invalidateQueries({ queryKey: ["admin-wheel-prizes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: async (p: PrizeRow) => {
      const { error } = await supabase.from("wheel_prizes").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-wheel-prizes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: async (p: PrizeRow) => {
      const { error } = await supabase.from("wheel_prizes").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      setConfirmDel(null);
      void qc.invalidateQueries({ queryKey: ["admin-wheel-prizes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2"><Disc3 className="w-5 h-5 text-primary" /> عجلة الحظ</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { void prizesQ.refetch(); void spinsQ.refetch(); }}>
            <RefreshCcw className="w-4 h-4 ms-1" /> تحديث
          </Button>
          <Button size="sm" onClick={() => setEdit({ reward_type: "gx_coins", weight: 10, reward_value: 10, rarity: "common", color: "#0ea5b7", icon: "🎁", coupon_valid_hours: 24, is_active: true })}>
            <Plus className="w-4 h-4 ms-1" /> جائزة جديدة
          </Button>
        </div>
      </div>

      <Tabs defaultValue="prizes" dir="rtl">
        <TabsList>
          <TabsTrigger value="prizes">الجوائز</TabsTrigger>
          <TabsTrigger value="log"><History className="w-4 h-4 ms-1" /> سجل اللفات</TabsTrigger>
        </TabsList>

        <TabsContent value="prizes" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">مجموع أوزان الجوائز الفعّالة: <span className="font-bold text-foreground">{activeWeight}</span></p>
          {prizes.map((p) => {
            const chance = p.is_active && activeWeight > 0 ? (p.weight / activeWeight) * 100 : 0;
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-48">
                    <div className="font-bold flex items-center gap-2">
                      <span aria-hidden style={{ color: p.color }}>{p.icon}</span>{p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {typeLabel(p.reward_type)}{p.reward_value !== null ? ` — القيمة ${p.reward_value}` : ""}
                      {` — ${RARITIES.find((r) => r.value === p.rarity)?.label ?? p.rarity}`}
                    </div>
                  </div>
                  <Badge variant="outline">الوزن {p.weight}</Badge>
                  <Badge className={chance > 0 ? "bg-primary/15 text-primary border-primary/40" : ""} variant="outline">
                    فرصة ≈ {chance.toFixed(1)}%
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleM.mutate(p)} />
                    <span className="text-xs text-muted-foreground">{p.is_active ? "مفعّلة" : "معطّلة"}</span>
                  </div>
                  <Button size="icon" variant="outline" onClick={() => setEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setConfirmDel(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            );
          })}
          {prizes.length === 0 && !prizesQ.isLoading && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد جوائز بعد</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-start p-3">المستخدم</th>
                    <th className="text-start p-3">الجائزة</th>
                    <th className="text-start p-3">الكوبون</th>
                    <th className="text-start p-3">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {(spinsQ.data ?? []).map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3">{s.who}</td>
                      <td className="p-3">{String((s.prize_snapshot as { name?: string } | null)?.name ?? "—")}</td>
                      <td className="p-3 font-mono" dir="ltr">{String((s.prize_snapshot as { coupon_code?: string } | null)?.coupon_code ?? "—")}</td>
                      <td className="p-3 text-muted-foreground">{new Date(s.spun_at).toLocaleString("ar-EG")}</td>
                    </tr>
                  ))}
                  {(spinsQ.data ?? []).length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد لفات بعد</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{edit?.id ? "تعديل جائزة" : "جائزة جديدة"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>النوع</Label>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={edit.reward_type ?? "gx_coins"}
                    onChange={(e) => setEdit({ ...edit, reward_type: e.target.value as RewardType })}
                  >
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>القيمة</Label>
                  <Input
                    type="number" disabled={!needsValue(edit.reward_type)}
                    value={edit.reward_value ?? 0}
                    onChange={(e) => setEdit({ ...edit, reward_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>الندرة</Label>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={edit.rarity ?? "common"}
                    onChange={(e) => setEdit({ ...edit, rarity: e.target.value as Rarity })}
                  >
                    {RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>اللون</Label>
                  <Input type="color" value={edit.color ?? "#0ea5b7"} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الأيقونة</Label>
                  <Input value={edit.icon ?? "🎁"} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>وزن الاحتمال</Label>
                  <Input type="number" min={1} value={edit.weight ?? 1} onChange={(e) => setEdit({ ...edit, weight: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">
                    فرصة تقريبية ≈ {(() => {
                      const w = Math.max(1, Number(edit.weight) || 1);
                      const others = prizes.filter((p) => p.is_active && p.id !== edit.id).reduce((a, p) => a + p.weight, 0);
                      const total = others + ((edit.is_active ?? true) ? w : 0);
                      return total > 0 && (edit.is_active ?? true) ? ((w / total) * 100).toFixed(1) : "0.0";
                    })()}%
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>صلاحية الكوبون (ساعات)</Label>
                  <Input type="number" min={1} value={edit.coupon_valid_hours ?? 24} onChange={(e) => setEdit({ ...edit, coupon_valid_hours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الحد الأقصى للخصم (د.أ) — اختياري</Label>
                <Input
                  type="number" value={edit.coupon_max_discount_jod ?? ""}
                  onChange={(e) => setEdit({ ...edit, coupon_max_discount_jod: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />
                <span className="text-sm">مفعّلة</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button>
            <Button onClick={() => edit && saveM.mutate(edit)} disabled={saveM.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>حذف الجائزة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل تريد حذف «{confirmDel?.name}»؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => confirmDel && delM.mutate(confirmDel)} disabled={delM.isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
