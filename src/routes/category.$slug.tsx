import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { CATEGORY_META, SUBCATEGORIES, getProductLink, getGiftCardLink } from "@/data/products";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryMeta, localizedSubcategory } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const m = CATEGORY_META[params.slug];
    const title = m ? `${m.name} — GX Store` : "Category — GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: m?.tagline || "Browse products at GX Store" },
        { property: "og:title", content: title },
        { property: "og:description", content: m?.tagline || "" },
      ],
        links: STORE_HEAD_LINKS,
    };
  },
  loader: ({ params }) => {
    if (!CATEGORY_META[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useLoaderData();
  const { lang, t } = useLang();
  const meta = localizedCategoryMeta(slug, CATEGORY_META[slug], lang);
  const subs = SUBCATEGORIES[slug] || [];
  const isGiftCards = slug === "gift-cards";

  return (
    <StoreShell>
      <section className="category-hero">
        <div className="wrap">
          <div className="category-hero-inner fade-in">
            <div className="category-hero-icon">{meta.icon}</div>
            <div className="category-hero-text">
              <h1>{meta.name}</h1>
              <p>{meta.tagline}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="subcat-grid">
            {subs.map((s0) => {
              const s = localizedSubcategory(s0, lang);
              const iconInner = s.iconImg ? (
                <img src={s.iconImg} alt={s.name} style={{ width: 44, height: 44, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
              ) : (
                <span>{s.icon}</span>
              );
              if (s.comingSoon) {
                return (
                  <div key={s.slug} className="subcat-card soon">
                    <span className="soon-badge">{t("cat.coming_soon")}</span>
                    <div className="subcat-ic" style={{ background: s.bg }}>{iconInner}</div>
                    <div>
                      <div className="subcat-name">{s.name}</div>
                      <div className="subcat-status" style={{ color: "var(--gray)" }}>{t("cat.pending_add")}</div>
                    </div>
                  </div>
                );
              }
              const href = isGiftCards ? getGiftCardLink(s.slug) : getProductLink(s.product || s.slug);
              return (
                <a key={s.slug} href={href} className="subcat-card clickable">
                  <div className="subcat-ic" style={{ background: s.bg }}>{iconInner}</div>
                  <div>
                    <div className="subcat-name">{s.name}</div>
                    <div className="subcat-status">{t("cat.browse_products")}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </StoreShell>
  );
}
