import { useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { ProductDialog } from "@/components/gx/admin/ProductsManager";

interface QuickAddProductProps {
  categoryId: string;
  className?: string;
  label?: string;
}

export function QuickAddProduct({ categoryId, className, label }: QuickAddProductProps) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();

  return (
    <>
      <button 
        type="button"
        className={className} 
        onClick={() => setOpen(true)}
      >
        <div className="subcat-ic admin-plus">
          <Plus size={24} />
        </div>
        <div>
          <div className="subcat-name">{label || (lang === "ar" ? "إضافة منتج" : "Add Product")}</div>
          <div className="subcat-status">{lang === "ar" ? "إضافة مباشرة هنا" : "Add directly here"}</div>
        </div>
      </button>

      {open && (
        <ProductDialog
          product={null}
          defaultCategoryId={categoryId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
