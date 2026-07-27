import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FolderTree, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({ meta: [{ title: "الأقسام — لوحة التحكم" }] }),
  component: CategoriesAdmin,
});

type Category = {
  id: string; slug: string; name_ar: string; name_en: string;
  icon_url: string | null; sort_order: number; is_active: boolean;
};

const css = `
.gx-cats{color:#e6f7ff}
.gx-cats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.gx-cat-card{background:linear-gradient(180deg,rgba(16,24,32,.85),rgba(10,15,22,.9));border:1px solid rgba(0,229,255,.15);border-radius:16px;padding:14px;transition:all .2s;position:relative}
.gx-cat-card:hover{border-color:rgba(0,229,255,.4);box-shadow:0 8px 24px rgba(0,229,255,.12);transform:translateY(-2px)}
.gx-cat-card.off{opacity:.55}
.gx-cat-icon{width:56px;height:56px;border-radius:14px;background:rgba(0,229,255,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,229,255,.2)}
.gx-cat-icon img{width:100%;height:100%;object-fit:cover}
.gx-cat-name{font-size:16px;font-weight:800;color:#e6f7ff;margin-top:8px}
.gx-cat-slug{font-size:12px;color:#7d92a8;font-family:ui-monospace,monospace;direction:ltr}
.gx-cat-actions{display:flex;gap:6px;margin-top:10px}
.gx-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid transparent}
.gx-btn.primary{background:linear-gradient(135deg,#00e5ff,#0091ff);color:#001018}
.gx-btn.primary:hover{box-shadow:0 4px 14px rgba(0,229,255,.35)}
.gx-btn.outline{border-color:rgba(0,229,255,.28);color:#00e5ff;background:transparent}
.gx-btn.outline:hover{background:rgba(0,229,255,.08)}
.gx-btn.danger{border-color:rgba(255,80,80,.35);color:#ff8080;background:transparent}
.gx-btn.danger:hover{background:rgba(255,80,80,.1)}
.gx-adm-input{background:rgba(0,0,0,.35)!important;border:1px solid rgba(0,229,255,.18)!important;color:#e6f7ff!important;border-radius:12px!important;height:40px}
.gx-adm-input:focus-visible{outline:none;border-color:rgba(0,229,255,.55)!important;box-shadow:0 0 0 3px rgba(0,229,255,.15)!important}
.gx-sort{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.4);color:#00e5ff;font-family:ui-monospace,monospace;font-size:11px;padding:2px 7px;border-radius:6px}
`;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order").order("name_ar");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="gx-cats space-y-4" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
            <FolderTree size={22} className="text-cyan-400" /> الأقسام
          </h1>
          <p className="text-sm text-cyan-100/60 mt-1">أضف وعدّل أقسام المتجر — ترتيب الظهور والحالة</p>
        </div>
        <button className="gx-btn primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> قسم جديد
        </button>
      </div>

      {q.isLoading ? (
        <div className="text-center py-20 text-cyan-100/60">جاري التحميل...</div>
      ) : (q.data ?? []).length === 0 ? (
        <div className="text-center py-20 text-cyan-100/60">
          <FolderTree size={48} className="mx-auto opacity-30 mb-3" />
          <p>لا يوجد أقسام بعد. ابدأ بإضافة قسم أول.</p>
        </div>
      ) : (
        <div className="gx-cats-grid">
          {(q.data ?? []).map((c) => (
            <div key={c.id} className={`gx-cat-card ${c.is_active ? "" : "off"}`}>
              <div className="gx-sort"><GripVertical size={10} className="inline" /> {c.sort_order}</div>
              <div className="flex items-start gap-3">
                <div className="gx-cat-icon">
                  {c.icon_url ? <img src={c.icon_url} alt="" /> : <FolderTree size={24} className="text-cyan-400/60" />}
                </div>
                <div className="flex-1">
                  <div className="gx-cat-name">{c.name_ar}</div>
                  <div className="text-xs text-cyan-100/70">{c.name_en}</div>
                  <div className="gx-cat-slug mt-1">/{c.slug}</div>
                </div>
              </div>
              <div className="gx-cat-actions">
                <button className="gx-btn outline" onClick={() => setEditing(c)}><Pencil size={12} /> تعديل</button>
                <button className="gx-btn outline" onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })} title={c.is_active ? "إخفاء" : "إظهار"}>
                  {c.is_active ? <><Eye size={12} /> ظاهر</> : <><EyeOff size={12} /> مخفي</>}
                </button>
                <button className="gx-btn danger" onClick={() => { if (confirm(`حذف "${c.name_ar}"؟`)) deleteMut.mutate(c.id); }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <CategoryDialog
          category={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ["admin-categories"] }); }}
        />
      )}
    </div>
  );
}

function CategoryDialog({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [nameAr, setNameAr] = useState(category?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(category?.name_en ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [iconUrl, setIconUrl] = useState(category?.icon_url ?? "");
  const [sortOrder, setSortOrder] = useState<number>(category?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(category?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!nameAr.trim() || !nameEn.trim()) { toast.error("الاسم بالعربي والإنجليزي مطلوبين"); return; }
    const finalSlug = slug.trim() || slugify(nameEn);
    if (!finalSlug) { toast.error("المعرّف (slug) مطلوب"); return; }
    setSaving(true);
    try {
      const payload = {
        slug: finalSlug, name_ar: nameAr.trim(), name_en: nameEn.trim(),
        icon_url: iconUrl.trim() || null, sort_order: sortOrder, is_active: isActive,
      };
      if (category) {
        const { error } = await supabase.from("categories").update(payload).eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
      toast.success(category ? "تم التحديث" : "تمت الإضافة");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File) {
    const ext = file.name.split(".").pop();
    const path = `categories/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setIconUrl(data.publicUrl);
    toast.success("تم رفع الأيقونة");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{category ? "تعديل قسم" : "قسم جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الاسم (عربي)</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="gx-adm-input" />
            </div>
            <div>
              <Label>الاسم (English)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="gx-adm-input" dir="ltr" />
            </div>
          </div>
          <div>
            <Label>المعرّف (slug)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(nameEn) || "gaming"} className="gx-adm-input" dir="ltr" />
          </div>
          <div>
            <Label>الأيقونة</Label>
            <div className="flex items-center gap-3">
              {iconUrl && <img src={iconUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-cyan-400/20" />}
              <div className="flex-1 space-y-2">
                <Input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="رابط الصورة أو ارفع ملف" className="gx-adm-input" dir="ltr" />
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-xs text-cyan-100/70" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ترتيب الظهور</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className="gx-adm-input" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-cyan-400 w-4 h-4" />
                <span className="text-sm">مفعّل</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button className="gx-btn outline" onClick={onClose}>إلغاء</button>
            <button className="gx-btn primary" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
