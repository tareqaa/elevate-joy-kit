import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Puzzle, Plus, Trash2, Pencil, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/mini-games")({
  head: () => ({ meta: [{ title: "الألعاب المصغّرة — لوحة التحكم" }] }),
  component: MiniGamesAdmin,
});

type GameSlug = "gx-blast" | "gx-flippy";

type Row = {
  id: string;
  slug: string;
  game_slug: GameSlug;
  path: string;
  icon: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  is_active: boolean;
  sort_order: number;
};

const GAME_OPTIONS: { value: GameSlug; label: string; path: string; icon: string }[] = [
  { value: "gx-blast", label: "🧩 GX Blast", path: "/games/blast", icon: "🧩" },
  { value: "gx-flippy", label: "🦅 GX Flippy Bird", path: "/games/flippy", icon: "🦅" },
];

const EMPTY: Partial<Row> = {
  game_slug: "gx-blast",
  path: "/games/blast",
  icon: "🧩",
  slug: "gx-blast-practice",
  name_ar: "",
  name_en: "",
  desc_ar: "",
  desc_en: "",
  is_active: true,
  sort_order: 0,
};

function MiniGamesAdmin() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-mini-games"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mini_games")
        .select("*")
        .order("sort_order")
        .order("id");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const saveM = useMutation({
    mutationFn: async (row: Partial<Row>) => {
      const payload = {
        slug: (row.slug ?? "").trim(),
        game_slug: row.game_slug ?? "gx-blast",
        path: row.path ?? "/games/blast",
        icon: (row.icon ?? "🎮").trim() || "🎮",
        name_ar: (row.name_ar ?? "").trim(),
        name_en: (row.name_en ?? "").trim(),
        desc_ar: (row.desc_ar ?? "").trim(),
        desc_en: (row.desc_en ?? "").trim(),
        is_active: row.is_active ?? true,
        sort_order: Number(row.sort_order) || 0,
      };
      if (!payload.slug) throw new Error("المعرّف (slug) مطلوب");
      if (!payload.name_ar || !payload.name_en) throw new Error("الاسم بالعربية والإنجليزية مطلوبان");

      if (row.id) {
        const { error } = await (supabase as any).from("mini_games").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("mini_games").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setEdit(null);
      void qc.invalidateQueries({ queryKey: ["admin-mini-games"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await (supabase as any).from("mini_games").update({ is_active: !r.is_active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-mini-games"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await (supabase as any).from("mini_games").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      setConfirmDel(null);
      void qc.invalidateQueries({ queryKey: ["admin-mini-games"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data ?? [];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-primary" /> الألعاب المصغّرة
          <Badge variant="secondary">{rows.length}</Badge>
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => listQ.refetch()}>
            <RefreshCcw className="w-4 h-4 ms-1" /> تحديث
          </Button>
          <Button size="sm" onClick={() => setEdit({ ...EMPTY })}>
            <Plus className="w-4 h-4 ms-1" /> لعبة جديدة
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        هذه الألعاب تظهر في قسم "الألعاب المصغّرة" وتُلعب دائمًا بوضع تسلية حر — بلا أي ارتباط بالبطولات
        (لا نقاط بطولة، لا تأثير على لوحة المتصدرين، لا جوائز). البطولات تُدار من صفحة «البطولات» بشكل منفصل تمامًا.
      </p>

      {listQ.isLoading ? (
        <p className="text-muted-foreground text-sm">جارِ التحميل…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد ألعاب مصغّرة بعد</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl" aria-hidden>{r.icon}</span>
                <div className="flex-1 min-w-48">
                  <div className="font-bold">{r.name_ar}</div>
                  <div className="text-xs text-muted-foreground">{r.name_en} · {r.slug} · {r.path}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleM.mutate(r)} />
                  <span className="text-xs text-muted-foreground">{r.is_active ? "ظاهرة" : "مخفية"}</span>
                </div>
                <Button size="icon" variant="outline" onClick={() => setEdit(r)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => setConfirmDel(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{edit?.id ? "تعديل لعبة مصغّرة" : "لعبة مصغّرة جديدة"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>اللعبة</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={edit.game_slug ?? "gx-blast"}
                  onChange={(e) => {
                    const opt = GAME_OPTIONS.find((o) => o.value === e.target.value) ?? GAME_OPTIONS[0];
                    setEdit({ ...edit, game_slug: opt.value, path: opt.path, icon: edit.icon || opt.icon });
                  }}
                >
                  {GAME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>المعرّف الفريد (slug)</Label>
                <Input dir="ltr" value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="gx-blast-practice" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الاسم بالعربية</Label>
                  <Input value={edit.name_ar ?? ""} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الاسم بالإنجليزية</Label>
                  <Input value={edit.name_en ?? ""} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الوصف بالعربية</Label>
                  <Input value={edit.desc_ar ?? ""} onChange={(e) => setEdit({ ...edit, desc_ar: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الوصف بالإنجليزية</Label>
                  <Input value={edit.desc_en ?? ""} onChange={(e) => setEdit({ ...edit, desc_en: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الأيقونة (إيموجي)</Label>
                  <Input value={edit.icon ?? "🎮"} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>ترتيب الظهور</Label>
                  <Input type="number" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />
                <span className="text-sm">ظاهرة للاعبين</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button>
            <Button onClick={() => edit && saveM.mutate(edit)} disabled={saveM.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>حذف اللعبة المصغّرة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل تريد حذف «{confirmDel?.name_ar}»؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => confirmDel && delM.mutate(confirmDel)} disabled={delM.isPending}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
