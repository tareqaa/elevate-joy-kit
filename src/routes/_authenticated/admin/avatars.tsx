import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { MediaPicker } from "@/lib/gx/sections/media-library";
import { toast } from "sonner";
import {
  Sparkles, Plus, Trash2, Search, RefreshCcw, ChevronUp, ChevronDown,
  Users as UsersIcon, Images, Lock, Copy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/avatars")({
  head: () => ({ meta: [{ title: "الأفاتار — لوحة التحكم" }] }),
  component: AvatarsAdmin,
});

type Collection = {
  id: string; slug: string; name_ar: string; name_en: string;
  required_level_code: string; border_css: string | null;
  sort_order: number; is_active: boolean;
};
type Avatar = {
  id: string; collection_id: string; name: string; image_url: string;
  sort_order: number; is_active: boolean;
};

function norm(s: string) {
  return s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

function AvatarsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [editCol, setEditCol] = useState<Partial<Collection> | null>(null);
  const [editAv, setEditAv] = useState<Partial<Avatar> | null>(null);

  const dataQ = useQuery({
    queryKey: ["admin-avatars"],
    queryFn: async () => {
      const [cols, avs, levels, used] = await Promise.all([
        supabase.from("avatar_collections").select("*").order("sort_order"),
        supabase.from("avatars").select("*").order("sort_order"),
        supabase.from("levels").select("code, name_ar, sort_order").order("sort_order"),
        supabase.from("profiles").select("avatar_id"),
      ]);
      if (cols.error) throw cols.error;
      if (avs.error) throw avs.error;
      const usage = new Map<string, number>();
      (used.data ?? []).forEach((p: any) => {
        if (p.avatar_id) usage.set(p.avatar_id, (usage.get(p.avatar_id) ?? 0) + 1);
      });
      return {
        collections: (cols.data ?? []) as Collection[],
        avatars: (avs.data ?? []) as Avatar[],
        levels: levels.data ?? [],
        usage,
      };
    },
  });

  const collections = dataQ.data?.collections ?? [];
  const avatars = dataQ.data?.avatars ?? [];
  const levels = dataQ.data?.levels ?? [];
  const usage = dataQ.data?.usage ?? new Map<string, number>();

  const stats = useMemo(() => ({
    collections: collections.length,
    avatars: avatars.length,
    active: avatars.filter((a) => a.is_active).length,
    inUse: Array.from(usage.values()).reduce((s, n) => s + n, 0),
  }), [collections, avatars, usage]);

  const saveCol = useMutation({
    mutationFn: async (c: Partial<Collection>) => {
      const payload = {
        slug: (c.slug || "").trim(),
        name_ar: (c.name_ar || "").trim(),
        name_en: (c.name_en || "").trim(),
        required_level_code: c.required_level_code || levels[0]?.code || "bronze",
        border_css: c.border_css || null,
        sort_order: Number(c.sort_order ?? collections.length),
        is_active: c.is_active ?? true,
      };
      if (!payload.slug || !payload.name_ar) throw new Error("المعرّف والاسم العربي مطلوبان");
      if (c.id) {
        const { error } = await supabase.from("avatar_collections").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("avatar_collections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("تم الحفظ"); setEditCol(null); qc.invalidateQueries({ queryKey: ["admin-avatars"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAv = useMutation({
    mutationFn: async (a: Partial<Avatar>) => {
      const payload = {
        collection_id: a.collection_id!,
        name: (a.name || "").trim(),
        image_url: (a.image_url || "").trim(),
        sort_order: Number(a.sort_order ?? 0),
        is_active: a.is_active ?? true,
      };
      if (!payload.collection_id) throw new Error("اختر المجموعة");
      if (!payload.name || !payload.image_url) throw new Error("الاسم والصورة مطلوبان");
      if (a.id) {
        const { error } = await supabase.from("avatars").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("avatars").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("تم الحفظ"); setEditAv(null); qc.invalidateQueries({ queryKey: ["admin-avatars"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const quick = useMutation({
    mutationFn: async (op: { table: "avatars" | "avatar_collections"; id: string; patch: any }) => {
      const { error } = await supabase.from(op.table).update(op.patch).eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-avatars"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (op: { table: "avatars" | "avatar_collections"; id: string }) => {
      const { error } = await supabase.from(op.table).delete().eq("id", op.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-avatars"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function moveAvatar(list: Avatar[], a: Avatar, dir: -1 | 1) {
    const idx = list.findIndex((x) => x.id === a.id);
    const other = list[idx + dir];
    if (!other) return;
    quick.mutate({ table: "avatars", id: a.id, patch: { sort_order: other.sort_order } });
    quick.mutate({ table: "avatars", id: other.id, patch: { sort_order: a.sort_order } });
  }

  const nq = norm(q);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 grid place-items-center">
            <Sparkles size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">الأفاتار</h1>
            <p className="text-xs text-muted-foreground">مجموعات الشخصيات وشروط فتحها حسب المستوى</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dataQ.refetch()}>
            <RefreshCcw size={14} className="ml-1" /> تحديث
          </Button>
          <Button size="sm" className="bg-violet-500 hover:bg-violet-400 text-black"
            onClick={() => setEditCol({ is_active: true, sort_order: collections.length })}>
            <Plus size={14} className="ml-1" /> مجموعة جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="المجموعات" value={stats.collections} color="violet" />
        <Stat label="الأفاتارات" value={stats.avatars} color="cyan" />
        <Stat label="مفعّلة" value={stats.active} color="emerald" />
        <Stat label="مستخدمة من لاعبين" value={stats.inUse} color="amber" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="بحث باسم الأفاتار أو المجموعة…" value={q} onChange={(e) => setQ(e.target.value)} className="pr-9" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={onlyActive} onCheckedChange={setOnlyActive} /> المفعّل فقط
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataQ.isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
          ))}

          {collections.map((col) => {
            const list = avatars
              .filter((a) => a.collection_id === col.id)
              .filter((a) => (onlyActive ? a.is_active : true))
              .filter((a) => (nq ? norm(`${a.name} ${col.name_ar} ${col.name_en}`).includes(nq) : true));
            if (nq && list.length === 0 && !norm(`${col.name_ar} ${col.name_en} ${col.slug}`).includes(nq)) return null;
            const lvl = levels.find((l: any) => l.code === col.required_level_code);
            return (
              <div key={col.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 justify-between p-3 border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-lg grid place-items-center border border-white/10"
                      style={col.border_css ? { background: col.border_css } : undefined}>
                      <Images size={15} className="text-violet-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        {col.name_ar}
                        {!col.is_active && <Badge variant="outline" className="text-[10px]">مخفية</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span dir="ltr">{col.slug}</span>
                        <span className="inline-flex items-center gap-1"><Lock size={10} /> {lvl?.name_ar || col.required_level_code}</span>
                        <span className="inline-flex items-center gap-1"><UsersIcon size={10} /> {list.length} أفاتار</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={col.is_active}
                      onCheckedChange={(v) => quick.mutate({ table: "avatar_collections", id: col.id, patch: { is_active: v } })} />
                    <Button size="sm" variant="outline" onClick={() => setEditCol(col)}>تعديل</Button>
                    <Button size="sm" variant="outline"
                      onClick={() => setEditAv({ collection_id: col.id, is_active: true, sort_order: list.length })}>
                      <Plus size={13} className="ml-1" /> أفاتار
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-300"
                      onClick={() => { if (confirm(`حذف المجموعة "${col.name_ar}" وكل أفاتاراتها؟`)) del.mutate({ table: "avatar_collections", id: col.id }); }}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  {list.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">لا يوجد أفاتار في هذه المجموعة</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {list.map((a) => (
                        <div key={a.id} className={`rounded-lg border p-2 text-center transition ${a.is_active ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}>
                          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border border-white/10 bg-black/30">
                            <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="text-xs font-medium mt-1.5 truncate">{a.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {usage.get(a.id) ?? 0} لاعب
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-1.5">
                            <button className="p-1 rounded hover:bg-white/10" title="تقديم" onClick={() => moveAvatar(list, a, -1)}><ChevronUp size={12} /></button>
                            <button className="p-1 rounded hover:bg-white/10" title="تأخير" onClick={() => moveAvatar(list, a, 1)}><ChevronDown size={12} /></button>
                            <button className="p-1 rounded hover:bg-white/10" title="نسخ الرابط"
                              onClick={() => { navigator.clipboard.writeText(a.image_url); toast.success("تم نسخ الرابط"); }}><Copy size={12} /></button>
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-1.5">
                            <Switch checked={a.is_active}
                              onCheckedChange={(v) => quick.mutate({ table: "avatars", id: a.id, patch: { is_active: v } })} />
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setEditAv(a)}>تعديل</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-rose-300"
                              onClick={() => { if (confirm(`حذف "${a.name}"؟`)) del.mutate({ table: "avatars", id: a.id }); }}>
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!dataQ.isLoading && collections.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">لا توجد مجموعات أفاتار بعد</div>
          )}
        </CardContent>
      </Card>

      {/* Collection dialog */}
      <Dialog open={!!editCol} onOpenChange={(o) => !o && setEditCol(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editCol?.id ? "تعديل المجموعة" : "مجموعة جديدة"}</DialogTitle></DialogHeader>
          {editCol && (
            <div className="space-y-3">
              <Field label="المعرّف (slug)">
                <Input dir="ltr" value={editCol.slug ?? ""} onChange={(e) => setEditCol({ ...editCol, slug: e.target.value })} placeholder="legends" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="الاسم بالعربية">
                  <Input value={editCol.name_ar ?? ""} onChange={(e) => setEditCol({ ...editCol, name_ar: e.target.value })} />
                </Field>
                <Field label="الاسم بالإنجليزية">
                  <Input dir="ltr" value={editCol.name_en ?? ""} onChange={(e) => setEditCol({ ...editCol, name_en: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="المستوى المطلوب">
                  <select className="h-10 w-full rounded-lg bg-white/5 border border-white/10 px-2 text-sm"
                    value={editCol.required_level_code ?? levels[0]?.code ?? ""}
                    onChange={(e) => setEditCol({ ...editCol, required_level_code: e.target.value })}>
                    {levels.map((l: any) => <option key={l.code} value={l.code}>{l.name_ar} ({l.code})</option>)}
                  </select>
                </Field>
                <Field label="الترتيب">
                  <Input dir="ltr" type="number" value={editCol.sort_order ?? 0}
                    onChange={(e) => setEditCol({ ...editCol, sort_order: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="إطار المجموعة (CSS اختياري)">
                <Input dir="ltr" placeholder="linear-gradient(135deg,#22d3ee,#a78bfa)"
                  value={editCol.border_css ?? ""} onChange={(e) => setEditCol({ ...editCol, border_css: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editCol.is_active ?? true} onCheckedChange={(v) => setEditCol({ ...editCol, is_active: v })} />
                مفعّلة للعملاء
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCol(null)}>إلغاء</Button>
            <Button className="bg-violet-500 hover:bg-violet-400 text-black"
              onClick={() => saveCol.mutate(editCol!)} disabled={saveCol.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar dialog */}
      <Dialog open={!!editAv} onOpenChange={(o) => !o && setEditAv(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editAv?.id ? "تعديل الأفاتار" : "أفاتار جديد"}</DialogTitle></DialogHeader>
          {editAv && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-black/30 grid place-items-center flex-shrink-0">
                  {editAv.image_url ? <img src={editAv.image_url} alt="" className="w-full h-full object-cover" />
                    : <Images size={20} className="text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <MediaPicker value={editAv.image_url ?? null} folder="misc" label="صورة الأفاتار"
                    onPick={(url) => setEditAv({ ...editAv, image_url: url ?? "" })} />
                </div>
              </div>
              <Field label="رابط الصورة">
                <Input dir="ltr" value={editAv.image_url ?? ""} onChange={(e) => setEditAv({ ...editAv, image_url: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="الاسم">
                  <Input value={editAv.name ?? ""} onChange={(e) => setEditAv({ ...editAv, name: e.target.value })} />
                </Field>
                <Field label="الترتيب">
                  <Input dir="ltr" type="number" value={editAv.sort_order ?? 0}
                    onChange={(e) => setEditAv({ ...editAv, sort_order: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="المجموعة">
                <select className="h-10 w-full rounded-lg bg-white/5 border border-white/10 px-2 text-sm"
                  value={editAv.collection_id ?? ""}
                  onChange={(e) => setEditAv({ ...editAv, collection_id: e.target.value })}>
                  <option value="">— اختر —</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editAv.is_active ?? true} onCheckedChange={(v) => setEditAv({ ...editAv, is_active: v })} />
                ظاهر للعملاء
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAv(null)}>إلغاء</Button>
            <Button className="bg-violet-500 hover:bg-violet-400 text-black"
              onClick={() => saveAv.mutate(editAv!)} disabled={saveAv.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: "cyan" | "amber" | "emerald" | "violet" }) {
  const map = {
    cyan: "from-cyan-500/15 to-transparent border-cyan-500/25 text-cyan-300",
    amber: "from-amber-500/15 to-transparent border-amber-500/25 text-amber-300",
    emerald: "from-emerald-500/15 to-transparent border-emerald-500/25 text-emerald-300",
    violet: "from-violet-500/15 to-transparent border-violet-500/25 text-violet-300",
  } as const;
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${map[color]}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
