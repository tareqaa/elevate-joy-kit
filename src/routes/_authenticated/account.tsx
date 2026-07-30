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
import { User as UserIcon, Package, ShieldCheck, Copy, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";
import { GxProfile } from "@/components/gx/GxProfile";
import { Pager, usePager } from "@/components/gx/Pager";

type AccountTab = "profile" | "orders" | "security";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — GX Store" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
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
        <TabsList className="grid grid-cols-3 w-full max-w-xl h-11">
          <TabsTrigger value="profile" className="gap-2"><UserIcon className="w-4 h-4" />{t("acc.tab_profile")}</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><Package className="w-4 h-4" />{t("acc.tab_orders")}</TabsTrigger>
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
  const [view, setView] = useState<string>("pending");
  if (loading) return <p className="text-sm text-muted-foreground">{t("acc.loading_orders")}</p>;
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = orders.filter((o) => tab.match(o.status)).length;
    return acc;
  }, {});
  const activeTab = STATUS_TABS.find((tab) => tab.key === view) ?? STATUS_TABS[0];
  const list = orders.filter((o) => activeTab.match(o.status));
  const pager = usePager(list, 5, view);
  const msStart = dir === "rtl" ? "ms-1.5" : "ms-1.5";


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
  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending: { label: t("acc.status_pending"), className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
    paid: { label: t("acc.status_paid"), className: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
    processing: { label: t("acc.status_processing"), className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/40" },
    delivered: { label: t("acc.status_delivered"), className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
    cancelled: { label: t("acc.status_cancelled"), className: "bg-rose-500/15 text-rose-400 border-rose-500/40" },
  };
  const status = STATUS_LABELS[o.status] ?? { label: o.status, className: "bg-muted text-muted-foreground border-border" };
  const items = Array.isArray(o.items) ? (o.items as Array<{ name?: string; qty?: number; price?: number }>) : [];
  const delivery = o.delivery_data && typeof o.delivery_data === "object" ? o.delivery_data as Record<string, unknown> : {};
  const codes = Array.isArray((delivery as { codes?: unknown }).codes)
    ? (delivery as { codes: Array<{ label?: string; value?: string; email?: string; password?: string; kind?: string }> }).codes : [];
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const currencyLabel = lang === "ar" ? "د.أ" : "JOD";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="font-mono text-sm font-semibold">{o.order_number}</div>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString(locale)}</div>
          </div>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between">
              <span>{it.name} × {it.qty}</span>
              <span>{((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} {currencyLabel}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between font-bold border-t pt-2">
          <span>{t("acc.total_label")}</span>
          <span>{Number(o.total_jod).toFixed(2)} {currencyLabel}</span>
        </div>
        {o.status === "delivered" && codes.length > 0 && (
          <div className="mt-3 bg-muted/40 rounded-lg p-3 space-y-3 border">
            <div className="text-sm font-semibold">{t("acc.your_codes")}</div>
            {codes.map((c, i) => <DeliveryBlock key={i} data={c} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryBlock({ data }: { data: { label?: string; value?: string; email?: string; password?: string; kind?: string } }) {
  const isAccount = data.kind === "account" || (!!data.email && !data.value);
  return (
    <div className="rounded-md border bg-background/40 p-2.5 space-y-2">
      {data.label && <div className="text-xs font-semibold text-primary">{data.label}</div>}
      {isAccount ? (
        <>
          {data.email && <CodeBox label="acc.your_email_label" value={data.email} />}
          {data.password && <CodeBox label="acc.your_password_label" value={data.password} />}
        </>
      ) : (
        data.value && <CodeBox label="acc.your_code_label" value={data.value} />
      )}
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
  );
}
