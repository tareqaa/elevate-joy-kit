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

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "حسابي — GX Store" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === "string" ? s.tab : "profile") as "profile" | "orders" | "security",
  }),
  component: AccountPage,
});


const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
  paid: { label: "تم الدفع", className: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
  processing: { label: "قيد التجهيز", className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/40" },
  delivered: { label: "جاهز", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  cancelled: { label: "ملغى", className: "bg-rose-500/15 text-rose-400 border-rose-500/40" },
};

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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20">
        <div className="h-24 bg-gradient-to-l from-primary/30 via-purple-500/20 to-cyan-500/20" />
        <CardContent className="pt-0 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <img
            src={profileQ.data?.avatar_url || avatarUrl(user.email || "gx")}
            alt="avatar"
            className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl bg-card object-cover"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-primary font-semibold" dir="ltr">@{username}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            عضو منذ {new Date(profileQ.data?.created_at || Date.now()).toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}
          </Badge>
        </CardContent>
      </Card>

      <Tabs
        dir="rtl"
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v as "profile" | "orders" | "security" } })}
      >
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="profile"><UserIcon className="w-4 h-4 ms-1" />الملف</TabsTrigger>
          <TabsTrigger value="orders"><Package className="w-4 h-4 ms-1" />طلباتي</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="w-4 h-4 ms-1" />الأمان</TabsTrigger>
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
  const [name, setName] = useState(currentName);
  const [uname, setUname] = useState(currentUsername);
  const [avatar, setAvatar] = useState(currentAvatar || avatarUrl(AVATAR_SEEDS[0]));
  const [nameTouched, setNameTouched] = useState(false);
  const [unameTouched, setUnameTouched] = useState(false);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unameCheck, setUnameCheck] = useState<{ status: "idle" | "checking" | "ok" | "taken" | "invalid"; msg?: string }>({ status: "idle" });

  const nameSchema = useMemo(() => z.string().trim().min(2, "الاسم قصير").max(60, "الاسم طويل"), []);
  const usernameSchema = useMemo(
    () => z.string().trim().min(3, "اليوزر قصير جداً (3 أحرف على الأقل)").max(20, "اليوزر طويل (20 حرف كحد أقصى)")
      .regex(/^[a-zA-Z0-9_]+$/, "أحرف إنجليزية وأرقام و _ فقط"),
    [],
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
      setUnameCheck({ status: "ok", msg: "هذا يوزرك الحالي" }); return;
    }
    setUnameCheck({ status: "checking" });
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles").select("id").ilike("username", parsed.data).neq("id", userId).maybeSingle();
      if (error) { setUnameCheck({ status: "idle" }); return; }
      setUnameCheck(data ? { status: "taken", msg: "هذا اليوزر محجوز" } : { status: "ok", msg: "متاح ✓" });
    }, 400);
    return () => clearTimeout(t);
  }, [uname, unameTouched, currentUsername, userId, usernameSchema]);

  async function save() {
    const parsedName = nameSchema.safeParse(name);
    if (!parsedName.success) { toast.error(parsedName.error.issues[0].message); return; }
    const parsedUname = usernameSchema.safeParse(uname);
    if (!parsedUname.success) { toast.error(parsedUname.error.issues[0].message); return; }
    if (unameCheck.status === "taken") { toast.error("هذا اليوزر محجوز"); return; }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsedName.data, username: parsedUname.data, avatar_url: avatar })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      // 23505 = unique_violation on username (race)
      if ((error as { code?: string }).code === "23505") toast.error("هذا اليوزر محجوز");
      else toast.error("فشل الحفظ");
      return;
    }
    await supabase.auth.updateUser({
      data: { username: parsedUname.data, full_name: parsedName.data, avatar_url: avatar },
    });
    toast.success("تم تحديث الملف الشخصي");
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
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">اختر شخصيتك</CardTitle></CardHeader>
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
        <CardHeader><CardTitle className="text-base">معلومات الحساب</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <img src={avatar} alt="preview" className="w-16 h-16 rounded-xl border" />
            <div className="text-sm text-muted-foreground">معاينة الأفاتار الجديد</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">الاسم المعروض</Label>
            <Input id="name" value={name} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} placeholder="اسمك في اللعبة" maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uname">GameTag</Label>
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
                {unameCheck.status === "checking" ? "جاري التحقق..." : unameCheck.msg}
              </p>
            )}
          </div>
          <Button onClick={save} disabled={saving || unameCheck.status === "taken" || unameCheck.status === "invalid" || unameCheck.status === "checking"} className="w-full">
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type OrderRow = {
  id: string; order_number: string; status: string; created_at: string; total_jod: number;
  items: unknown; delivery_data: unknown;
};

const STATUS_TABS: Array<{ key: string; label: string; match: (s: string) => boolean }> = [
  { key: "pending", label: "قيد الانتظار", match: (s) => s === "pending" },
  { key: "paid", label: "تم الدفع", match: (s) => s === "paid" },
  { key: "processing", label: "قيد التجهيز", match: (s) => s === "processing" },
  { key: "delivered", label: "جاهز", match: (s) => s === "delivered" },
  { key: "cancelled", label: "ملغى", match: (s) => s === "cancelled" },
];

function OrdersTab({ loading, orders }: { loading: boolean; orders: OrderRow[] }) {
  const [view, setView] = useState<string>("pending");
  if (loading) return <p className="text-sm text-muted-foreground">جاري التحميل...</p>;
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = orders.filter((o) => t.match(o.status)).length;
    return acc;
  }, {});
  const activeTab = STATUS_TABS.find((t) => t.key === view) ?? STATUS_TABS[0];
  const list = orders.filter((o) => activeTab.match(o.status));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="border-b border-white/10 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STATUS_TABS.map((t) => {
            const on = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setView(t.key)}
                className={`relative px-4 py-2.5 text-sm whitespace-nowrap transition ${
                  on ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={`ms-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {counts[t.key]}
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
          ما في طلبات في هذا القسم. <a href="/app/index.html" className="text-primary underline">تسوّق الآن</a>
        </CardContent></Card>
      ) : (
        list.map((o) => <OrderCard key={o.id} order={o} />)
      )}
    </div>
  );
}


function OrderCard({ order: o }: { order: OrderRow }) {
  const status = STATUS_LABELS[o.status] ?? { label: o.status, className: "bg-muted text-muted-foreground border-border" };
  const items = Array.isArray(o.items) ? (o.items as Array<{ name?: string; qty?: number; price?: number }>) : [];
  const delivery = o.delivery_data && typeof o.delivery_data === "object" ? o.delivery_data as Record<string, unknown> : {};
  const codes = Array.isArray((delivery as { codes?: unknown }).codes)
    ? (delivery as { codes: Array<{ label?: string; value?: string }> }).codes : [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="font-mono text-sm font-semibold">{o.order_number}</div>
            <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar-EG")}</div>
          </div>
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {items.map((it, i) => (
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
          <div className="mt-3 bg-muted/40 rounded-lg p-3 space-y-2 border">
            <div className="text-sm font-semibold">🎁 الأكواد الخاصة بك</div>
            {codes.map((c, i) => <CodeBox key={i} label={c.label} value={c.value} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodeBox({ label, value }: { label?: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("تم النسخ");
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
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  async function change() {
    if (pw.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف فأكثر"); return; }
    if (pw !== pw2) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPw(""); setPw2("");
    toast.success("تم تغيير كلمة المرور");
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تم إرسال رابط إعادة التعيين لبريدك");
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">تغيير كلمة المرور</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="pw">كلمة المرور الجديدة</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <Button onClick={change} disabled={saving} className="w-full">
            {saving ? "جاري الحفظ..." : "تحديث كلمة المرور"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">نسيت كلمة المرور؟</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            نرسل رابط إعادة تعيين إلى بريدك: <span dir="ltr" className="text-foreground">{email}</span>
          </p>
          <Button variant="outline" onClick={sendReset} className="w-full">إرسال رابط الاستعادة</Button>
        </CardContent>
      </Card>
    </div>
  );
}


