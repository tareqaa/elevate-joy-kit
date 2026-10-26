import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Store, MessageCircle, Share2, Wrench, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "الإعدادات — لوحة التحكم" }] }),
  component: SettingsPage,
});

type SettingRow = { key: string; value: unknown; description: string | null };

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return (data ?? []) as SettingRow[];
    },
  });

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [newStockKey, setNewStockKey] = useState<string>("");
  const [newStockLimit, setNewStockLimit] = useState<number>(1);

  useEffect(() => {
    if (!q.data) return;
    const next: Record<string, unknown> = {};
    q.data.forEach((r) => { next[r.key] = r.value; });
    setForm(next);
    setDirty(new Set());
  }, [q.data]);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => new Set(d).add(key));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (dirty.size === 0) return;
      const rows = Array.from(dirty).map((key) => ({ key, value: form[key] as never }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await supabase.rpc("log_admin_action", {
        _action: "settings.updated",
        _entity_type: "settings",
        _entity_id: undefined as unknown as string,
        _metadata: { keys: Array.from(dirty) },
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      try {
        localStorage.removeItem("gx_site_settings_v2_ts");
      } catch { /* noop */ }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gx:site-settings-updated"));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = (k: string) => form[k];

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center">
            <SettingsIcon size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">إعدادات المتجر</h1>
            <p className="text-xs text-muted-foreground">تحكّم بالمعلومات الأساسية للمتجر</p>
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={dirty.size === 0 || save.isPending}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
          <Save size={16} className="ml-1" />
          {save.isPending ? "جاري الحفظ…" : dirty.size > 0 ? `حفظ (${dirty.size})` : "محفوظ"}
        </Button>
      </div>

      {q.isLoading && <div className="text-muted-foreground text-sm p-6">جاري التحميل…</div>}

      {!q.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Store size={16} className="text-cyan-400" /> معلومات المتجر</CardTitle>
              <CardDescription>الاسم والعملة الافتراضية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="اسم المتجر">
                <Input value={String(s("store_name") ?? "")} onChange={(e) => set("store_name", e.target.value)} />
              </Field>
              <Field label="العملة الافتراضية">
                <Input value={String(s("default_currency") ?? "")} onChange={(e) => set("default_currency", e.target.value.toUpperCase())} placeholder="JOD" />
              </Field>
              <Field label="ساعات الإلغاء التلقائي للطلبات المعلّقة">
                <Input type="number" min={1} value={Number(s("order_completion_hours") ?? 24)}
                  onChange={(e) => set("order_completion_hours", Number(e.target.value) || 24)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><MessageCircle size={16} className="text-cyan-400" /> قنوات الدعم</CardTitle>
              <CardDescription>معلومات التواصل مع الزبائن</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="رقم واتساب الدعم (رمز الدولة + الرقم)">
                <Input dir="ltr" value={String(s("support_whatsapp") ?? "")} onChange={(e) => set("support_whatsapp", e.target.value.replace(/\D/g, ""))} placeholder="962790000000" />
              </Field>
              <Field label="إيميل الدعم">
                <Input type="email" dir="ltr" value={String(s("support_email") ?? "")} onChange={(e) => set("support_email", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Share2 size={16} className="text-cyan-400" /> السوشيال ميديا</CardTitle>
              <CardDescription>روابط الحسابات الرسمية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Instagram"><Input dir="ltr" value={String(s("social_instagram") ?? "")} onChange={(e) => set("social_instagram", e.target.value)} placeholder="https://instagram.com/…" /></Field>
              <Field label="Facebook"><Input dir="ltr" value={String(s("social_facebook") ?? "")} onChange={(e) => set("social_facebook", e.target.value)} placeholder="https://facebook.com/…" /></Field>
              <Field label="TikTok"><Input dir="ltr" value={String(s("social_tiktok") ?? "")} onChange={(e) => set("social_tiktok", e.target.value)} placeholder="https://tiktok.com/@…" /></Field>
            </CardContent>
          </Card>

          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Wrench size={16} className="text-amber-400" /> وضع الصيانة</CardTitle>
              <CardDescription>إيقاف الطلبات وعرض رسالة للزوار</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div>
                  <div className="font-medium">تفعيل وضع الصيانة</div>
                  <div className="text-xs text-muted-foreground">سيتم منع الطلبات الجديدة</div>
                </div>
                <Switch checked={Boolean(s("maintenance_mode"))} onCheckedChange={(v) => set("maintenance_mode", v)} />
              </div>
              <Field label="رسالة الصيانة">
                <Textarea rows={3} value={String(s("maintenance_message") ?? "")} onChange={(e) => set("maintenance_message", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><SettingsIcon size={16} className="text-cyan-400" /> الشارات وعرض المنتجات</CardTitle>
              <CardDescription>التحكم بالشارات التلقائية لباقات فورتنايت والألعاب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                <div>
                  <div className="font-medium text-sm">إخفاء الشارات التلقائية في فورتنايت</div>
                  <div className="text-xs text-muted-foreground">إلغاء الشارات التلقائية (مثل: فئة برونزية، الأكثر طلباً) عن كافة باقات فورتنايت</div>
                </div>
                <Switch checked={Boolean(s("hide_fortnite_badges"))} onCheckedChange={(v) => set("hide_fortnite_badges", v)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Mail size={16} className="text-emerald-400" /> خدمة البريد الإلكتروني (Resend)</CardTitle>
              <CardDescription>إرسال إيميلات تسليم الطلبات، إشعارات الإلغاء، رصيد المتجر، وتنبيهات توفر المنتجات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="مفتاح API لخدمة Resend (RESEND_API_KEY)">
                <div className="space-y-1.5">
                  <Input
                    dir="ltr"
                    type="password"
                    placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={String(s("resend_api_key") ?? "")}
                    onChange={(e) => set("resend_api_key", e.target.value.trim())}
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>الدومين المعتمد: <strong className="text-emerald-400 font-mono">gxstore.me</strong></span>
                    <span className="font-mono">{s("resend_api_key") ? "✓ المفتاح مُعدّ ونشط" : "⚠️ المفتاح غير مُعدّ"}</span>
                  </div>
                </div>
              </Field>
            </CardContent>
          </Card>

          {/* Product Stock & Seat Limits Card */}
          <Card className="border-cyan-500/30 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store size={18} className="text-cyan-400" />
                📦 إدارة المخزون والمقاعد المتوفرة (Stock & Seat Limits)
              </CardTitle>
              <CardDescription>
                بشكل افتراضي (By Default)، كافة المنتجات والاشتراكات غير محدودة الكمية (Unlimited). يمكنك من هنا تحديد عدد المقاعد أو الأكواد المتبقية لأي منتج أو باقة معينة. عند إزالة الحد يعود المنتج تلقائياً إلى كمية غير محدودة.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Presets and Info */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">اختصارات سريعة للإضافة:</span>
                <button
                  type="button"
                  onClick={() => { setNewStockKey("youtube-premium"); setNewStockLimit(1); }}
                  className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium cursor-pointer transition-colors"
                >
                  + يوتيوب (مقعد 1)
                </button>
                <button
                  type="button"
                  onClick={() => { setNewStockKey("youtube-premium"); setNewStockLimit(0); }}
                  className="px-2.5 py-1 rounded bg-red-950/40 text-red-300 border border-red-500/30 hover:bg-red-900/40 font-medium cursor-pointer transition-colors"
                >
                  + يوتيوب (نفدت 0 ☹️)
                </button>
                <button
                  type="button"
                  onClick={() => { setNewStockKey("linkedin-career-12m"); setNewStockLimit(1); }}
                  className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium cursor-pointer transition-colors"
                >
                  + لينكدإن Career (مقعد 1)
                </button>
                <button
                  type="button"
                  onClick={() => { setNewStockKey("linkedin-business-12m"); setNewStockLimit(1); }}
                  className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-medium cursor-pointer transition-colors"
                >
                  + لينكدإن Business (مقعد 1)
                </button>
              </div>

              {/* Add New Limit Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/40 border">
                <div>
                  <Label className="text-xs mb-1.5 block">معرّف المنتج أو الباقة (Slug أو Cart ID)</Label>
                  <Input
                    dir="ltr"
                    placeholder="مثال: youtube-premium أو linkedin-career-12m"
                    value={newStockKey}
                    onChange={(e) => setNewStockKey(e.target.value.trim().toLowerCase())}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">الكمية المتوفرة (ضع 0 لحالة نفدت ☹️)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newStockLimit}
                    onChange={(e) => setNewStockLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newStockKey) {
                        toast.error("يرجى إدخال معرّف المنتج أو الباقة");
                        return;
                      }
                      const next = { ...((form["product_stock_limits"] as Record<string, number | null>) || {}) };
                      next[newStockKey] = newStockLimit;
                      set("product_stock_limits", next);
                      toast.success(`تم تحديد كمية (${newStockKey}) إلى ${newStockLimit}`);
                      setNewStockKey("");
                    }}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                  >
                    تحديد الكمية
                  </Button>
                </div>
              </div>

              {/* Current Limits Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">المنتج / الباقة</th>
                      <th className="p-2.5">المعرّف (Key)</th>
                      <th className="p-2.5">المقاعد المتبقية</th>
                      <th className="p-2.5 text-center">الحالة</th>
                      <th className="p-2.5 text-center">التحكم في الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.keys((form["product_stock_limits"] as Record<string, number | null>) || {}).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          لا توجد قيود مخزون حالياً — جميع المنتجات كميتها مفتوحة وغير محدودة (Unlimited By Default)
                        </td>
                      </tr>
                    ) : (
                      Object.entries((form["product_stock_limits"] as Record<string, number | null>) || {}).map(([k, val]) => {
                        const numVal = typeof val === "number" ? val : 0;
                        const labelName =
                          k === "youtube-premium" || k === "youtube-premium-1m" || k === "youtube"
                            ? "يوتيوب بريميوم (YouTube Premium)"
                            : k === "linkedin-career-12m"
                            ? "لينكدإن كارير 12 شهر (شحن حساب)"
                            : k === "linkedin-business-12m"
                            ? "لينكدإن بزنس 12 شهر (شحن حساب)"
                            : k;
                        return (
                          <tr key={k} className="hover:bg-muted/30">
                            <td className="p-2.5 font-bold">{labelName}</td>
                            <td className="p-2.5 font-mono text-muted-foreground" dir="ltr">{k}</td>
                            <td className="p-2.5">
                              <Input
                                type="number"
                                min={0}
                                value={numVal}
                                onChange={(e) => {
                                  const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  const next = { ...((form["product_stock_limits"] as Record<string, number | null>) || {}) };
                                  next[k] = n;
                                  set("product_stock_limits", next);
                                }}
                                className="w-20 h-7 text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              {numVal === 0 ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px] inline-flex items-center gap-1">
                                  <span>نفدت بالكامل</span>
                                  <span>☹️</span>
                                </span>
                              ) : numVal === 1 ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                                  مقعد أخير (1)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-[10px]">
                                  {numVal} متوفر
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const next = { ...((form["product_stock_limits"] as Record<string, number | null>) || {}) };
                                    next[k] = 0;
                                    set("product_stock_limits", next);
                                    toast.info(`تم ضبط (${k}) بحالة نفدت (0)`);
                                  }}
                                  className="h-7 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[11px]"
                                  title="ضبط كـ نفدت الكمية فوراً"
                                >
                                  نفدت (0)
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const next = { ...((form["product_stock_limits"] as Record<string, number | null>) || {}) };
                                    delete next[k];
                                    set("product_stock_limits", next);
                                    toast.success(`تم جعل كمية (${k}) مفتوحة وغير محدودة`);
                                  }}
                                  className="h-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-[11px]"
                                  title="جعل الكمية مفتوحة (إلغاء الحد)"
                                >
                                  كمية مفتوحة (غير محدود)
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
