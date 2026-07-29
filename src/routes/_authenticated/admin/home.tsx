import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Home as HomeIcon, Save, Image as ImageIcon, LayoutGrid, Star, Upload, Trash2, Plus, ArrowUp, ArrowDown, History, RotateCcw } from "lucide-react";
import { CATEGORY_LINKS, getFeaturedItems } from "@/data/products";
import type { HomeHero, HomeBanners, HomeBannerItem, HomeCategoryOverride } from "@/lib/gx/site-settings";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/home")({
  head: () => ({ meta: [{ title: "الصفحة الرئيسية — لوحة التحكم" }] }),
  component: HomeAdmin,
});

type SettingsMap = {
  home_hero: HomeHero;
  home_banners: HomeBanners;
  home_categories_meta: Record<string, HomeCategoryOverride>;
  home_bestseller_order: string[];
};

const DEFAULTS: SettingsMap = {
  home_hero: { enabled: true, badge: null, title_a: null, title_b: null, title_c: null, subtitle: null, cta_primary_text: null, cta_primary_link: null, cta_secondary_text: null, cta_secondary_link: null, image_url: null },
  home_banners: { enabled: false, autoplay: true, interval_ms: 5000, items: [] },
  home_categories_meta: {},
  home_bestseller_order: [],
};

function HomeAdmin() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["home-admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value")
        .in("key", ["home_hero", "home_banners", "home_categories_meta", "home_bestseller_order"]);
      if (error) throw error;
      const map = { ...DEFAULTS } as SettingsMap;
      (data ?? []).forEach((r) => {
        const k = r.key as keyof SettingsMap;
        if (k in map) (map as Record<string, unknown>)[k] = r.value as never;
      });
      map.home_hero = { ...DEFAULTS.home_hero, ...(map.home_hero || {}) };
      map.home_banners = { ...DEFAULTS.home_banners, ...(map.home_banners || {}) };
      map.home_categories_meta = map.home_categories_meta || {};
      map.home_bestseller_order = Array.isArray(map.home_bestseller_order) ? map.home_bestseller_order : [];
      return map;
    },
  });

  const [state, setState] = useState<SettingsMap>(DEFAULTS);
  const [dirty, setDirty] = useState<Set<keyof SettingsMap>>(new Set());

  useEffect(() => { if (q.data) { setState(q.data); setDirty(new Set()); } }, [q.data]);

  function patch<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setDirty((d) => new Set(d).add(key));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (dirty.size === 0) return;
      // Snapshot the CURRENT server value of each dirty key before overwriting,
      // so admins can restore an older version from the history tab.
      const dirtyKeys = Array.from(dirty).map((k) => k as string);
      const { data: current } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", dirtyKeys);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      const email = sess.session?.user?.email ?? null;
      if (current && current.length > 0) {
        const snapshots = current.map((r) => ({
          key: r.key,
          value: r.value as never,
          actor_id: uid,
          actor_email: email,
          note: "snapshot before save",
        }));
        await supabase.from("home_settings_history").insert(snapshots);
      }
      const rows = dirtyKeys.map((k) => ({ key: k, value: state[k as keyof SettingsMap] as never }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["home-admin-settings"] });
      qc.invalidateQueries({ queryKey: ["home-settings-history"] });
      setDirty(new Set());
    },
    onError: (e: Error) => toast.error(e.message || "فشل الحفظ"),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 grid place-items-center">
            <HomeIcon className="text-cyan-400" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">الصفحة الرئيسية</h1>
            <p className="text-slate-400 text-sm">تحكّم كامل بالهيرو، السلايدر، ترتيب الأقسام، والأكثر مبيعاً.</p>
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={dirty.size === 0 || save.isPending}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
          <Save size={16} className="ms-2" /> حفظ التعديلات {dirty.size > 0 && `(${dirty.size})`}
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="hero"><ImageIcon size={14} className="ms-2" /> الهيرو</TabsTrigger>
          <TabsTrigger value="banners"><LayoutGrid size={14} className="ms-2" /> السلايدر</TabsTrigger>
          <TabsTrigger value="cats"><LayoutGrid size={14} className="ms-2" /> الأقسام</TabsTrigger>
          <TabsTrigger value="best"><Star size={14} className="ms-2" /> الأكثر مبيعاً</TabsTrigger>
          <TabsTrigger value="history"><History size={14} className="ms-2" /> السجل</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <HeroTab hero={state.home_hero} onChange={(h) => patch("home_hero", h)} />
        </TabsContent>
        <TabsContent value="banners" className="mt-4">
          <BannersTab banners={state.home_banners} onChange={(b) => patch("home_banners", b)} />
        </TabsContent>
        <TabsContent value="cats" className="mt-4">
          <CatsTab meta={state.home_categories_meta} onChange={(m) => patch("home_categories_meta", m)} />
        </TabsContent>
        <TabsContent value="best" className="mt-4">
          <BestTab order={state.home_bestseller_order} onChange={(o) => patch("home_bestseller_order", o)} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------------- HERO ---------------------------------- */

function HeroTab({ hero, onChange }: { hero: HomeHero; onChange: (h: HomeHero) => void }) {
  const [uploading, setUploading] = useState(false);
  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const path = `hero/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("home-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = await supabase.storage.from("home-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (data?.signedUrl) onChange({ ...hero, image_url: data.signedUrl });
      toast.success("تم رفع الصورة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally { setUploading(false); }
  }
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">قسم الهيرو</CardTitle>
        <CardDescription>اترك الحقل فارغاً لاستخدام النص الافتراضي حسب لغة الزائر.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div>
            <Label className="text-slate-100">تفعيل الهيرو</Label>
            <p className="text-xs text-slate-400">عند الإيقاف يختفي القسم بالكامل من الصفحة الرئيسية.</p>
          </div>
          <Switch checked={hero.enabled} onCheckedChange={(v) => onChange({ ...hero, enabled: v })} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="الشارة العلوية" value={hero.badge} onChange={(v) => onChange({ ...hero, badge: v })} />
          <Field label="السطر 1 من العنوان" value={hero.title_a} onChange={(v) => onChange({ ...hero, title_a: v })} />
          <Field label="السطر 2 (بلون مميز)" value={hero.title_b} onChange={(v) => onChange({ ...hero, title_b: v })} />
          <Field label="السطر 3" value={hero.title_c} onChange={(v) => onChange({ ...hero, title_c: v })} />
        </div>
        <div>
          <Label className="text-slate-100">الوصف</Label>
          <Textarea rows={3} value={hero.subtitle ?? ""} onChange={(e) => onChange({ ...hero, subtitle: e.target.value || null })}
            className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" placeholder="اترك فارغاً للنص الافتراضي" />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="نص الزر الأساسي" value={hero.cta_primary_text} onChange={(v) => onChange({ ...hero, cta_primary_text: v })} />
          <Field label="رابط الزر الأساسي" value={hero.cta_primary_link} onChange={(v) => onChange({ ...hero, cta_primary_link: v })} placeholder="#products أو /category/games" />
          <Field label="نص الزر الثانوي" value={hero.cta_secondary_text} onChange={(v) => onChange({ ...hero, cta_secondary_text: v })} />
          <Field label="رابط الزر الثانوي" value={hero.cta_secondary_link} onChange={(v) => onChange({ ...hero, cta_secondary_link: v })} placeholder="#categories" />
        </div>

        <div>
          <Label className="text-slate-100">صورة الهيرو (اختياري)</Label>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {hero.image_url && (
              <div className="relative">
                <img src={hero.image_url} alt="" className="h-24 rounded-lg border border-slate-800" />
                <button onClick={() => onChange({ ...hero, image_url: null })}
                  className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-red-500 text-white grid place-items-center">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800">
              <Upload size={14} /> {uploading ? "جاري الرفع..." : "رفع صورة"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) uploadImage(f);
              }} />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string | null; onChange: (v: string | null) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-slate-100">{label}</Label>
      <Input value={value ?? ""} placeholder={placeholder ?? "افتراضي"}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" />
    </div>
  );
}

/* --------------------------------- BANNERS -------------------------------- */

function BannersTab({ banners, onChange }: { banners: HomeBanners; onChange: (b: HomeBanners) => void }) {
  const [uploadingIdx, setUploadingIdx] = useState<string | null>(null);

  async function uploadFor(item: HomeBannerItem, file: File) {
    setUploadingIdx(item.id);
    try {
      const path = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("home-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = await supabase.storage.from("home-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (data?.signedUrl) {
        onChange({ ...banners, items: banners.items.map((b) => b.id === item.id ? { ...b, image_url: data.signedUrl } : b) });
      }
      toast.success("تم رفع الصورة");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally { setUploadingIdx(null); }
  }

  function addBanner() {
    onChange({ ...banners, items: [...banners.items, { id: crypto.randomUUID(), image_url: "", title: "", subtitle: "", link: "" }] });
  }
  function removeBanner(id: string) {
    onChange({ ...banners, items: banners.items.filter((b) => b.id !== id) });
  }
  function updateBanner(id: string, patch: Partial<HomeBannerItem>) {
    onChange({ ...banners, items: banners.items.map((b) => b.id === id ? { ...b, ...patch } : b) });
  }
  function move(id: string, dir: -1 | 1) {
    const idx = banners.items.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= banners.items.length) return;
    const items = [...banners.items];
    [items[idx], items[nextIdx]] = [items[nextIdx], items[idx]];
    onChange({ ...banners, items });
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">سلايدر البانرات</CardTitle>
        <CardDescription>يظهر أسفل الهيرو مباشرةً — استخدمه للعروض والتخفيضات.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <Label className="text-slate-100">تفعيل السلايدر</Label>
            <Switch checked={banners.enabled} onCheckedChange={(v) => onChange({ ...banners, enabled: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <Label className="text-slate-100">تشغيل تلقائي</Label>
            <Switch checked={banners.autoplay} onCheckedChange={(v) => onChange({ ...banners, autoplay: v })} />
          </div>
          <div>
            <Label className="text-slate-100">مدة كل شريحة (ms)</Label>
            <Input type="number" min={2000} step={500} value={banners.interval_ms}
              onChange={(e) => onChange({ ...banners, interval_ms: Math.max(2000, Number(e.target.value) || 5000) })}
              className="mt-1 bg-slate-950/60 border-slate-800 text-slate-100" />
          </div>
        </div>

        <div className="space-y-3">
          {banners.items.map((b, i) => (
            <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-slate-900 grid place-items-center border border-slate-800 shrink-0">
                  {b.image_url ? <img src={b.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-slate-600" />}
                </div>
                <div className="flex-1 min-w-[220px] space-y-2">
                  <div className="grid md:grid-cols-2 gap-2">
                    <Input placeholder="العنوان (اختياري)" value={b.title ?? ""} onChange={(e) => updateBanner(b.id, { title: e.target.value })}
                      className="bg-slate-900/60 border-slate-800 text-slate-100" />
                    <Input placeholder="الرابط (اختياري)" value={b.link ?? ""} onChange={(e) => updateBanner(b.id, { link: e.target.value })}
                      className="bg-slate-900/60 border-slate-800 text-slate-100" />
                  </div>
                  <Input placeholder="النص الفرعي (اختياري)" value={b.subtitle ?? ""} onChange={(e) => updateBanner(b.id, { subtitle: e.target.value })}
                    className="bg-slate-900/60 border-slate-800 text-slate-100" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-xs">
                    <Upload size={12} /> {uploadingIdx === b.id ? "..." : "رفع"}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(b, f); }} />
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => move(b.id, -1)} disabled={i === 0}><ArrowUp size={12} /></Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => move(b.id, 1)} disabled={i === banners.items.length - 1}><ArrowDown size={12} /></Button>
                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => removeBanner(b.id)}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addBanner} className="w-full border-dashed border-slate-700 text-slate-300 hover:bg-slate-800/50">
            <Plus size={14} className="ms-2" /> إضافة بانر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- CATEGORIES ------------------------------ */

function CatsTab({ meta, onChange }: { meta: Record<string, HomeCategoryOverride>; onChange: (m: Record<string, HomeCategoryOverride>) => void }) {
  function update(slug: string, patch: Partial<HomeCategoryOverride>) {
    onChange({ ...meta, [slug]: { ...(meta[slug] || {}), ...patch } });
  }
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">الأقسام في الصفحة الرئيسية</CardTitle>
        <CardDescription>غيّر الاسم، الوصف، اللون، وترتيب ظهور كل قسم — أو أخفِه.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORY_LINKS.map((c) => {
          const m = meta[c.slug] || {};
          return (
            <div key={c.slug} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg grid place-items-center text-lg" style={{ background: c.bg }}>{c.icon}</div>
                <div className="flex-1">
                  <div className="text-slate-100 font-bold">{c.name}</div>
                  <div className="text-xs text-slate-500">/{c.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-slate-300 text-xs">إظهار</Label>
                  <Switch checked={!m.hidden} onCheckedChange={(v) => update(c.slug, { hidden: !v })} />
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                <Input placeholder="اسم مخصص" value={m.name ?? ""} onChange={(e) => update(c.slug, { name: e.target.value || null })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100" />
                <Input placeholder="وصف مخصص" value={m.desc ?? ""} onChange={(e) => update(c.slug, { desc: e.target.value || null })}
                  className="bg-slate-900/60 border-slate-800 text-slate-100 md:col-span-2" />
                <div className="flex gap-2">
                  <Input type="color" value={m.accent || c.accent} onChange={(e) => update(c.slug, { accent: e.target.value })}
                    className="bg-slate-900/60 border-slate-800 h-10 w-14 p-1" />
                  <Input type="number" placeholder="ترتيب" value={m.sort ?? ""} onChange={(e) => update(c.slug, { sort: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="bg-slate-900/60 border-slate-800 text-slate-100" />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* -------------------------------- BESTSELLERS ----------------------------- */

function BestTab({ order, onChange }: { order: string[]; onChange: (o: string[]) => void }) {
  const items = useMemo(() => getFeaturedItems(), []);
  const ordered: typeof items = useMemo(() => {
    const inOrder = order.map((id) => items.find((it) => it.cartId === id)).filter((x): x is typeof items[number] => !!x);
    const remaining = items.filter((it) => !order.includes(it.cartId));
    return [...inOrder, ...remaining];
  }, [order, items]);
  function move(id: string, dir: -1 | 1) {
    const ids = ordered.map((i) => i.cartId);
    const idx = ids.indexOf(id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    onChange(ids);
  }
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">الأكثر مبيعاً</CardTitle>
        <CardDescription>رتّب المنتجات المعروضة يدوياً — الترتيب أعلاه يظهر أولاً في الصفحة الرئيسية.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {ordered.map((it, i) => (
          <div key={it.cartId} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="w-10 h-10 rounded-md grid place-items-center text-lg shrink-0" style={{ background: it.bg }}>{it.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-100 font-bold truncate">{it.name}</div>
              <div className="text-xs text-slate-500">{it.cartId}</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => move(it.cartId, -1)} disabled={i === 0}><ArrowUp size={13} /></Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => move(it.cartId, 1)} disabled={i === ordered.length - 1}><ArrowDown size={13} /></Button>
            </div>
          </div>
        ))}
        {order.length > 0 && (
          <Button variant="outline" onClick={() => onChange([])} className="w-full border-slate-700 text-slate-300">إعادة الترتيب الافتراضي</Button>
        )}
      </CardContent>
    </Card>
  );
}
