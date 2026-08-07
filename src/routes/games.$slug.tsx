import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogCategory } from "@/lib/gx/catalog.functions";
import type { CatalogCategoryChild, CatalogCategoryProductItem } from "@/lib/gx/catalog.functions";
import { useLang } from "@/lib/gx/i18n";
import { useCurrency } from "@/lib/gx/currency";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { BuyActions } from "@/components/gx/BuyActions";

export const Route = createFileRoute("/games/$slug")({
  loader: async ({ params }) => {
    let category = await getCatalogCategory({ data: { slug: params.slug } });
    if (!category && !params.slug.startsWith("gc-")) {
      category = await getCatalogCategory({ data: { slug: `gc-${params.slug}` } });
    }
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.category;
    const title = c ? `${c.nameEn || c.nameAr} — GX Store` : "Games — GX Store";
    const desc = c?.taglineEn || c?.taglineAr || "Browse game products at GX Store";
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
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <h1>{error.message}</h1>
        </div>
      </section>
    </StoreShell>
  ),
  notFoundComponent: () => (
    <StoreShell>
      <section className="section">
        <div className="wrap">
          <h1>404 — القسم غير موجود</h1>
        </div>
      </section>
    </StoreShell>
  ),
  component: GameCategoryPage,
});

function GameCategoryPage() {
  const { category } = Route.useLoaderData();
  const { lang, t } = useLang();
  const { format } = useCurrency();
  const pick = (ar?: string | null, en?: string | null) => (lang === "en" ? en || ar : ar || en) || "";

  const catName = pick(category.nameAr, category.nameEn);
  const catTagline = pick(category.taglineAr, category.taglineEn);
  const hasChildren = (category.children ?? []).length > 0;
  const hasProducts = (category.products ?? []).length > 0;

  return (
    <StoreShell>
      <section className="product-hero category-hero">
        <div className="wrap">
          <div className="product-hero-inner category-hero-inner fade-in">
            <div className="product-icon-badge">
              <div className="core">
                {category.iconImage ? (
                  <img
                    src={category.iconImage}
                    alt={catName}
                    style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 14 }}
                  />
                ) : (
                  <span style={{ fontSize: 36 }}>{category.icon || "🎮"}</span>
                )}
              </div>
            </div>
            <div className="product-hero-text">
              <span className="cat-tag">{catName}</span>
              <h1>{catName}</h1>
              {catTagline && <p>{catTagline}</p>}
            </div>
          </div>
        </div>
      </section>

      {hasChildren && (
        <section className="section">
          <div className="wrap">
            <div className="subcat-grid">
              {category.children.map((s: CatalogCategoryChild) => {
                const name = pick(s.nameAr, s.nameEn);
                const iconInner = s.iconImage ? (
                  <img src={s.iconImage} alt={name} className="prod-thumb-img" />
                ) : (
                  <span>{s.icon || "🎮"}</span>
                );
                return (
                  <Link
                    key={s.slug}
                    to="/games/$slug"
                    params={{ slug: s.slug }}
                    className="subcat-card clickable"
                  >
                    <div className="subcat-ic" style={{ background: s.bg || undefined }}>
                      {iconInner}
                    </div>
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
      )}

      {hasProducts && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="k">{t("home.browse_products")}</span>
                <h2>{catName}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {category.products.map((p: CatalogCategoryProductItem) => {
                const name = pick(p.nameAr, p.nameEn);
                const tagline = pick(p.taglineAr, p.taglineEn);
                const imgSrc = p.imageUrl || p.iconImage;
                return (
                  <div key={p.id} className="prod-card">
                    <div className="prod-thumb" style={{ background: p.thumbBg || undefined }}>
                      {p.badge && p.badge !== "none" && p.badge !== "off" && p.badge !== "بدون شارة" && (
                        <span className="tag-badge">{p.badge}</span>
                      )}
                      {imgSrc ? (
                        <img src={imgSrc} alt={name} className="prod-thumb-img prod-card-img" />
                      ) : (
                        <span style={{ fontSize: 44 }}>{p.icon || "🎮"}</span>
                      )}
                    </div>
                    <div className="prod-body">
                      <div className="prod-name">{name}</div>
                      {tagline && (
                        <p
                          className="text-xs text-cyan-100/60 line-clamp-2 mt-1 mb-2"
                          style={{ fontSize: 12, opacity: 0.75 }}
                        >
                          {tagline}
                        </p>
                      )}
                      {p.basePriceJod !== null && p.basePriceJod > 0 && (
                        <div className="prod-prices">
                          <span className="prod-new">{format(p.basePriceJod)}</span>
                        </div>
                      )}
                      <BuyActions cartId={p.cartId || p.slug} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {!hasChildren && !hasProducts && (
        <section className="section">
          <div className="wrap">
            <div className="text-center py-12 text-cyan-100/60">
              <div className="text-4xl mb-2">🎮</div>
              <p>لا توجد منتجات في هذا القسم حالياً.</p>
            </div>
          </div>
        </section>
      )}
    </StoreShell>
  );
}
