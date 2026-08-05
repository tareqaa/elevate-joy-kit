import { useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/gx/i18n";
import { ProductDialog } from "@/components/gx/admin/ProductsManager";

interface QuickAddProductProps {
  categoryId: string;
  className?: string;
  label?: string;
  product?: any;
  open?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function QuickAddProduct({ categoryId, className, label, product, open: controlledOpen, onClose, trigger }: QuickAddProductProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const setOpen = (val: boolean) => {
    if (controlledOpen !== undefined) {
      if (!val) onClose?.();
    } else {
      setInternalOpen(val);
    }
  };
  
  const { lang } = useLang();

  const defaultTrigger = (
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
  );

  return (
    <>
      {controlledOpen === undefined && (
        trigger ? (
          <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
            {trigger}
          </div>
        ) : defaultTrigger
      )}

      {open && (
        <ProductDialog
          product={product || null}
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