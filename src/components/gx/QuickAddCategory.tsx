import { useState } from "react";
import { Plus } from "lucide-react";
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
}

export function QuickAddCategory({ parentId = null, className, label }: QuickAddCategoryProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { lang } = useLang();
  
  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    descAr: "",
    descEn: "",
    taglineAr: "",
    taglineEn: "",
    pageTemplate: "standard",
    icon: "💎",
    accent: "#00e5ff",
    gradient: "linear-gradient(135deg,#00e5ff,#0091ff)"
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameAr && !form.nameEn) {
      toast.error(lang === "ar" ? "يرجى إدخال اسم القسم" : "Please enter a category name");
      return;
    }

    setLoading(true);
    try {
      const slug = (form.nameEn || form.nameAr)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 6);

      const { error } = await supabase.from("categories").insert({
        slug,
        name_ar: form.nameAr || form.nameEn,
        name_en: form.nameEn || form.nameAr,
        description_ar: form.descAr,
        description_en: form.descEn,
        tagline_ar: form.taglineAr,
        tagline_en: form.taglineEn,
        page_template: form.pageTemplate,
        icon: form.icon,
        accent_color: form.accent,
        theme_gradient: form.gradient,
        parent_id: parentId,
        is_main: parentId === null,
        is_active: true,
        sort_order: 999
      });

      if (error) throw error;

      toast.success(lang === "ar" ? "تمت الإضافة بنجاح" : "Added successfully");
      setOpen(false);
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
        gradient: "linear-gradient(135deg,#00e5ff,#0091ff)"
      });
      
      // Refresh both homepage and subcategory lists
      queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button 
        type="button"
        className={className} 
        onClick={() => setOpen(true)}
      >
        <div className="add-cat-plus">
          <Plus size={24} />
        </div>
        <div className="add-cat-label">{label || (lang === "ar" ? "إضافة قسم" : "Add Category")}</div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-[#0b1220] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "إضافة قسم جديد" : "Add New Category"}</DialogTitle>
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

            <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
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
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
