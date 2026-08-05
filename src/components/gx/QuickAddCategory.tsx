import { useState, useEffect } from "react";
import { Plus, Trash2, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/gx/i18n";

interface QuickAddCategoryProps {
  parentId?: string | null;
  className?: string;
  label?: string;
  category?: any; // If provided, we are in Edit mode
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function QuickAddCategory({ parentId = null, className, label, category, onClose, trigger }: QuickAddCategoryProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { lang, t } = useLang();
  
  const [form, setForm] = useState({
    nameAr: category?.name_ar || "",
    nameEn: category?.name_en || "",
    descAr: category?.description_ar || "",
    descEn: category?.description_en || "",
    taglineAr: category?.tagline_ar || "",
    taglineEn: category?.tagline_en || "",
    pageTemplate: category?.page_template || "standard",
    icon: category?.icon || "💎",
    accent: category?.accent_color || "#00e5ff",
    gradient: category?.theme_gradient || "linear-gradient(135deg,#00e5ff,#0091ff)",
    imageUrl: category?.icon_url || ""
  });

  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `categories/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("category-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("category-images").getPublicUrl(path);
      setForm(f => ({ ...f, imageUrl: data.publicUrl }));
      toast.success(lang === "ar" ? "تم رفع الصورة" : "Image uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }


  useEffect(() => {
    if (open) {
      setForm({
        nameAr: category?.name_ar || category?.nameAr || "",
        nameEn: category?.name_en || category?.nameEn || "",
        descAr: category?.description_ar || category?.descriptionAr || "",
        descEn: category?.description_en || category?.descriptionEn || "",
        taglineAr: category?.tagline_ar || category?.taglineAr || "",
        taglineEn: category?.tagline_en || category?.taglineEn || "",
        pageTemplate: category?.page_template || category?.pageTemplate || "standard",
        icon: category?.icon || "💎",
        accent: category?.accent_color || category?.accentColor || "#00e5ff",
        gradient: category?.theme_gradient || category?.themeGradient || "linear-gradient(135deg,#00e5ff,#0091ff)",
        imageUrl: category?.icon_url || category?.iconImage || ""
      });
    } else if (!category) {
      setForm({
        nameAr: "",
        nameEn: "",
        descAr: "",
        descEn: "",
        taglineAr: "",
        taglineEn: "",
        pageTemplate: "standard",
        icon: "💎",
        accent: "#00e5ff",
        gradient: "linear-gradient(135deg,#00e5ff,#0091ff)",
        imageUrl: ""
      });
    }
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameAr && !form.nameEn) {
      toast.error(lang === "ar" ? "يرجى إدخال اسم القسم" : "Please enter a category name");
      return;
    }

    setLoading(true);
    try {
      const slug = category?.slug || (form.nameEn || form.nameAr)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 6);

      const payload = {
        name_ar: form.nameAr || form.nameEn,
        name_en: form.nameEn || form.nameAr,
        description_ar: form.descAr,
        description_en: form.descEn,
        tagline_ar: form.taglineAr,
        tagline_en: form.taglineEn,
        page_template: form.pageTemplate,
        icon: form.icon,
        icon_url: form.imageUrl,
        accent_color: form.accent,
        theme_gradient: form.gradient,
        parent_id: parentId,
        is_main: category ? !!category.is_main : (parentId === null),
        is_active: true,
      };

      let error;
      if (category?.id) {
        const { error: err } = await supabase.from("categories").update(payload as any).eq("id", category.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("categories").insert({
          ...payload,
          slug,
          sort_order: 999
        } as any);
        error = err;
      }

      if (error) throw error;

      toast.success(lang === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setOpen(false);
      onClose?.();
      
      // Refresh both homepage and subcategory lists
      queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories-list"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!category?.id) return;
    const confirmMsg = lang === "ar" 
      ? "هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات والأقسام الفرعية المرتبطة به!" 
      : "Are you sure you want to delete this category? All linked products and sub-categories will be deleted!";
    
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", category.id);
      if (error) throw error;
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
      setOpen(false);
      onClose?.();
      queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-block"
        >
          {trigger}
        </div>
      ) : (
        <button 
          type="button"
          className={className || "subcat-card edit-parent-btn"} 
          style={!className ? { border: "1px dashed rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", borderRadius: "16px", cursor: "pointer" } : undefined}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {className === "cat-card-big add-category-card" ? (
            <>
              <div className="add-cat-plus"><Plus size={24} /></div>
              <div className="add-cat-label">{label || (lang === "ar" ? "إضافة قسم" : "Add Category")}</div>
            </>
          ) : (
            <>
              <Settings size={20} style={{ color: "#00e5ff", marginBottom: 8 }} />
              <div className="subcat-name" style={{ color: "#00e5ff" }}>{label || (lang === "ar" ? "إعدادات القسم" : "Category Settings")}</div>
            </>
          )}
        </button>
      )}

      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) onClose?.(); }}>
        <DialogContent className="max-w-md bg-[#0b1220] border-white/10 text-white overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{category ? (lang === "ar" ? "تعديل القسم" : "Edit Category") : (lang === "ar" ? "إضافة قسم جديد" : "Add New Category")}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs opacity-60">الاسم (بالعربي)</Label>
                <Input 
                  value={form.nameAr} 
                  onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs opacity-60">Name (English)</Label>
                <Input 
                  value={form.nameEn} 
                  onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs opacity-60">الوصف (اختياري)</Label>
                <Input 
                  value={form.descAr} 
                  onChange={e => setForm(f => ({ ...f, descAr: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs opacity-60">Description (Optional)</Label>
                <Input 
                  value={form.descEn} 
                  onChange={e => setForm(f => ({ ...f, descEn: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs opacity-60">Tagline (بالعربي)</Label>
                <Input 
                  value={form.taglineAr} 
                  onChange={e => setForm(f => ({ ...f, taglineAr: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs opacity-60">Tagline (English)</Label>
                <Input 
                  value={form.taglineEn} 
                  onChange={e => setForm(f => ({ ...f, taglineEn: e.target.value }))}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs opacity-60">{lang === 'ar' ? 'قالب الصفحة' : 'Page Template'}</Label>
              <select 
                value={form.pageTemplate}
                onChange={e => setForm(f => ({ ...f, pageTemplate: e.target.value }))}
                className="w-full h-9 bg-white/5 border-white/10 rounded-md text-sm px-2 text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value="standard">{lang === 'ar' ? 'الافتراضي (شبكة منتجات)' : 'Standard (Product Grid)'}</option>
                <option value="gift_card">{lang === 'ar' ? 'بطاقات هدايا (تصنيف حسب المنطقة)' : 'Gift Card (Region Grouped)'}</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs opacity-60">{lang === "ar" ? "أيقونة" : "Icon"}</Label>
                <Input 
                  value={form.icon} 
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="bg-white/5 border-white/10 text-center text-lg"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs opacity-60">{lang === "ar" ? "لون التمييز" : "Accent Color"}</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={form.accent} 
                    onChange={e => setForm(f => ({ ...f, accent: e.target.value }))}
                    className="w-12 h-9 p-1 bg-white/5 border-white/10 cursor-pointer"
                  />
                  <Input 
                    value={form.accent} 
                    onChange={e => setForm(f => ({ ...f, accent: e.target.value }))}
                    className="flex-1 bg-white/5 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs opacity-60">{lang === "ar" ? "رابط الصورة (اختياري)" : "Image URL (Optional)"}</Label>
              <Input 
                value={form.imageUrl} 
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
              {form.imageUrl && (
                <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-between gap-3">
              {category && (
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  {deleting ? "..." : (lang === "ar" ? "حذف القسم" : "Delete")}
                </button>
              )}
              <div className="flex gap-3 ms-auto">
                <button 
                  type="button" 
                  className="px-4 py-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
                  onClick={() => setOpen(false)}
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-6 py-2 bg-[#00e5ff] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50"
                >
                  {loading ? "..." : (lang === "ar" ? "حفظ" : "Save")}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}