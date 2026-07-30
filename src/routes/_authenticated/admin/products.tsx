import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Layers, FolderTree } from "lucide-react";
import { CatalogPrices } from "@/components/gx/admin/CatalogPrices";
import { CategoryProducts } from "@/components/gx/admin/ProductsManager";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "المنتجات — لوحة التحكم" }] }),
  component: ProductsAdmin,
});

function ProductsAdmin() {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
            <Layers size={22} className="text-cyan-400" /> أسعار المتجر الحيّة
          </h1>
          <p className="text-sm text-cyan-100/60 mt-1">
            أضف منتجات جديدة وعدّل المنتجات الحالية، مع إدارة أسعار المتجر الحيّة من نفس الصفحة.
          </p>
        </div>
        <Link
          to="/admin/categories"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/10"
        >
          <FolderTree size={14} /> إدارة المنتجات داخل الأقسام
        </Link>
      </div>

      <CategoryProducts categoryId="all" categoryName="كل المنتجات" />
      <CatalogPrices />
    </div>
  );
}
