import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogCategory } from "@/lib/gx/catalog.functions";
import { useLang } from "@/lib/gx/i18n";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const category = await getCatalogCategory({ data: { slug: params.slug } });
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.category;
    const title = c ? `${c.nameEn || c.nameAr} — GX Store` : "Category — GX Store";
    const desc = c?.taglineEn || c?.taglineAr || "Browse products at GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: STORE_HEAD_LINKS,
    };
  },
  errorComponent: ({ error }) => (
    <StoreShell><section className="section"><div className="wrap"><h1>{error.message}</h1></div></section></StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell><section className="section"><div className="wrap"><h1>404</h1></div></section></StoreShell>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { lang, t } = useLang();
  const pick = (ar: string | null, en: string | null) => (lang === "en" ? en || ar : ar || en) || "";

  return (
    <StoreShell>
      <section className="category-hero">
        <div className="wrap">
          <div className="category-hero-inner fade-in">
            <div className="category-hero-icon">{category.icon}</div>
            <div className="category-hero-text">
              <h1>{pick(category.nameAr, category.nameEn)}</h1>
              <p>{pick(category.taglineAr, category.taglineEn)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="subcat-grid">
            {category.children.map((s) => {
              const name = pick(s.nameAr, s.nameEn);
              const iconInner = s.iconImage ? (
                <img src={s.iconImage} alt={name} style={{ width: 44, height: 44, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
              ) : (
                <span>{s.icon}</span>
              );
              if (!s.productSlug) {
                return (
                  <div key={s.slug} className="subcat-card soon">
                    <span className="soon-badge">{t("cat.coming_soon")}</span>
                    <div className="subcat-ic" style={{ background: s.bg || undefined }}>{iconInner}</div>
                    <div>
                      <div className="subcat-name">{name}</div>
                      <div className="subcat-status" style={{ color: "var(--gray)" }}>{t("cat.pending_add")}</div>
                    </div>
                  </div>
                );
              }
              return (
                <Link key={s.slug} to="/product/$slug" params={{ slug: s.productSlug }} className="subcat-card clickable">
                  <div className="subcat-ic" style={{ background: s.bg || undefined }}>{iconInner}</div>
                  <div>
                    <div className="subcat-name">{name}</div>
                    <div className="subcat-status">{t("cat.browse_products")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
