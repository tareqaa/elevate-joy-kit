import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { User as UserIcon, Package, ShieldCheck, Copy, Check, Disc3, ChevronDown, Eye, EyeOff, AlertTriangle, Globe, KeyRound, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { GxProfile } from "@/components/gx/GxProfile";
import { SpinWheel } from "@/components/gx/SpinWheel";
import { Pager, usePager } from "@/components/gx/Pager";

type AccountTab = "profile" | "orders" | "wheel" | "security";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — GX Store" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: AccountTab } => ({
    tab: (typeof s.tab === "string" ? s.tab : "profile") as AccountTab,
  }),
  component: AccountPage,
});


type CachedProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  email: string | null;
  created_at: string;
  updated_at: string;
  total_spent: number;
  whatsapp: string | null;
};

function readProfileCache(userId: string): CachedProfile | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`gx:profile:${userId}`) || localStorage.getItem("gx_profile_cache");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<CachedProfile>;
    if (!parsed || typeof parsed !== "object") return undefined;
    if (parsed.id && parsed.id !== userId) return undefined;
    return {
      id: userId,
      username: parsed.username ?? null,
      full_name: parsed.full_name ?? null,
      avatar_url: parsed.avatar_url ?? null,
      level: Number(parsed.level) || 1,
      xp: Number(parsed.xp) || 0,
      email: parsed.email ?? null,
      created_at: parsed.created_at ?? new Date().toISOString(),
      updated_at: parsed.updated_at ?? new Date().toISOString(),
      total_spent: Number(parsed.total_spent) || 0,
      whatsapp: parsed.whatsapp ?? null,
    };
  } catch { /* noop */ }
  return undefined;
}

function cacheProfile(profile: CachedProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`gx:profile:${profile.id}`, JSON.stringify(profile));
    localStorage.setItem("gx_profile_cache", JSON.stringify(profile));
  } catch { /* noop */ }
}



function AccountPage() {
  const { user } = Route.useRouteContext();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { t, lang, dir } = useLang();

  const profileQ = useQuery({
    queryKey: ["my-profile", user.id],
    initialData: () => readProfileCache(user.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      if (data) cacheProfile(data);
      return data;
    },
  });

  const ordersQ = useQuery({
    queryKey: ["my-orders", user.id],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Live updates when an admin changes an order status
  useEffect(() => {
    const channel = supabase
      .channel(`my-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["my-orders", user.id] });
          qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, qc]);


  const username = profileQ.data?.username || user.user_metadata?.username || user.email?.split("@")[0] || "gx";
  const displayName = username;
  const heroAvatar = profileQ.data?.avatar_url || "";
  const heroInitials = (displayName || user.email || "GX").trim().slice(0, 2).toUpperCase();
  const locale = lang === "ar" ? "ar-EG" : "en-US";

  void dir;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 relative">
        <div
          className="h-28"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(0,229,255,0.35), transparent 60%), radial-gradient(circle at 80% 40%, rgba(124,58,237,0.35), transparent 55%), linear-gradient(135deg,#0b0e17,#12151f)",
          }}
        />
        <CardContent className="pt-0 -mt-14 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative shrink-0">
              {heroAvatar ? (
                <img
                  src={heroAvatar}
                  alt="avatar"
                  className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl bg-card object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-background bg-card text-xl font-black text-primary shadow-xl">
                  {heroInitials}
                </div>
              )}
              <span className="absolute -bottom-1 -end-1 min-w-7 h-7 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-black leading-7 text-center border-4 border-background">
                {Math.max(1, Number(profileQ.data?.level) || 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate" dir="ltr">@{username}</h1>
              <p className="text-xs text-muted-foreground truncate" dir="ltr">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-xs self-start sm:self-end whitespace-nowrap">
              {t("acc.member_since")} {new Date(profileQ.data?.created_at || Date.now()).toLocaleDateString(locale, { year: "numeric", month: "long" })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs
        dir={dir}
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as AccountTab } })}
      >
        <TabsList className="grid grid-cols-4 w-full max-w-xl h-11">
          <TabsTrigger value="profile" className="gap-2"><UserIcon className="w-4 h-4" />{t("acc.tab_profile")}</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><Package className="w-4 h-4" />{t("acc.tab_orders")}</TabsTrigger>
          <TabsTrigger value="wheel" className="gap-2"><Disc3 className="w-4 h-4" />{lang === "ar" ? "العجلة" : "Wheel"}</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="w-4 h-4" />{t("acc.tab_security")}</TabsTrigger>
        </TabsList>


        <TabsContent value="profile" className="mt-4">
          <div className="gx-account-profile -mx-4 sm:-mx-6">
            <GxProfile />
          </div>
        </TabsContent>


        <TabsContent value="orders" className="mt-4">
          <OrdersTab loading={ordersQ.isLoading} orders={ordersQ.data ?? []} />
        </TabsContent>

        <TabsContent value="wheel" className="mt-4">
          <SpinWheel />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <SecurityTab email={user.email || ""} />
        </TabsContent>

      </Tabs>

    </div>
  );
}

type OrderRow = {
  id: string; order_number: string; status: string; created_at: string; total_jod: number;
  items: unknown; delivery_data: unknown;
  codes_revealed_at?: string | null; codes_reveal_count?: number | null;
};

function OrdersTab({ loading, orders }: { loading: boolean; orders: OrderRow[] }) {
  const { t, dir, lang } = useLang();
  const STATUS_TABS: Array<{ key: string; label: string; match: (s: string) => boolean }> = [
    { key: "pending", label: t("acc.status_pending"), match: (s) => s === "pending" },
    { key: "paid", label: t("acc.status_paid"), match: (s) => s === "paid" },
    { key: "processing", label: t("acc.status_processing"), match: (s) => s === "processing" },
    { key: "delivered", label: t("acc.status_delivered"), match: (s) => s === "delivered" },
    { key: "cancelled", label: t("acc.status_cancelled"), match: (s) => s === "cancelled" },
  ];
  const [picked, setPicked] = useState<string | null>(null);
  // Follow the newest order's status until the user picks a tab manually,
  // so an order confirmed as "paid" by the admin shows up right away.
  const latestStatus = orders[0]?.status;
  const autoView = STATUS_TABS.some((tb) => tb.key === latestStatus) ? (latestStatus as string) : "pending";
  const view = picked ?? autoView;
  const setView = (v: string) => setPicked(v);
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = orders.filter((o) => tab.match(o.status)).length;
    return acc;
  }, {});
  const activeTab = STATUS_TABS.find((tab) => tab.key === view) ?? STATUS_TABS[0];
  const list = orders.filter((o) => activeTab.match(o.status));
  const pager = usePager(list, 5, view);
  const msStart = dir === "rtl" ? "ms-1.5" : "ms-1.5";
  if (loading) return <p className="text-sm text-muted-foreground">{t("acc.loading_orders")}</p>;


  return (
    <div className="space-y-4" dir={dir}>
      <div className="border-b border-white/10 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STATUS_TABS.map((tab) => {
            const on = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={`relative px-4 py-2.5 text-sm whitespace-nowrap transition ${
                  on ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={`${msStart} text-[10px] px-1.5 py-0.5 rounded-full ${on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {counts[tab.key]}
                  </span>
                )}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
      {list.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          {t("acc.no_orders_here")} <Link to="/" className="text-primary underline">{t("acc.shop_now")}</Link>
        </CardContent></Card>
      ) : (
        <>
          {pager.slice.map((o) => <OrderCard key={o.id} order={o} />)}
          <Pager page={pager.page} pageCount={pager.pageCount} total={pager.total} size={pager.size}
            onPage={pager.setPage} onSize={pager.setSize} sizes={[5, 10, 20]} lang={lang === "ar" ? "ar" : "en"} />
        </>
      )}
    </div>
  );
}


function OrderCard({ order: o }: { order: OrderRow }) {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const STATUS_STYLE: Record<string, { label: string; pill: string; bar: string }> = {
    pending: { label: t("acc.status_pending"), pill: "bg-amber-500/15 text-amber-400 border-amber-500/40", bar: "from-amber-500/70" },
    paid: { label: t("acc.status_paid"), pill: "bg-sky-500/15 text-sky-400 border-sky-500/40", bar: "from-sky-500/70" },
    processing: { label: t("acc.status_processing"), pill: "bg-indigo-500/15 text-indigo-400 border-indigo-500/40", bar: "from-indigo-500/70" },
    delivered: { label: t("acc.status_delivered"), pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", bar: "from-emerald-500/70" },
    cancelled: { label: t("acc.status_cancelled"), pill: "bg-rose-500/15 text-rose-400 border-rose-500/40", bar: "from-rose-500/70" },
  };
  const status = STATUS_STYLE[o.status] ?? { label: o.status, pill: "bg-muted text-muted-foreground border-border", bar: "from-muted" };
  const items = Array.isArray(o.items) ? (o.items as Array<{ name?: string; qty?: number; price?: number }>) : [];
  const delivery = o.delivery_data && typeof o.delivery_data === "object" ? o.delivery_data as Record<string, unknown> : {};
  const codes = Array.isArray((delivery as { codes?: unknown }).codes)
    ? (delivery as { codes: Array<{ label?: string; value?: string; email?: string; password?: string; kind?: string; region?: string }> }).codes : [];
  const locale = ar ? "ar-EG" : "en-US";
  const currencyLabel = ar ? "د.أ" : "JOD";
  const itemsCount = items.reduce((n, it) => n + (it.qty ?? 1), 0);

  type CodeData = { label?: string; value?: string; email?: string; password?: string; kind?: string; region?: string };
  const showCodes = o.status === "delivered" && codes.length > 0;
  const hasCodes = showCodes;
  // Attach each delivery code to the product it belongs to (label match first,
  // then sequential distribution by quantity).
  const { groups, extraCodes } = (() => {
    const pool: CodeData[] = showCodes ? [...codes] : [];
    const result = items.map((item) => {
      const qty = Math.max(1, item.qty ?? 1);
      const mine: CodeData[] = [];
      const name = (item.name || "").trim().toLowerCase();
      if (name) {
        for (let i = pool.length - 1; i >= 0 && mine.length < qty; i--) {
          const lbl = (pool[i].label || "").trim().toLowerCase();
          if (lbl && lbl.includes(name)) mine.unshift(...pool.splice(i, 1));
        }
      }
      while (mine.length < qty && pool.length > 0) mine.push(pool.shift()!);
      return { item, codes: mine };
    });
    return { groups: result, extraCodes: pool };
  })();


  async function reveal() {
    setRevealing(true);
    const { error } = await supabase.rpc("reveal_order_codes", { _order_id: o.id });
    setRevealing(false);
    if (error) { toast.error(error.message); return; }
  }

  return (
    <Card className="overflow-hidden border-white/10 bg-card/60 backdrop-blur transition hover:border-primary/30">
      <div className={`h-1 w-full bg-gradient-to-l ${status.bar} to-transparent`} />
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono text-sm font-bold tracking-wide" dir="ltr">{o.order_number}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString(locale)}</div>
              </div>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.pill}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-muted/20 px-3 py-2.5">
          <div className="min-w-0 text-xs text-muted-foreground">
            {ar ? `${itemsCount} منتج` : `${itemsCount} item${itemsCount === 1 ? "" : "s"}`}
          </div>
          <div className="shrink-0 text-base font-extrabold">
            {Number(o.total_jod).toFixed(2)} <span className="text-xs font-bold text-muted-foreground">{currencyLabel}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-muted/40"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            {ar ? "تفاصيل الطلب" : "Order details"}
            {hasCodes && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <ShieldCheck className="h-3 w-3" />
                {ar ? `${codes.length} مفتاح` : `${codes.length} key${codes.length === 1 ? "" : "s"}`}
              </span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-2 space-y-2 text-sm">
            {groups.map((g, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-muted/15">
                <div className="flex justify-between gap-2 px-3 py-2.5">
                  <span className="min-w-0 break-words font-semibold">{g.item.name} × {g.item.qty ?? 1}</span>
                  <span className="shrink-0 font-bold">{((g.item.price ?? 0) * (g.item.qty ?? 1)).toFixed(2)} {currencyLabel}</span>
                </div>
                {g.codes.length > 0 && (
                  <div className="space-y-2 border-t border-primary/15 bg-primary/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {ar ? "بيانات التسليم لهذا المنتج" : "Delivery data for this product"}
                    </div>
                    {g.codes.map((c, k) => (
                      <DeliveryBlock key={k} data={c} index={k} onReveal={reveal} revealing={revealing} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {extraCodes.length > 0 && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("acc.your_codes")}
                </div>
                {extraCodes.map((c, k) => (
                  <DeliveryBlock key={k} data={c} index={k} onReveal={reveal} revealing={revealing} />
                ))}
              </div>
            )}

            {hasCodes && (
              <>
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    {ar
                      ? "بمجرد إظهار أي مفتاح يُعتبر مُستلمًا ولا يمكن استرجاعه أو استبداله. تأكد من المنطقة (Region) ومتطلبات المنتج قبل الإظهار — المتجر غير مسؤول عن تفعيل مفتاح في منطقة خاطئة."
                      : "Once a key is revealed it counts as delivered and cannot be refunded or replaced. Check the region and product requirements before revealing — the store is not responsible for keys redeemed in the wrong region."}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {o.codes_revealed_at
                    ? (ar ? `أول فتح: ${new Date(o.codes_revealed_at).toLocaleString(locale)}` : `First opened: ${new Date(o.codes_revealed_at).toLocaleString(locale)}`)
                    : (ar ? "لم يتم فتح أي مفتاح بعد — كل عملية إظهار تُسجَّل لدى المتجر." : "No key opened yet — every reveal is recorded by the store.")}
                </p>
              </>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

function DeliveryBlock({ data, index, onReveal, revealing, revealKey }: {
  data: { label?: string; value?: string; email?: string; password?: string; kind?: string; region?: string };
  index: number;
  onReveal: () => Promise<void> | void;
  revealing?: boolean;
  revealKey: string;
}) {
  const { t, lang } = useLang();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isAccount = data.kind === "account" || (!!data.email && !data.value);
  const region = (data.region || "").trim();

  // Once a key has been revealed it stays visible forever on this device.
  useEffect(() => {
    try {
      if (localStorage.getItem(`gx_revealed:${revealKey}`) === "1") setOpen(true);
    } catch { /* noop */ }
  }, [revealKey]);

  async function confirmReveal() {
    await onReveal();
    try { localStorage.setItem(`gx_revealed:${revealKey}`, "1"); } catch { /* noop */ }
    setConfirming(false);
    setOpen(true);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-background/50">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isAccount ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-cyan-500/15 text-cyan-300"}`}>
          {isAccount ? <UserIcon className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {data.label || (isAccount ? (ar ? "حساب" : "Account") : (ar ? `مفتاح ${index + 1}` : `Key ${index + 1}`))}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/10 bg-muted/30 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {isAccount ? (ar ? "حساب" : "Account") : (ar ? "مفتاح رقمي" : "Digital key")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              <Globe className="h-3 w-3" />
              {region || (ar ? "عالمي / Global" : "Global")}
            </span>
            {open && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <Eye className="h-3 w-3" />
                {ar ? "تم الإظهار" : "Revealed"}
              </span>
            )}
          </div>
        </div>
        {!open && (
          <Button size="sm" className="h-8 shrink-0 gap-1.5"
            disabled={revealing}
            onClick={() => setConfirming(true)}>
            <Eye className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold">{ar ? "إظهار" : "Reveal"}</span>
          </Button>
        )}
      </div>


      {confirming && !open && (
        <div className="space-y-2 border-b border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              {ar
                ? `المنطقة: ${region || "عالمي / Global"} — بعد الإظهار لا يمكن الاسترجاع أو الاستبدال، والمتجر غير مسؤول عن استخدام المفتاح في منطقة غير مناسبة.`
                : `Region: ${region || "Global"} — after revealing, no refund or replacement is possible, and the store is not responsible for redeeming in the wrong region.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 flex-1 text-[11px] font-bold" disabled={revealing} onClick={confirmReveal}>
              {ar ? "أوافق، أظهر المفتاح" : "I agree, reveal"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setConfirming(false)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 p-3">
        {open ? (
          isAccount ? (
            <>
              {data.email && <CodeBox label="acc.your_email_label" value={data.email} />}
              {data.password && <CodeBox label="acc.your_password_label" value={data.password} />}
            </>
          ) : (
            data.value && <CodeBox label="acc.your_code_label" value={data.value} />
          )
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 bg-muted/20 px-3 py-2.5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-sm tracking-[0.25em] text-muted-foreground" dir="ltr">••••-••••-••••</span>
          </div>
        )}
      </div>
      {open && <div className="sr-only">{t("acc.your_codes")}</div>}
    </div>
  );
}

function CodeBox({ label, value }: { label?: string; value?: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(t("acc.copied"));
    setTimeout(() => setCopied(false), 1500);
  }
  const labelText = label && label.startsWith("acc.") ? t(label) : label;
  return (
    <div className="text-sm">
      {labelText && <div className="text-muted-foreground text-xs mb-1">{labelText}</div>}
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono bg-background border rounded p-2 select-all break-all" dir="ltr">{value}</div>
        <Button size="icon" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}



function SecurityTab({ email }: { email: string }) {
  const { t } = useLang();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function change() {
    if (pw.length < 6) { toast.error(t("acc.password_short")); return; }
    if (pw !== pw2) { toast.error(t("acc.password_mismatch")); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPw(""); setPw2("");
    toast.success(t("acc.password_changed"));
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("acc.reset_sent"));
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("acc.change_password")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pw">{t("acc.new_password")}</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">{t("acc.confirm_password")}</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button onClick={change} disabled={saving} className="w-full">
              {saving ? t("acc.saving") : t("acc.update_password")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("acc.forgot_password")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("acc.reset_send_desc")} <span dir="ltr" className="text-foreground">{email}</span>
            </p>
            <Button variant="outline" onClick={sendReset} className="w-full">{t("acc.send_reset")}</Button>
          </CardContent>
        </Card>
      </div>
      <TwoFactorCard />
    </div>
  );
}

type MfaFactor = { id: string; status: string; friendly_name?: string | null };

function TwoFactorCard() {
  const { t } = useLang();
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) setFactors((data?.totp ?? []) as MfaFactor[]);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const active = factors.find((f) => f.status === "verified");

  async function startEnroll() {
    setBusy(true);
    // Clear any half-finished factor so re-enrolling never hits a name clash.
    for (const f of factors.filter((x) => x.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `GX ${Date.now()}`,
    });
    setBusy(false);
    if (error || !data) { toast.error(error?.message || "MFA error"); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  }

  async function verify() {
    if (!enroll) return;
    if (!/^\d{6}$/.test(code.trim())) { toast.error(t("acc.2fa_bad_code")); return; }
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
    if (chErr || !ch) { setBusy(false); toast.error(chErr?.message || "MFA error"); return; }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.id, challengeId: ch.id, code: code.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEnroll(null); setCode("");
    toast.success(t("acc.2fa_on"));
    void refresh();
  }

  async function cancelEnroll() {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null); setCode("");
    void refresh();
  }

  async function disable() {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: active.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("acc.2fa_off"));
    void refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {t("acc.2fa_title")}
          {!loading && (
            <Badge variant="outline" className={active ? "border-emerald-500/40 text-emerald-400" : ""}>
              {active ? t("acc.2fa_enabled") : t("acc.2fa_disabled")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("acc.2fa_desc")}</p>

        {enroll ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm">{t("acc.2fa_scan")}</p>
            <img src={enroll.qr} alt="2FA QR" className="w-44 h-44 rounded-md bg-white p-2" />
            <div className="text-xs text-muted-foreground">
              {t("acc.2fa_secret")}
              <div className="mt-1 font-mono text-foreground select-all break-all" dir="ltr">{enroll.secret}</div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="mfa-code">{t("acc.2fa_code")}</Label>
              <Input
                id="mfa-code" dir="ltr" inputMode="numeric" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={verify} disabled={busy}>{t("acc.2fa_verify")}</Button>
              <Button variant="outline" onClick={cancelEnroll} disabled={busy}>{t("acc.2fa_cancel")}</Button>
            </div>
          </div>
        ) : active ? (
          <Button variant="outline" onClick={disable} disabled={busy}>{t("acc.2fa_disable")}</Button>
        ) : (
          <Button onClick={startEnroll} disabled={busy || loading}>{t("acc.2fa_enable")}</Button>
        )}
      </CardContent>
    </Card>
  );
}
