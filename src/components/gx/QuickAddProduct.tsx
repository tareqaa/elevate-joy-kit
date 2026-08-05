import { useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { ProductDialog } from "@/components/gx/admin/ProductsManager";

interface QuickAddProductProps {
  categoryId: string;
  className?: string;
  label?: string;
}

export function QuickAddProduct({ categoryId, className, label, product }: QuickAddProductProps & { product?: any }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();

  const trigger = (
      {controlledOpen === undefined && trigger}
  );

  return (
    <>
      {controlledOpen === undefined && ( 
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
      )}

      {open && (
        <ProductDialog
          product={product || null}
          defaultCategoryId={categoryId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            // We use reload to reflect new product in category list without complex cache management for nested loaders
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
