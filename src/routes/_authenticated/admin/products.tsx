import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers, FolderTree, ShoppingBag, Tag } from "lucide-react";
import { CatalogPrices } from "@/components/gx/admin/CatalogPrices";
import { CategoryProducts } from "@/components/gx/admin/ProductsManager";
import { CategoriesManager } from "@/routes/_authenticated/admin/categories";

type Tab = "products" | "categories" | "prices";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({ meta: [{ title: "الكتالوج — لوحة التحكم" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => {
    const t = search.tab;
    return t === "categories" || t === "prices" || t === "products" ? { tab: t } : {};
  },
  component: CatalogAdmin,
});

const TABS: { id: Tab; label: string; Icon: typeof Layers }[] = [
  { id: "products", label: "المنتجات", Icon: ShoppingBag },
  { id: "categories", label: "الأقسام", Icon: FolderTree },
  { id: "prices", label: "أسعار المتجر", Icon: Tag },
];

function CatalogAdmin() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const active: Tab = tab ?? "products";

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-cyan-100 flex items-center gap-2">
          <Layers size={22} className="text-cyan-400" /> الكتالوج
        </h1>
        <p className="text-sm text-cyan-100/60 mt-1">
          إدارة المنتجات والأقسام وأسعار المتجر الحيّة من مكان واحد.
        </p>
      </div>

      <div className="gx-adm-tabs flex items-center gap-2 p-1 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03]">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate({ to: "/admin/products", search: { tab: t.id } })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                on
                  ? "bg-cyan-400/15 text-cyan-200 border border-cyan-400/40"
                  : "text-cyan-100/60 border border-transparent hover:text-cyan-200 hover:bg-cyan-400/[0.06]"
              }`}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {active === "products" && <CategoryProducts categoryId="all" categoryName="كل المنتجات" />}
      {active === "categories" && <CategoriesManager />}
      {active === "prices" && <CatalogPrices />}
    </div>
  );
}
