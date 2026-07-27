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
import { User as UserIcon, Package, ShieldCheck, Copy, Check, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — GX Store" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === "string" ? s.tab : "profile") as "profile" | "orders" | "security",
  }),
  component: AccountPage,
});


// Human gaming avatars (DiceBear adventurer) — varied looks, vibrant neon backgrounds
const AVATAR_SEEDS = [
  "Nova", "Vortex", "Cipher", "Blade", "Reactor", "Havoc",
  "Specter", "Pulse", "Rogue", "Titan", "Onyx", "Vanta",
  "Fury", "Ghost", "Hyper", "Zenith", "Krypton", "Phantom",
  "Raider", "Sonic", "Volt", "Ember", "Frost", "Storm",
];
const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6,ec4899,22d3ee,f59e0b&radius=50&scale=90&skinColor=f2d3b1,ecad80,9e5622`;



function AccountPage() {
  const { user } = Route.useRouteContext();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { t, lang, dir } = useLang();

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

  const username = profileQ.data?.username || user.user_metadata?.username || user.email?.split("@")[0] || "gx";
  const displayName = profileQ.data?.full_name || username;
  const locale = lang === "ar" ? "ar-EG" : "en-US";

  const marginSideStart = dir === "rtl" ? "ms-1" : "me-1";

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
              <img
                src={profileQ.data?.avatar_url || avatarUrl(user.email || "gx")}
                alt="avatar"
                className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl bg-card object-cover"
              />
              <span className="absolute -bottom-1 -end-1 min-w-7 h-7 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-black leading-7 text-center border-4 border-background">
                {Math.max(1, Number(profileQ.data?.level) || 1)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{displayName}</h1>
              <p className="text-sm text-primary font-semibold truncate" dir="ltr">@{username}</p>
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
        onValueChange={(v) => navigate({ search: { tab: v as "profile" | "orders" | "security" } })}
      >
        <TabsList className="grid grid-cols-3 w-full max-w-lg h-11">
          <TabsTrigger value="profile" className="gap-2"><UserIcon className="w-4 h-4" />{t("acc.tab_profile")}</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><Package className="w-4 h-4" />{t("acc.tab_orders")}</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="w-4 h-4" />{t("acc.tab_security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab
            userId={user.id}
            userEmail={user.email || ""}
            currentUsername={username}
            currentName={profileQ.data?.full_name || ""}
            currentAvatar={profileQ.data?.avatar_url || ""}
            currentLevel={profileQ.data?.level || 1}
            currentXp={profileQ.data?.xp || 0}
            onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile", user.id] })}
          />
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

function ProfileTab({ userId, userEmail, currentUsername, currentName, currentAvatar, currentLevel, currentXp, onSaved }: {
  userId: string; userEmail: string; currentUsername: string; currentName: string; currentAvatar: string; currentLevel: number; currentXp: number; onSaved: () => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState(currentName);
  const [uname, setUname] = useState(currentUsername);
  const [avatar, setAvatar] = useState(currentAvatar || avatarUrl(AVATAR_SEEDS[0]));
  const [nameTouched, setNameTouched] = useState(false);
  const [unameTouched, setUnameTouched] = useState(false);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unameCheck, setUnameCheck] = useState<{ status: "idle" | "checking" | "ok" | "taken" | "invalid"; msg?: string }>({ status: "idle" });

  const nameSchema = useMemo(() => z.string().trim().min(2, t("acc.name_short")).max(60, t("acc.name_long")), [t]);
  const usernameSchema = useMemo(
    () => z.string().trim().min(3, t("acc.uname_short")).max(20, t("acc.uname_long"))
      .regex(/^[a-zA-Z0-9_]+$/, t("acc.uname_pattern")),
    [t],
  );

  useEffect(() => { if (!nameTouched) setName(currentName); }, [currentName, nameTouched]);
  useEffect(() => { if (!unameTouched) setUname(currentUsername); }, [currentUsername, unameTouched]);
  useEffect(() => { if (currentAvatar && !avatarTouched) setAvatar(currentAvatar); }, [currentAvatar, avatarTouched]);

  // Debounced availability check while typing
  useEffect(() => {
    if (!unameTouched) { setUnameCheck({ status: "idle" }); return; }
    const parsed = usernameSchema.safeParse(uname);
    if (!parsed.success) { setUnameCheck({ status: "invalid", msg: parsed.error.issues[0].message }); return; }
    if (parsed.data.toLowerCase() === (currentUsername || "").toLowerCase()) {
      setUnameCheck({ status: "ok", msg: t("acc.uname_current") }); return;
    }
    setUnameCheck({ status: "checking" });
    const to = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles").select("id").ilike("username", parsed.data).neq("id", userId).maybeSingle();
      if (error) { setUnameCheck({ status: "idle" }); return; }
      setUnameCheck(data ? { status: "taken", msg: t("acc.uname_taken") } : { status: "ok", msg: t("acc.uname_available") });
    }, 400);
    return () => clearTimeout(to);
  }, [uname, unameTouched, currentUsername, userId, usernameSchema, t]);

  async function save() {
    const parsedName = nameSchema.safeParse(name);
    if (!parsedName.success) { toast.error(parsedName.error.issues[0].message); return; }
    const parsedUname = usernameSchema.safeParse(uname);
    if (!parsedUname.success) { toast.error(parsedUname.error.issues[0].message); return; }
    if (unameCheck.status === "taken") { toast.error(t("acc.uname_taken")); return; }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsedName.data, username: parsedUname.data, avatar_url: avatar })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      if ((error as { code?: string }).code === "23505") toast.error(t("acc.uname_taken"));
      else toast.error(t("acc.save_failed"));
      return;
    }
    await supabase.auth.updateUser({
      data: { username: parsedUname.data, full_name: parsedName.data, avatar_url: avatar },
    });
    toast.success(t("acc.saved_ok"));
    try {
      const profileCache = {
        username: parsedUname.data, full_name: parsedName.data, avatar_url: avatar,
        level: currentLevel, xp: currentXp, email: userEmail, _cachedAt: Date.now(),
      };
      localStorage.setItem(`gx:profile:${userId}`, JSON.stringify(profileCache));
      localStorage.setItem("gx:profile-updated", String(Date.now()));
      window.dispatchEvent(new CustomEvent("gx:profile-updated", { detail: profileCache }));
    } catch { /* noop */ }
    setNameTouched(false); setUnameTouched(false); setAvatarTouched(false);
    onSaved();
  }

  const unameColor =
    unameCheck.status === "ok" ? "text-emerald-500" :
    unameCheck.status === "taken" || unameCheck.status === "invalid" ? "text-destructive" :
    unameCheck.status === "checking" ? "text-muted-foreground" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <PlayerSearch />
      <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">{t("acc.pick_character")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {AVATAR_SEEDS.map((s) => {
              const url = avatarUrl(s);
              const active = avatar === url;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setAvatar(url); setAvatarTouched(true); }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition ${active ? "border-primary ring-2 ring-primary/50 scale-105" : "border-transparent hover:border-primary/50"}`}
                >
                  <img src={url} alt={s} className="w-full h-full object-cover bg-muted" loading="lazy" />
                  {active && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("acc.account_info")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={avatar} alt="preview" className="w-16 h-16 rounded-xl border" />
            <div className="text-sm text-muted-foreground">{t("acc.avatar_preview")}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t("acc.display_name")}</Label>
            <Input id="name" value={name} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} placeholder={t("acc.display_name_ph")} maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uname">{t("acc.gametag")}</Label>
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-muted-foreground pointer-events-none" dir="ltr">@</span>
              <Input
                id="uname"
                dir="ltr"
                className="ps-7"
                value={uname}
                onChange={(e) => { setUname(e.target.value.replace(/\s+/g, "")); setUnameTouched(true); }}
                placeholder="your_tag"
                maxLength={20}
              />
            </div>
            {unameCheck.msg && (
              <p className={`text-xs ${unameColor}`}>
                {unameCheck.status === "checking" ? t("acc.checking") : unameCheck.msg}
              </p>
            )}
          </div>
          <Button onClick={save} disabled={saving || unameCheck.status === "taken" || unameCheck.status === "invalid" || unameCheck.status === "checking"} className="w-full">
            {saving ? t("acc.saving") : t("acc.save")}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function PlayerSearch() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; username: string; full_name: string | null; avatar_url: string | null; level: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = q.replace(/^@+/, "").trim();
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const to = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_public_profiles", { _q: query, _limit: 8 });
      setLoading(false);
      if (error) { setResults([]); return; }
      setResults((data as typeof results) ?? []);
      setOpen(true);
    }, 300);
    return () => clearTimeout(to);
  }, [q]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">{t("acc.search_player")}</span>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 start-3 flex items-center text-muted-foreground pointer-events-none text-sm" dir="ltr">@</span>
          <Input
            dir="ltr"
            className="ps-7"
            placeholder="game_tag"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (loading || results.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-xl overflow-hidden">
              {loading && <div className="p-3 text-xs text-muted-foreground text-center">{t("acc.searching")}</div>}
              {!loading && results.map((r) => {
                const av = r.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(r.username)}&backgroundType=gradientLinear&backgroundColor=0ea5e9,6366f1,8b5cf6`;
                return (
                  <Link
                    key={r.id}
                    to="/u/$username"
                    params={{ username: r.username }}
                    className="flex items-center gap-3 p-2.5 hover:bg-accent transition"
                    onClick={() => setOpen(false)}
                  >
                    <img src={av} alt={r.username} className="w-9 h-9 rounded-lg object-cover bg-card" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{r.full_name || r.username}</div>
                      <div className="text-xs text-primary truncate" dir="ltr">@{r.username}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Lv.{Math.max(1, Number(r.level) || 1)}</Badge>
                  </Link>
                );
              })}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground text-center">{t("acc.no_results")}</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type OrderRow = {
  id: string; order_number: string; status: string; created_at: string; total_jod: number;
  items: unknown; delivery_data: unknown;
};

function OrdersTab({ loading, orders }: { loading: boolean; orders: OrderRow[] }) {
  const { t, dir } = useLang();
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
        list.map((o) => <OrderCard key={o.id} order={o} />)
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
    ? (delivery as { codes: Array<{ label?: string; value?: string }> }).codes : [];
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
          <div className="mt-3 bg-muted/40 rounded-lg p-3 space-y-2 border">
            <div className="text-sm font-semibold">{t("acc.your_codes")}</div>
            {codes.map((c, i) => <CodeBox key={i} label={c.label} value={c.value} />)}
          </div>
        )}
      </CardContent>
    </Card>
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
  return (
    <div className="text-sm">
      {label && <div className="text-muted-foreground text-xs mb-1">{label}</div>}
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
