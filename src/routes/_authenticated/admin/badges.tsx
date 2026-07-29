import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Award, Plus, Trash2, Search, RefreshCcw, ChevronUp, ChevronDown,
  Users as UsersIcon, Copy, Zap, Pencil,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/badges")({
  head: () => ({ meta: [{ title: "الشارات — لوحة التحكم" }] }),
  component: BadgesAdmin,
});

type Criteria = { type?: string; count?: number; amount?: number; code?: string };
type BadgeRow = {
  id: string; slug: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  icon: string; color: string; criteria: Criteria;
  is_active: boolean; sort_order: number;
};

const TYPES: { value: string; label: string }[] = [
  { value: "orders", label: "عدد الطلبات المكتملة" },
  { value: "spending", label: "إجمالي الإنفاق (دينار)" },
  { value: "level", label: "الوصول لمستوى معيّن" },
  { value: "reviews", label: "عدد المراجعات المقبولة" },
];

const COLORS = ["#22d3ee", "#a855f7", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#eab308"];
const ICONS = ["🏆", "🥇", "⭐", "🔥", "💎", "👑", "🎯", "🚀", "🛡️", "💰", "🎮", "❤️"];

function norm(s: string) {
  return s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

function criteriaLabel(c: Criteria, levels: { code: string; name_ar: string }[]) {
  if (!c || !c.type) return "بدون شرط";
  if (c.type === "orders") return `${c.count ?? 1} طلب مكتمل`;
  if (c.type === "spending") return `إنفاق ${c.amount ?? 0} د.أ`;
  if (c.type === "reviews") return `${c.count ?? 1} مراجعة مقبولة`;
  if (c.type === "level") return `مستوى ${levels.find((l) => l.code === c.code)?.name_ar ?? c.code}`;
  return "شرط مخصص";
}

function BadgesAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [edit, setEdit] = useState<Partial<BadgeRow> | null>(null);
  const [confirmDel, setConfirmDel] = useState<BadgeRow | null>(null);

  const dataQ = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const [badges, levels, earned] = await Promise.all([
        supabase.from("badges").select("*").order("sort_order"),
        supabase.from("levels").select("code, name_ar, sort_order").order("sort_order"),
        supabase.from("user_badges").select("badge_id"),
      ]);
      if (badges.error) throw badges.error;
      const counts = new Map<string, number>();
      (earned.data ?? []).forEach((r: { badge_id: string }) => {
        counts.set(r.badge_id, (counts.get(r.badge_id) ?? 0) + 1);
      });
      return {
        badges: ((badges.data ?? []) as unknown as BadgeRow[]),
        levels: (levels.data ?? []) as { code: string; name_ar: string }[],
        counts,
      };
    },
  });

  const badges = dataQ.data?.badges ?? [];
  const levels = dataQ.data?.levels ?? [];
  const counts = dataQ.data?.counts ?? new Map<string, number>();

  const stats = useMemo(() => {
    const total = badges.length;
    const active = badges.filter((b) => b.is_active).length;
    const awarded = Array.from(counts.values()).reduce((s, n) => s + n, 0);
    const unearned = badges.filter((b) => !counts.get(b.id)).length;
    return { total, active, awarded, unearned };
  }, [badges, counts]);

  const list = useMemo(() => {
    const nq = norm(q);
    return badges.filter((b) => {
      if (onlyActive && !b.is_active) return false;
      if (!nq) return true;
      return [b.name_ar, b.name_en, b.slug].some((v) => norm(v ?? "").includes(nq));
    });
  }, [badges, q, onlyActive]);

  const save = useMutation({
    mutationFn: async (b: Partial<BadgeRow>) => {
      const payload = {
        slug: (b.slug || "").trim(),
        name_ar: (b.name_ar || "").trim(),
        name_en: (b.name_en || "").trim() || (b.name_ar || "").trim(),
        description_ar: b.description_ar || null,
        description_en: b.description_en || null,
        icon: (b.icon || "🏆").trim(),
        color: b.color || COLORS[0],
        criteria: (b.criteria ?? {}) as never,
        is_active: b.is_active ?? true,
        sort_order: Number(b.sort_order ?? badges.length),
      };
      if (!payload.slug || !payload.name_ar) throw new Error("المعرّف والاسم العربي مطلوبان");
      if (b.id) {
        const { error } = await supabase.from("badges").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("badges").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ الشارة");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<BadgeRow> }) => {
      const { error } = await supabase.from("badges").update(values as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-badges"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("badges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الشارة");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["admin-badges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(b: BadgeRow, dir: -1 | 1) {
    const sorted = [...badges].sort((x, y) => x.sort_order - y.sort_order);
    const i = sorted.findIndex((x) => x.id === b.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    patch.mutate({ id: b.id, values: { sort_order: sorted[j].sort_order } });
    patch.mutate({ id: sorted[j].id, values: { sort_order: b.sort_order } });
  }

  const criteria: Criteria = (edit?.criteria ?? {}) as Criteria;
  const setCriteria = (v: Criteria) => setEdit({ ...edit, criteria: { ...criteria, ...v } });

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> إدارة الشارات
          </h1>
          <p className="text-sm text-muted-foreground">أنشئ الشارات وحدّد شروط الحصول عليها تلقائياً</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => dataQ.refetch()}>
            <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
          </Button>
          <Button size="sm" onClick={() => setEdit({ icon: "🏆", color: COLORS[0], is_active: true, criteria: { type: "orders", count: 1 }, sort_order: badges.length })}>
            <Plus className="h-4 w-4 ml-1" /> شارة جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الشارات", value: stats.total, Icon: Award },
          { label: "شارات مفعّلة", value: stats.active, Icon: Zap },
          { label: "مرات المنح", value: stats.awarded, Icon: UsersIcon },
          { label: "لم يحصل عليها أحد", value: stats.unearned, Icon: Search },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
              <s.Icon className="h-5 w-5 text-primary/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="ابحث بالاسم أو المعرّف…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyActive} onCheckedChange={setOnlyActive} />
            المفعّلة فقط
          </label>
        </CardContent>
      </Card>

      {dataQ.isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((b) => (
          <Card key={b.id} className="border-border/60 overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-xl grid place-items-center text-2xl shrink-0"
                  style={{ background: `${b.color}22`, border: `1px solid ${b.color}66` }}
                >
                  {b.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{b.name_ar}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.name_en} · {b.slug}</div>
                </div>
                <Switch checked={b.is_active} onCheckedChange={(v) => patch.mutate({ id: b.id, values: { is_active: v } })} />
              </div>

              {b.description_ar && (
                <p className="text-xs text-muted-foreground line-clamp-2">{b.description_ar}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[11px]">{criteriaLabel(b.criteria, levels)}</Badge>
                <Badge variant="outline" className="text-[11px]">
                  <UsersIcon className="h-3 w-3 ml-1" /> {counts.get(b.id) ?? 0} لاعب
                </Badge>
              </div>

              <div className="flex items-center gap-1 pt-1">
                <Button size="sm" variant="outline" onClick={() => setEdit(b)}>
                  <Pencil className="h-3.5 w-3.5 ml-1" /> تعديل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="نسخ"
                  onClick={() => setEdit({ ...b, id: undefined, slug: `${b.slug}-copy`, name_ar: `${b.name_ar} (نسخة)` })}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="أعلى" onClick={() => move(b, -1)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" title="أسفل" onClick={() => move(b, 1)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setConfirmDel(b)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!dataQ.isLoading && list.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-muted-foreground">لا توجد شارات مطابقة</CardContent>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "تعديل الشارة" : "شارة جديدة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60">
              <div
                className="h-14 w-14 rounded-xl grid place-items-center text-3xl"
                style={{ background: `${edit?.color ?? COLORS[0]}22`, border: `1px solid ${edit?.color ?? COLORS[0]}66` }}
              >
                {edit?.icon || "🏆"}
              </div>
              <div className="text-sm">
                <div className="font-semibold">{edit?.name_ar || "اسم الشارة"}</div>
                <div className="text-xs text-muted-foreground">{criteriaLabel(criteria, levels)}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">الاسم بالعربي *</label>
                <Input value={edit?.name_ar ?? ""} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الاسم بالإنجليزي</label>
                <Input value={edit?.name_en ?? ""} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">المعرّف (slug) *</label>
                <Input value={edit?.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الترتيب</label>
                <Input type="number" value={edit?.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">الوصف بالعربي</label>
                <Textarea rows={2} value={edit?.description_ar ?? ""} onChange={(e) => setEdit({ ...edit, description_ar: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الوصف بالإنجليزي</label>
                <Textarea rows={2} value={edit?.description_en ?? ""} onChange={(e) => setEdit({ ...edit, description_en: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">الأيقونة</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setEdit({ ...edit, icon: ic })}
                    className={`h-9 w-9 rounded-lg text-lg grid place-items-center border ${edit?.icon === ic ? "border-primary bg-primary/10" : "border-border/60"}`}
                  >
                    {ic}
                  </button>
                ))}
                <Input className="w-24" value={edit?.icon ?? ""} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">اللون</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEdit({ ...edit, color: c })}
                    className={`h-8 w-8 rounded-lg border-2 ${edit?.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
                <Input className="w-28" value={edit?.color ?? ""} onChange={(e) => setEdit({ ...edit, color: e.target.value })} />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-3 space-y-3">
              <div className="text-sm font-semibold">شرط الحصول التلقائي</div>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCriteria({ type: t.value })}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${criteria.type === t.value ? "border-primary bg-primary/10" : "border-border/60"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {(criteria.type === "orders" || criteria.type === "reviews") && (
                <div>
                  <label className="text-xs text-muted-foreground">العدد المطلوب</label>
                  <Input type="number" min={1} value={criteria.count ?? 1} onChange={(e) => setCriteria({ count: Number(e.target.value) })} />
                </div>
              )}
              {criteria.type === "spending" && (
                <div>
                  <label className="text-xs text-muted-foreground">المبلغ المطلوب (د.أ)</label>
                  <Input type="number" min={0} step="0.01" value={criteria.amount ?? 0} onChange={(e) => setCriteria({ amount: Number(e.target.value) })} />
                </div>
              )}
              {criteria.type === "level" && (
                <div>
                  <label className="text-xs text-muted-foreground">المستوى</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {levels.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setCriteria({ code: l.code })}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${criteria.code === l.code ? "border-primary bg-primary/10" : "border-border/60"}`}
                      >
                        {l.name_ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={edit?.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />
              الشارة مفعّلة
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button>
            <Button onClick={() => edit && save.mutate(edit)} disabled={save.isPending}>
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>حذف الشارة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            سيتم حذف «{confirmDel?.name_ar}» نهائياً وسحبها من {counts.get(confirmDel?.id ?? "") ?? 0} لاعب. هل أنت متأكد؟
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => confirmDel && remove.mutate(confirmDel.id)} disabled={remove.isPending}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
