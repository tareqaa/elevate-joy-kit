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
import { Settings as SettingsIcon, Save, Store, MessageCircle, Share2, Wrench } from "lucide-react";

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
