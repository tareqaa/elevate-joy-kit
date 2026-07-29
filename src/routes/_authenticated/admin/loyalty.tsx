import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Coins, Search, Trophy, Save, Ticket, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/loyalty")({
  head: () => ({ meta: [{ title: "نظام الولاء — لوحة التحكم" }] }),
  component: LoyaltyAdmin,
});

type LevelRow = {
  id: string; code: string; name_ar: string; name_en: string; min_xp: number;
  reward_coins: number; coupon_percent: number; coupon_max_discount_jod: number | null;
  coupon_valid_days: number; coins_bonus_pct: number; color: string; gradient: string;
  icon: string; sort_order: number; is_active: boolean;
};

function LoyaltyAdmin() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 grid place-items-center">
          <Sparkles size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">نظام الولاء GX</h1>
          <p className="text-xs text-muted-foreground">المستويات، النقاط، العملات، والكوبونات</p>
        </div>
      </div>

      <Tabs defaultValue="levels" dir="rtl">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl h-11">
          <TabsTrigger value="levels" className="gap-2"><Trophy className="w-4 h-4" />المستويات</TabsTrigger>
          <TabsTrigger value="customers" className="gap-2"><Coins className="w-4 h-4" />العملاء</TabsTrigger>
          <TabsTrigger value="credit" className="gap-2"><Wallet className="w-4 h-4" />الرصيد والاسترجاع</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2"><Ticket className="w-4 h-4" />كوبونات المستوى</TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-4"><LevelsTab /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
        <TabsContent value="credit" className="mt-4"><CreditTab /></TabsContent>
        <TabsContent value="coupons" className="mt-4"><CouponsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function LevelsTab() {
  const qc = useQueryClient();
  const levelsQ = useQuery({
    queryKey: ["admin-levels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("levels").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as LevelRow[];
    },
  });
  const [draft, setDraft] = useState<Record<string, Partial<LevelRow>>>({});

  const save = useMutation({
    mutationFn: async (l: LevelRow) => {
      const patch = draft[l.id] ?? {};
      const { error } = await supabase.from("levels").update({
        name_ar: patch.name_ar ?? l.name_ar,
        name_en: patch.name_en ?? l.name_en,
        min_xp: Number(patch.min_xp ?? l.min_xp),
        reward_coins: Number(patch.reward_coins ?? l.reward_coins),
        coupon_percent: Number(patch.coupon_percent ?? l.coupon_percent),
        coupon_max_discount_jod: patch.coupon_max_discount_jod === undefined
          ? l.coupon_max_discount_jod : (patch.coupon_max_discount_jod === null ? null : Number(patch.coupon_max_discount_jod)),
        coupon_valid_days: Number(patch.coupon_valid_days ?? l.coupon_valid_days),
        coins_bonus_pct: Number(patch.coins_bonus_pct ?? l.coins_bonus_pct),
        is_active: patch.is_active ?? l.is_active,
      }).eq("id", l.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم حفظ المستوى"); qc.invalidateQueries({ queryKey: ["admin-levels"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (id: string, patch: Partial<LevelRow>) =>
    setDraft((d) => ({ ...d, [id]: { ...(d[id] ?? {}), ...patch } }));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {(levelsQ.data ?? []).map((l) => {
        const v = { ...l, ...(draft[l.id] ?? {}) };
        return (
          <Card key={l.id} className="overflow-hidden">
            <div className="h-1.5" style={{ background: l.gradient }} />
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xl">{l.icon}</span>
                <span style={{ color: l.color }}>{l.name_ar}</span>
                <Badge variant="outline" className="text-[10px] ms-auto font-mono">{l.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              <Field label="الاسم (عربي)"><Input value={v.name_ar} onChange={(e) => set(l.id, { name_ar: e.target.value })} /></Field>
              <Field label="الاسم (إنجليزي)"><Input value={v.name_en} onChange={(e) => set(l.id, { name_en: e.target.value })} /></Field>
              <Field label="أقل XP"><Input type="number" value={v.min_xp} onChange={(e) => set(l.id, { min_xp: Number(e.target.value) })} /></Field>
              <Field label="عملات الهدية"><Input type="number" value={v.reward_coins} onChange={(e) => set(l.id, { reward_coins: Number(e.target.value) })} /></Field>
              <Field label="نسبة الكوبون %"><Input type="number" value={v.coupon_percent} onChange={(e) => set(l.id, { coupon_percent: Number(e.target.value) })} /></Field>
              <Field label="حد الكوبون (د.أ)">
                <Input type="number" value={v.coupon_max_discount_jod ?? ""}
                  onChange={(e) => set(l.id, { coupon_max_discount_jod: e.target.value === "" ? null : Number(e.target.value) })} />
              </Field>
              <Field label="صلاحية الكوبون (يوم)"><Input type="number" value={v.coupon_valid_days} onChange={(e) => set(l.id, { coupon_valid_days: Number(e.target.value) })} /></Field>
              <Field label="بونص العملات %"><Input type="number" value={v.coins_bonus_pct} onChange={(e) => set(l.id, { coins_bonus_pct: Number(e.target.value) })} /></Field>
              <div className="col-span-2 flex justify-end">
                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black" disabled={save.isPending}
                  onClick={() => save.mutate(l)}>
                  <Save size={14} className="ml-1" /> حفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CustomersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [xp, setXp] = useState("0");
  const [coins, setCoins] = useState("0");
  const [reason, setReason] = useState("");
  const [creditTarget, setCreditTarget] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [credit, setCredit] = useState("0");
  const [creditReason, setCreditReason] = useState("");

  const rowsQ = useQuery({
    queryKey: ["admin-loyalty-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, xp, gx_coins, level_code, orders_count, total_spent, store_credit_jod")
        .order("xp", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const { error } = await supabase.rpc("admin_adjust_loyalty", {
        _user_id: target.id,
        _xp: Number(xp) || 0,
        _coins: Number(coins) || 0,
        _reason: reason.trim() || "تعديل يدوي من الإدارة",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التعديل");
      setTarget(null); setXp("0"); setCoins("0"); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-loyalty-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustCredit = useMutation({
    mutationFn: async () => {
      if (!creditTarget) return;
      const { error } = await supabase.rpc("admin_adjust_store_credit", {
        _user_id: creditTarget.id,
        _amount: Number(credit) || 0,
        _reason: creditReason.trim() || "تعديل رصيد من الإدارة",
        _order_id: undefined as unknown as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تعديل رصيد المتجر");
      setCreditTarget(null); setCredit("0"); setCreditReason("");
      qc.invalidateQueries({ queryKey: ["admin-loyalty-users"] });
      qc.invalidateQueries({ queryKey: ["admin-store-credit-tx"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const rows = rowsQ.data ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => `${r.full_name ?? ""} ${r.username ?? ""} ${r.email ?? ""}`.toLowerCase().includes(s));
  }, [rowsQ.data, q]);


  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث عن عميل…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">العميل</th>
              <th className="p-2 font-medium">المستوى</th>
              <th className="p-2 font-medium">XP</th>
              <th className="p-2 font-medium">GX Coins</th>
              <th className="p-2 font-medium">رصيد المتجر</th>
              <th className="p-2 font-medium">الطلبات</th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="p-2">
                  <div className="font-medium truncate">{r.full_name || r.username || "—"}</div>
                  <div className="text-[11px] text-muted-foreground" dir="ltr">@{r.username}</div>
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{r.level_code}</Badge></td>
                <td className="p-2 font-bold">{Number(r.xp).toLocaleString("en-US")}</td>
                <td className="p-2 text-amber-300 font-bold">{Number(r.gx_coins).toLocaleString("en-US")}</td>
                <td className="p-2 text-sky-300 font-bold">{Number(r.store_credit_jod ?? 0).toFixed(2)} د.أ</td>
                <td className="p-2">{r.orders_count}</td>
                <td className="p-2 text-left whitespace-nowrap space-x-1 space-x-reverse">
                  <Button size="sm" variant="outline"
                    onClick={() => setTarget({ id: r.id, name: r.full_name || r.username || r.email || "" })}>
                    XP / Coins
                  </Button>
                  <Button size="sm" variant="outline" className="border-sky-500/40 text-sky-300"
                    onClick={() => setCreditTarget({ id: r.id, name: r.full_name || r.username || r.email || "", balance: Number(r.store_credit_jod ?? 0) })}>
                    رصيد / استرجاع
                  </Button>
                </td>
              </tr>
            ))}
            {!rowsQ.isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">لا نتائج</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل ولاء العميل</DialogTitle>
            <DialogDescription>{target?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="XP (يمكن أن يكون سالباً)"><Input type="number" value={xp} onChange={(e) => setXp(e.target.value)} /></Field>
            <Field label="GX Coins (يمكن أن يكون سالباً)"><Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} /></Field>
            <Field label="السبب"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تعويض عن تأخير" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>إلغاء</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-black" disabled={adjust.isPending} onClick={() => adjust.mutate()}>
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creditTarget} onOpenChange={(o) => !o && setCreditTarget(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>رصيد المتجر / الاسترجاع</DialogTitle>
            <DialogDescription>
              {creditTarget?.name} — الرصيد الحالي: {(creditTarget?.balance ?? 0).toFixed(2)} د.أ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="المبلغ بالدينار (موجب = إضافة، سالب = خصم)">
              <Input type="number" step="0.01" value={credit} onChange={(e) => setCredit(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              {[1, 5, 10].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" onClick={() => setCredit(String(v))}>+{v}</Button>
              ))}
            </div>
            <Field label="السبب">
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="مثال: استرجاع طلب ملغى" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTarget(null)}>إلغاء</Button>
            <Button className="bg-sky-500 hover:bg-sky-400 text-black" disabled={adjustCredit.isPending} onClick={() => adjustCredit.mutate()}>
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreditTab() {
  const listQ = useQuery({
    queryKey: ["admin-store-credit-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_credit_transactions")
        .select("id, user_id, amount_jod, balance_after, kind, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">حركات رصيد المتجر (الاسترجاعات)</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">المبلغ</th>
              <th className="p-2 font-medium">النوع</th>
              <th className="p-2 font-medium">الرصيد بعدها</th>
              <th className="p-2 font-medium">السبب</th>
              <th className="p-2 font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data ?? []).map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className={"p-2 font-bold " + (Number(t.amount_jod) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {Number(t.amount_jod) >= 0 ? "+" : ""}{Number(t.amount_jod).toFixed(2)} د.أ
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{t.kind}</Badge></td>
                <td className="p-2">{t.balance_after === null ? "—" : Number(t.balance_after).toFixed(2)}</td>
                <td className="p-2 text-muted-foreground">{t.reason || "—"}</td>
                <td className="p-2 text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ar-JO")}</td>
              </tr>
            ))}
            {!listQ.isLoading && (listQ.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">لا حركات بعد</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}


function CouponsTab() {
  const listQ = useQuery({
    queryKey: ["admin-user-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_coupons")
        .select("id, code, percent, max_discount_jod, level_code, used_at, expires_at, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">كوبونات المستويات الصادرة</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">الكود</th>
              <th className="p-2 font-medium">الخصم</th>
              <th className="p-2 font-medium">المستوى</th>
              <th className="p-2 font-medium">الحالة</th>
              <th className="p-2 font-medium">الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {(listQ.data ?? []).map((c) => {
              const used = !!c.used_at;
              const expired = new Date(c.expires_at).getTime() < Date.now();
              return (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="p-2 font-mono text-cyan-300" dir="ltr">{c.code}</td>
                  <td className="p-2">{c.percent}%{c.max_discount_jod ? ` (حتى ${c.max_discount_jod} د.أ)` : ""}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{c.level_code}</Badge></td>
                  <td className="p-2">
                    {used ? <span className="text-muted-foreground">مستخدم</span>
                      : expired ? <span className="text-rose-300">منتهي</span>
                      : <span className="text-emerald-300">فعّال</span>}
                  </td>
                  <td className="p-2 text-[11px] text-muted-foreground">{new Date(c.expires_at).toLocaleDateString("ar-JO")}</td>
                </tr>
              );
            })}
            {!listQ.isLoading && (listQ.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">لا يوجد كوبونات صادرة بعد</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
