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
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Coins, Search, Trophy, Save, Ticket, Wallet, Users, TrendingUp, History, RotateCcw } from "lucide-react";

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

type ProfileRow = {
  id: string; full_name: string | null; username: string | null; email: string | null;
  avatar_url: string | null; xp: number; gx_coins: number; level_code: string;
  orders_count: number; total_spent: number; store_credit_jod: number | null;
};

function norm(s: string) {
  return (s || "").toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0640]/g, "").trim();
}

function useProfiles() {
  return useQuery({
    queryKey: ["admin-loyalty-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, avatar_url, xp, gx_coins, level_code, orders_count, total_spent, store_credit_jod")
        .order("xp", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });
}

function labelOf(p?: ProfileRow) {
  if (!p) return "—";
  return p.full_name || p.username || p.email || "—";
}

function LoyaltyAdmin() {
  const profilesQ = useProfiles();
  const rows = profilesQ.data ?? [];

  const stats = useMemo(() => ({
    members: rows.length,
    xp: rows.reduce((s, r) => s + Number(r.xp || 0), 0),
    coins: rows.reduce((s, r) => s + Number(r.gx_coins || 0), 0),
    credit: rows.reduce((s, r) => s + Number(r.store_credit_jod || 0), 0),
  }), [rows]);

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={15} />} label="أعضاء الولاء" value={stats.members.toLocaleString("en-US")} tone="text-cyan-300" />
        <StatCard icon={<TrendingUp size={15} />} label="إجمالي XP" value={stats.xp.toLocaleString("en-US")} tone="text-emerald-300" />
        <StatCard icon={<Coins size={15} />} label="GX Coins المتداولة" value={stats.coins.toLocaleString("en-US")} tone="text-amber-300" />
        <StatCard icon={<Wallet size={15} />} label="رصيد المتجر" value={`${stats.credit.toFixed(2)} د.أ`} tone="text-sky-300" />
      </div>

      <Tabs defaultValue="levels" dir="rtl">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl h-11">
          <TabsTrigger value="levels" className="gap-2"><Trophy className="w-4 h-4" />المستويات</TabsTrigger>
          <TabsTrigger value="customers" className="gap-2"><Coins className="w-4 h-4" />العملاء</TabsTrigger>
          <TabsTrigger value="credit" className="gap-2"><Wallet className="w-4 h-4" />الرصيد</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2"><Ticket className="w-4 h-4" />الكوبونات</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2"><History className="w-4 h-4" />الحركات</TabsTrigger>
        </TabsList>
        <TabsContent value="levels" className="mt-4"><LevelsTab profiles={rows} /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomersTab profiles={rows} loading={profilesQ.isLoading} /></TabsContent>
        <TabsContent value="credit" className="mt-4"><CreditTab profiles={rows} /></TabsContent>
        <TabsContent value="coupons" className="mt-4"><CouponsTab profiles={rows} /></TabsContent>
        <TabsContent value="ledger" className="mt-4"><LedgerTab profiles={rows} /></TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${tone}`}>{icon}{label}</div>
        <div className="text-xl font-extrabold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function LevelsTab({ profiles }: { profiles: ProfileRow[] }) {
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

  const membersByLevel = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of profiles) m[p.level_code] = (m[p.level_code] ?? 0) + 1;
    return m;
  }, [profiles]);

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
      return l.id;
    },
    onSuccess: (id) => {
      toast.success("تم حفظ المستوى");
      setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
      qc.invalidateQueries({ queryKey: ["admin-levels"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (id: string, patch: Partial<LevelRow>) =>
    setDraft((d) => ({ ...d, [id]: { ...(d[id] ?? {}), ...patch } }));

  if (levelsQ.isLoading) {
    return <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        كل دينار مدفوع = 100 XP · 1000 عملة = 1 دينار · بونص العملات يُحسب حسب مستوى العميل وقت الطلب.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {(levelsQ.data ?? []).map((l) => {
          const v = { ...l, ...(draft[l.id] ?? {}) };
          const dirty = !!draft[l.id];
          return (
            <Card key={l.id} className={"overflow-hidden transition " + (dirty ? "ring-1 ring-amber-400/50" : "")}>
              <div className="h-1.5" style={{ background: l.gradient }} />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{l.icon}</span>
                  <span style={{ color: l.color }}>{v.name_ar}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{l.code}</Badge>
                  <Badge variant="outline" className="text-[10px] gap-1"><Users size={9} />{membersByLevel[l.code] ?? 0}</Badge>
                  {dirty && <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">تغييرات غير محفوظة</Badge>}
                  <div className="ms-auto flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{v.is_active ? "مفعّل" : "معطّل"}</span>
                    <Switch checked={!!v.is_active} onCheckedChange={(c) => set(l.id, { is_active: c })} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2.5">
                <Field label="الاسم (عربي)"><Input value={v.name_ar} onChange={(e) => set(l.id, { name_ar: e.target.value })} /></Field>
                <Field label="الاسم (إنجليزي)"><Input value={v.name_en} onChange={(e) => set(l.id, { name_en: e.target.value })} /></Field>
                <Field label={`أقل XP (≈ ${(Number(v.min_xp) / 100).toFixed(0)} د.أ إنفاق)`}>
                  <Input type="number" value={v.min_xp} onChange={(e) => set(l.id, { min_xp: Number(e.target.value) })} />
                </Field>
                <Field label="عملات الهدية"><Input type="number" value={v.reward_coins} onChange={(e) => set(l.id, { reward_coins: Number(e.target.value) })} /></Field>
                <Field label="نسبة الكوبون %"><Input type="number" value={v.coupon_percent} onChange={(e) => set(l.id, { coupon_percent: Number(e.target.value) })} /></Field>
                <Field label="حد الكوبون (د.أ)">
                  <Input type="number" value={v.coupon_max_discount_jod ?? ""}
                    onChange={(e) => set(l.id, { coupon_max_discount_jod: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="صلاحية الكوبون (يوم)"><Input type="number" value={v.coupon_valid_days} onChange={(e) => set(l.id, { coupon_valid_days: Number(e.target.value) })} /></Field>
                <Field label="بونص العملات %"><Input type="number" value={v.coins_bonus_pct} onChange={(e) => set(l.id, { coins_bonus_pct: Number(e.target.value) })} /></Field>
                <div className="col-span-2 flex justify-end gap-2">
                  {dirty && (
                    <Button size="sm" variant="outline"
                      onClick={() => setDraft((d) => { const n = { ...d }; delete n[l.id]; return n; })}>
                      <RotateCcw size={13} className="ml-1" /> تراجع
                    </Button>
                  )}
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black" disabled={save.isPending || !dirty}
                    onClick={() => save.mutate(l)}>
                    <Save size={14} className="ml-1" /> حفظ
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CustomersTab({ profiles, loading }: { profiles: ProfileRow[]; loading: boolean }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sort, setSort] = useState<"xp" | "coins" | "credit" | "orders">("xp");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [xp, setXp] = useState("0");
  const [coins, setCoins] = useState("0");
  const [reason, setReason] = useState("");
  const [creditTarget, setCreditTarget] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [credit, setCredit] = useState("0");
  const [creditReason, setCreditReason] = useState("");

  const levelCodes = useMemo(() => Array.from(new Set(profiles.map((p) => p.level_code).filter(Boolean))), [profiles]);

  const adjust = useMutation({
    mutationFn: async () => {
      if (!target) return;
      if (!reason.trim()) throw new Error("السبب مطلوب");
      const { error } = await supabase.rpc("admin_adjust_loyalty", {
        _user_id: target.id,
        _xp: Number(xp) || 0,
        _coins: Number(coins) || 0,
        _reason: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التعديل");
      setTarget(null); setXp("0"); setCoins("0"); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-loyalty-users"] });
      qc.invalidateQueries({ queryKey: ["admin-coin-tx"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustCredit = useMutation({
    mutationFn: async () => {
      if (!creditTarget) return;
      if (!creditReason.trim()) throw new Error("السبب مطلوب");
      const { error } = await supabase.rpc("admin_adjust_store_credit", {
        _user_id: creditTarget.id,
        _amount: Number(credit) || 0,
        _reason: creditReason.trim(),
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
    const s = norm(q);
    let rows = profiles.filter((r) => {
      if (levelFilter !== "all" && r.level_code !== levelFilter) return false;
      if (!s) return true;
      return norm(`${r.full_name ?? ""} ${r.username ?? ""} ${r.email ?? ""}`).includes(s);
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "coins") return Number(b.gx_coins) - Number(a.gx_coins);
      if (sort === "credit") return Number(b.store_credit_jod ?? 0) - Number(a.store_credit_jod ?? 0);
      if (sort === "orders") return Number(b.orders_count) - Number(a.orders_count);
      return Number(b.xp) - Number(a.xp);
    });
    return rows;
  }, [profiles, q, levelFilter, sort]);

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث عن عميل بالاسم أو الإيميل أو المعرّف…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={levelFilter === "all"} onClick={() => setLevelFilter("all")}>كل المستويات</Chip>
          {levelCodes.map((c) => (
            <Chip key={c} active={levelFilter === c} onClick={() => setLevelFilter(c)}>{c}</Chip>
          ))}
          <span className="mx-2 text-[11px] text-muted-foreground">ترتيب:</span>
          {([["xp", "XP"], ["coins", "العملات"], ["credit", "الرصيد"], ["orders", "الطلبات"]] as const).map(([k, l]) => (
            <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>
          ))}
          <span className="ms-auto text-[11px] text-muted-foreground">{filtered.length} عميل</span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">#</th>
              <th className="p-2 font-medium">العميل</th>
              <th className="p-2 font-medium">المستوى</th>
              <th className="p-2 font-medium">XP</th>
              <th className="p-2 font-medium">GX Coins</th>
              <th className="p-2 font-medium">رصيد المتجر</th>
              <th className="p-2 font-medium">الطلبات</th>
              <th className="p-2 font-medium">الإنفاق</th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={9} className="p-2"><div className="h-9 rounded-lg bg-white/5 animate-pulse" /></td></tr>
            ))}
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="p-2 text-[11px] text-muted-foreground">{i + 1}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {r.avatar_url
                      ? <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                      : <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{labelOf(r)}</div>
                      <div className="text-[11px] text-muted-foreground" dir="ltr">@{r.username}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{r.level_code}</Badge></td>
                <td className="p-2 font-bold">{Number(r.xp).toLocaleString("en-US")}</td>
                <td className="p-2 text-amber-300 font-bold">{Number(r.gx_coins).toLocaleString("en-US")}</td>
                <td className="p-2 text-sky-300 font-bold">{Number(r.store_credit_jod ?? 0).toFixed(2)} د.أ</td>
                <td className="p-2">{r.orders_count}</td>
                <td className="p-2 text-emerald-300">{Number(r.total_spent ?? 0).toFixed(2)} د.أ</td>
                <td className="p-2 text-left whitespace-nowrap space-x-1 space-x-reverse">
                  <Button size="sm" variant="outline" onClick={() => setTarget({ id: r.id, name: labelOf(r) })}>
                    XP / Coins
                  </Button>
                  <Button size="sm" variant="outline" className="border-sky-500/40 text-sky-300"
                    onClick={() => setCreditTarget({ id: r.id, name: labelOf(r), balance: Number(r.store_credit_jod ?? 0) })}>
                    رصيد / استرجاع
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center p-8 text-muted-foreground">لا نتائج</td></tr>
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
            <div className="flex gap-1.5 flex-wrap">
              {[100, 500, 1000, -100].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" onClick={() => setXp(String(v))}>{v > 0 ? `+${v}` : v} XP</Button>
              ))}
            </div>
            <Field label="GX Coins (يمكن أن يكون سالباً)"><Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} /></Field>
            <div className="flex gap-1.5 flex-wrap">
              {[100, 500, 1000, -100].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" onClick={() => setCoins(String(v))}>{v > 0 ? `+${v}` : v}</Button>
              ))}
            </div>
            <Field label="السبب (إلزامي)"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تعويض عن تأخير" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>إلغاء</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-black" disabled={adjust.isPending || !reason.trim()} onClick={() => adjust.mutate()}>
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
            <div className="flex gap-2 flex-wrap">
              {[1, 5, 10, 20].map((v) => (
                <Button key={v} type="button" size="sm" variant="outline" onClick={() => setCredit(String(v))}>+{v}</Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1, 5, 10, 20].map((v) => (
                <Button key={`m${v}`} type="button" size="sm" variant="outline"
                  className="text-rose-300 border-rose-500/40"
                  disabled={(creditTarget?.balance ?? 0) <= 0}
                  onClick={() => setCredit(String(-Math.min(v, creditTarget?.balance ?? 0)))}>−{v}</Button>
              ))}
              <Button type="button" size="sm" variant="outline" className="text-rose-300 border-rose-500/40"
                disabled={(creditTarget?.balance ?? 0) <= 0}
                onClick={() => setCredit(String(-(creditTarget?.balance ?? 0)))}>سحب كامل الرصيد</Button>
            </div>

            <Field label="السبب (إلزامي)">
              <Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="مثال: استرجاع طلب ملغى" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTarget(null)}>إلغاء</Button>
            <Button className="bg-sky-500 hover:bg-sky-400 text-black" disabled={adjustCredit.isPending || !creditReason.trim()} onClick={() => adjustCredit.mutate()}>
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreditTab({ profiles }: { profiles: ProfileRow[] }) {
  const [kind, setKind] = useState<"all" | "refund" | "spend">("all");
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const listQ = useQuery({
    queryKey: ["admin-store-credit-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_credit_transactions")
        .select("id, user_id, amount_jod, balance_after, kind, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => (listQ.data ?? []).filter((t) => kind === "all" || t.kind === kind), [listQ.data, kind]);
  const totals = useMemo(() => ({
    refunded: rows.filter((t) => Number(t.amount_jod) > 0).reduce((s, t) => s + Number(t.amount_jod), 0),
    spent: rows.filter((t) => Number(t.amount_jod) < 0).reduce((s, t) => s + Math.abs(Number(t.amount_jod)), 0),
  }), [rows]);

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base">حركات رصيد المتجر (الاسترجاعات)</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={kind === "all"} onClick={() => setKind("all")}>الكل</Chip>
          <Chip active={kind === "refund"} onClick={() => setKind("refund")}>إضافة / استرجاع</Chip>
          <Chip active={kind === "spend"} onClick={() => setKind("spend")}>استخدام</Chip>
          <span className="ms-auto text-[11px] text-muted-foreground">
            مضاف: <b className="text-emerald-300">{totals.refunded.toFixed(2)}</b> د.أ · مستخدم: <b className="text-rose-300">{totals.spent.toFixed(2)}</b> د.أ
          </span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">العميل</th>
              <th className="p-2 font-medium">المبلغ</th>
              <th className="p-2 font-medium">النوع</th>
              <th className="p-2 font-medium">الرصيد بعدها</th>
              <th className="p-2 font-medium">السبب</th>
              <th className="p-2 font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="p-2">{labelOf(byId.get(t.user_id))}</td>
                <td className={"p-2 font-bold " + (Number(t.amount_jod) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {Number(t.amount_jod) >= 0 ? "+" : ""}{Number(t.amount_jod).toFixed(2)} د.أ
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{t.kind}</Badge></td>
                <td className="p-2">{t.balance_after === null ? "—" : Number(t.balance_after).toFixed(2)}</td>
                <td className="p-2 text-muted-foreground">{t.reason || "—"}</td>
                <td className="p-2 text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ar-JO")}</td>
              </tr>
            ))}
            {!listQ.isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">لا حركات بعد</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CouponsTab({ profiles }: { profiles: ProfileRow[] }) {
  const [status, setStatus] = useState<"all" | "active" | "used" | "expired">("all");
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const listQ = useQuery({
    queryKey: ["admin-user-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_coupons")
        .select("id, code, percent, max_discount_jod, level_code, used_at, expires_at, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const s = norm(q);
    return (listQ.data ?? []).filter((c) => {
      const used = !!c.used_at;
      const expired = new Date(c.expires_at).getTime() < Date.now();
      if (status === "used" && !used) return false;
      if (status === "expired" && (used || !expired)) return false;
      if (status === "active" && (used || expired)) return false;
      if (!s) return true;
      return norm(c.code).includes(s) || norm(labelOf(byId.get(c.user_id))).includes(s);
    });
  }, [listQ.data, status, q, byId]);

  const counts = useMemo(() => {
    const all = listQ.data ?? [];
    const used = all.filter((c) => c.used_at).length;
    const expired = all.filter((c) => !c.used_at && new Date(c.expires_at).getTime() < Date.now()).length;
    return { total: all.length, used, expired, active: all.length - used - expired };
  }, [listQ.data]);

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base">كوبونات المستويات الصادرة</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={status === "all"} onClick={() => setStatus("all")}>الكل ({counts.total})</Chip>
          <Chip active={status === "active"} onClick={() => setStatus("active")}>فعّالة ({counts.active})</Chip>
          <Chip active={status === "used"} onClick={() => setStatus("used")}>مستخدمة ({counts.used})</Chip>
          <Chip active={status === "expired"} onClick={() => setStatus("expired")}>منتهية ({counts.expired})</Chip>
          <div className="relative ms-auto min-w-[180px]">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-8 h-9" placeholder="كود أو عميل…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">الكود</th>
              <th className="p-2 font-medium">العميل</th>
              <th className="p-2 font-medium">الخصم</th>
              <th className="p-2 font-medium">المستوى</th>
              <th className="p-2 font-medium">الحالة</th>
              <th className="p-2 font-medium">الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const used = !!c.used_at;
              const expired = new Date(c.expires_at).getTime() < Date.now();
              return (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="p-2 font-mono text-cyan-300 cursor-pointer" dir="ltr"
                    onClick={() => { navigator.clipboard?.writeText(c.code); toast.success("تم نسخ الكود"); }}>
                    {c.code}
                  </td>
                  <td className="p-2">{labelOf(byId.get(c.user_id))}</td>
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
            {!listQ.isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">لا يوجد كوبونات مطابقة</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function LedgerTab({ profiles }: { profiles: ProfileRow[] }) {
  const [type, setType] = useState<"coins" | "xp">("coins");
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const coinsQ = useQuery({
    queryKey: ["admin-coin-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gx_coin_transactions")
        .select("id, user_id, amount, balance_after, kind, source, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
    enabled: type === "coins",
  });

  const xpQ = useQuery({
    queryKey: ["admin-xp-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xp_transactions")
        .select("id, user_id, amount, balance_after, source, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
    enabled: type === "xp",
  });

  const rows = (type === "coins" ? coinsQ.data : xpQ.data) ?? [];
  const loading = type === "coins" ? coinsQ.isLoading : xpQ.isLoading;

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base">سجل الحركات</CardTitle>
        <div className="flex items-center gap-1.5">
          <Chip active={type === "coins"} onClick={() => setType("coins")}>GX Coins</Chip>
          <Chip active={type === "xp"} onClick={() => setType("xp")}>XP</Chip>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-2 font-medium">العميل</th>
              <th className="p-2 font-medium">القيمة</th>
              <th className="p-2 font-medium">الرصيد بعدها</th>
              <th className="p-2 font-medium">المصدر</th>
              <th className="p-2 font-medium">السبب</th>
              <th className="p-2 font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t: Record<string, unknown>) => {
              const amount = Number(t.amount);
              return (
                <tr key={String(t.id)} className="border-b border-white/5">
                  <td className="p-2">{labelOf(byId.get(String(t.user_id)))}</td>
                  <td className={"p-2 font-bold " + (amount >= 0 ? "text-emerald-300" : "text-rose-300")}>
                    {amount >= 0 ? "+" : ""}{amount.toLocaleString("en-US")}
                  </td>
                  <td className="p-2">{t.balance_after === null ? "—" : Number(t.balance_after).toLocaleString("en-US")}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px] font-mono">{String(t.source ?? "")}</Badge></td>
                  <td className="p-2 text-muted-foreground">{String(t.reason ?? "—")}</td>
                  <td className="p-2 text-[11px] text-muted-foreground">{new Date(String(t.created_at)).toLocaleString("ar-JO")}</td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">لا حركات بعد</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition " +
        (active
          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
          : "bg-transparent text-muted-foreground border-white/10 hover:border-cyan-500/30")
      }
    >
      {children}
    </button>
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
