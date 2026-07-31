import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, Plus, Trash2, Pencil, RefreshCcw, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tournaments")({
  head: () => ({ meta: [{ title: "البطولات — لوحة التحكم" }] }),
  component: TournamentsAdmin,
});

type RewardType = "coupon" | "coins" | "xp" | "custom";
type Prize = {
  place: number;
  label_ar: string;
  label_en: string;
  reward_type?: RewardType;
  reward_value?: number | null;
};
const REWARD_TYPES: { v: RewardType; label: string }[] = [
  { v: "coupon", label: "كوبون خصم %" },
  { v: "coins", label: "GX Coins" },
  { v: "xp", label: "XP" },
  { v: "custom", label: "جائزة مخصصة" },
];
function autoLabels(type: RewardType, value: number): { label_ar: string; label_en: string } | null {
  if (!value) return null;
  if (type === "coupon") return { label_ar: `كوبون خصم ${value}%`, label_en: `${value}% discount coupon` };
  if (type === "coins") return { label_ar: `${value} GX Coins`, label_en: `${value} GX Coins` };
  if (type === "xp") return { label_ar: `${value} XP`, label_en: `${value} XP` };
  return null;
}
type Row = {
  id: string;
  game_slug: string;
  game_icon: string;
  title_ar: string;
  title_en: string;
  game_path: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  prizes: Prize[];
  is_active: boolean;
  sort_order: number;
};

/** datetime-local <-> ISO helpers */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

const EMPTY: Partial<Row> = {
  game_slug: "gx-blast",
  game_icon: "🧩",
  title_ar: "البطولة الأسبوعية",
  title_en: "Weekly Tournament",
  game_path: "/games/blast",
  starts_at: new Date().toISOString(),
  ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  status: "active",
  prizes: [{ place: 1, label_ar: "منتج رقمي مجاني", label_en: "Free digital product" }],
  is_active: true,
  sort_order: 0,
};

function TournamentsAdmin() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_tournaments")
        .select("*")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        ...t,
        prizes: Array.isArray(t.prizes) ? (t.prizes as unknown as Prize[]) : [],
      })) as Row[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Partial<Row>) => {
      const payload = {
        game_slug: row.game_slug ?? "gx-blast",
        game_icon: row.game_icon ?? "🧩",
        title_ar: row.title_ar ?? "",
        title_en: row.title_en ?? "",
        game_path: row.game_path || null,
        starts_at: row.starts_at!,
        ends_at: row.ends_at!,
        status: row.status ?? "active",
        prizes: (row.prizes ?? []).map((p, i) => ({ ...p, place: i + 1 })),
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
      };
      if (row.id) {
        const { error } = await supabase.from("game_tournaments").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("game_tournaments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ البطولة");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("game_tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف البطولة");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["admin-tournaments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data ?? [];

  // how many tournaments the arena carousel shows (site setting)
  const countQ = useQuery({
    queryKey: ["arena-carousel-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "arena_carousel_count")
        .maybeSingle();
      const n = Number(data?.value ?? 6);
      return Number.isFinite(n) && n > 0 ? n : 6;
    },
  });
  const [countDraft, setCountDraft] = useState<string>("");
  const countValue = countDraft !== "" ? countDraft : String(countQ.data ?? 6);

  const saveCount = useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "arena_carousel_count", value: n as unknown as never }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ عدد البطولات في الكاروسيل");
      qc.invalidateQueries({ queryKey: ["arena-carousel-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // registrations per tournament
  const regQ = useQuery({
    queryKey: ["tournament-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tournament_registrations").select("tournament_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => { map[r.tournament_id] = (map[r.tournament_id] ?? 0) + 1; });
      return map;
    },
  });


  const setPrize = (i: number, patch: Partial<Prize>) =>
    setEdit((e) => {
      if (!e) return e;
      const prizes = [...(e.prizes ?? [])];
      prizes[i] = { ...prizes[i], ...patch };
      return { ...e, prizes };
    });

  return (
    <div dir="rtl" className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">البطولات</h1>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => listQ.refetch()}>
            <RefreshCcw className="h-4 w-4 ms-1" /> تحديث
          </Button>
          <Button size="sm" onClick={() => setEdit({ ...EMPTY })}>
            <Plus className="h-4 w-4 ms-1" /> بطولة جديدة
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">عدد البطولات الظاهرة في كاروسيل ساحة اللعب</label>
            <Input
              type="number"
              min={1}
              max={24}
              className="w-32"
              value={countValue}
              onChange={(e) => setCountDraft(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={saveCount.isPending}
            onClick={() => saveCount.mutate(Math.max(1, Math.min(24, Number(countValue) || 6)))}
          >
            حفظ
          </Button>
        </CardContent>
      </Card>



      {listQ.isLoading ? (
        <p className="text-muted-foreground text-sm">جارِ التحميل…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">لا توجد بطولات بعد.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{t.game_icon}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold">{t.title_ar}</h2>
                    <p className="text-xs text-muted-foreground">{t.title_en} · {t.game_slug}</p>
                  </div>
                  <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "مفعّلة" : "مخفية"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  من {new Date(t.starts_at).toLocaleString("ar-JO")} إلى {new Date(t.ends_at).toLocaleString("ar-JO")}
                </p>
                <ul className="text-sm space-y-1">
                  {t.prizes.map((p, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold">المركز {p.place ?? i + 1}:</span>
                      <span className="text-muted-foreground truncate">{p.label_ar}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  عدد الفائزين: {t.prizes.length} · المسجّلون: {regQ.data?.[t.id] ?? 0}
                </p>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEdit({ ...t })}>
                    <Pencil className="h-4 w-4 ms-1" /> تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmDel(t)}>
                    <Trash2 className="h-4 w-4 ms-1" /> حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "تعديل البطولة" : "بطولة جديدة"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">الاسم بالعربية</label>
                  <Input value={edit.title_ar ?? ""} onChange={(e) => setEdit({ ...edit, title_ar: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">الاسم بالإنجليزية</label>
                  <Input value={edit.title_en ?? ""} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">معرّف اللعبة</label>
                  <Input value={edit.game_slug ?? ""} onChange={(e) => setEdit({ ...edit, game_slug: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">مسار اللعبة</label>
                  <Input value={edit.game_path ?? ""} onChange={(e) => setEdit({ ...edit, game_path: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">تبدأ في</label>
                  <Input type="datetime-local" value={toLocalInput(edit.starts_at!)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">تنتهي في</label>
                  <Input type="datetime-local" value={toLocalInput(edit.ends_at!)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={edit.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} />
                <span className="text-sm">ظاهرة للاعبين</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">الجوائز (عدد الفائزين: {(edit.prizes ?? []).length})</span>
                  <Button size="sm" variant="outline" onClick={() => setEdit({ ...edit, prizes: [...(edit.prizes ?? []), { place: (edit.prizes ?? []).length + 1, label_ar: "", label_en: "" }] })}>
                    <Plus className="h-4 w-4 ms-1" /> مركز
                  </Button>
                </div>
                {(edit.prizes ?? []).map((p, i) => (
                  <div key={i} className="rounded-lg border p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">المركز {i + 1}</span>
                      <Button size="sm" variant="ghost" onClick={() => setEdit({ ...edit, prizes: (edit.prizes ?? []).filter((_, n) => n !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input placeholder="الجائزة بالعربية (مثال: منتج رقمي مجاني)" value={p.label_ar} onChange={(e) => setPrize(i, { label_ar: e.target.value })} />
                    <Input placeholder="Prize in English" value={p.label_en} onChange={(e) => setPrize(i, { label_en: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>إلغاء</Button>
            <Button disabled={save.isPending} onClick={() => edit && save.mutate(edit)}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>حذف البطولة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">سيتم حذف «{confirmDel?.title_ar}» ونتائجها نهائيًا.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>إلغاء</Button>
            <Button variant="destructive" disabled={del.isPending} onClick={() => confirmDel && del.mutate(confirmDel.id)}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
