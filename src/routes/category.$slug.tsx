import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { StoreShell } from "@/components/gx/StoreShell";
import { getCatalogCategory } from "@/lib/gx/catalog.functions";
import type { CatalogCategoryChild } from "@/lib/gx/catalog.functions";
import { useLang } from "@/lib/gx/i18n";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useIsAdmin } from "@/lib/gx/admin-auth";
import { QuickAddCategory } from "@/components/gx/QuickAddCategory";
import { Plus, PackagePlus, Settings } from "lucide-react";
import { QuickAddProduct } from "@/components/gx/QuickAddProduct";

import { RichHtml } from "@/lib/gx/sections/rich-text";

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
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pick = (ar: string | null, en: string | null) => (lang === "en" ? en || ar : ar || en) || "";

  if (category.pageTemplate === "gift_card") {
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
            <div className="category-rich-desc">
              <RichHtml html={pick(category.descriptionAr, category.descriptionEn)} />
            </div>
            
            <div className="gift-card-grouped-grid">
              {/* Note: In gift_card layout, sub-categories are treated as Regions */}
              {category.children.map((s: CatalogCategoryChild) => (
                <div key={s.slug} className="gift-card-region-group">
                  <h2 className="region-title">
                    {s.icon && <span className="region-flag">{s.icon}</span>}
                    {pick(s.nameAr, s.nameEn)}
                  </h2>
                  <div className="denomination-grid">
                    {/* Real products would be fetched here or passed in children. 
                        Reusing the existing gift-card denim pattern if applicable. */}
                    {s.productSlug ? (
                      <Link to="/product/$slug" params={{ slug: s.productSlug }} className="denom-card">
                        <div className="denom-val">{pick(s.nameAr, s.nameEn)}</div>
                        <div className="denom-browse">{t("cat.browse_products")}</div>
                      </Link>
                    ) : (
                      <div className="denom-card soon" style={{ position: "relative" }}>
                        {isAdmin && (
                          <QuickAddCategory
                            category={{
                              id: s.id,
                              slug: s.slug,
                              name_ar: s.nameAr,
                              name_en: s.nameEn,
                              description_ar: s.descriptionAr,
                              description_en: s.descriptionEn,
                              tagline_ar: s.taglineAr,
                              tagline_en: s.taglineEn,
                              page_template: s.pageTemplate,
                              icon: s.icon,
                              icon_url: s.iconImage,
                            }}
                            onClose={() => queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] })}
                            trigger={
                              <div 
                                className="admin-cat-edit-btn" 
                                style={{ position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 20, width: 28, height: 28, borderRadius: "50%", background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,229,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00e5ff", cursor: "pointer" }}
                              >
                                <Settings size={12} />
                              </div>
                            }
                          />
                        )}
                        <div className="denom-val">{pick(s.nameAr, s.nameEn)}</div>
                        <div className="denom-browse">{t("cat.coming_soon")}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAdmin && (
                <div className="subcat-admin-tools" style={{ marginTop: 40 }}>
                  <QuickAddCategory 
                    parentId={category.id} 
                    className="subcat-card add-subcat-btn"
                    label={lang === "ar" ? "إضافة منطقة / نوع" : "Add Region / Type"}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </StoreShell>
    );
  }

  // Layout A — Standard Catalog
  return (
    <StoreShell>
      <section className="category-hero">
        <div className="wrap">
            <div className="category-hero-inner fade-in" style={{ position: "relative" }}>
              {isAdmin && (
                <QuickAddCategory
                  category={category}
                  onClose={() => queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] })}
                  trigger={
                    <div 
                      className="gx-btn outline" 
                      style={{ position: "absolute", top: 0, insetInlineEnd: 0, background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)", zIndex: 10, cursor: "pointer" }}
                    >
                      <Settings size={14} /> {lang === "ar" ? "تعديل القسم" : "Edit Category"}
                    </div>
                  }
                />
              )}
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
            {category.children.map((s: CatalogCategoryChild) => {
              const name = pick(s.nameAr, s.nameEn);
              const iconInner = s.iconImage ? (
                <img src={s.iconImage} alt={name} style={{ width: 44, height: 44, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
              ) : (
                <span>{s.icon}</span>
              );
              if (!s.productSlug) {
                return (
                  <div key={s.slug} className="subcat-card soon" style={{ position: "relative" }}>
                    {isAdmin && (
                      <QuickAddCategory
                        category={{
                          id: s.id,
                          slug: s.slug,
                          name_ar: s.nameAr,
                          name_en: s.nameEn,
                          description_ar: s.descriptionAr,
                          description_en: s.descriptionEn,
                          tagline_ar: s.taglineAr,
                          tagline_en: s.taglineEn,
                          page_template: s.pageTemplate,
                          icon: s.icon,
                          icon_url: s.iconImage,
                        }}
                        onClose={() => queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] })}
                        trigger={
                          <div 
                            className="admin-cat-edit-btn" 
                            style={{ position: "absolute", top: 8, insetInlineEnd: 8, zIndex: 20, width: 28, height: 28, borderRadius: "50%", background: "rgba(10,15,22,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,229,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00e5ff", cursor: "pointer" }}
                          >
                            <Settings size={12} />
                          </div>
                        }
                      />
                    )}
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
            
            {isAdmin && (
              <div className="subcat-admin-tools">
                <QuickAddCategory 
                  parentId={category.id} 
                  className="subcat-card add-subcat-btn"
                  label={lang === "ar" ? "إضافة قسم فرعي" : "Add Sub-category"}
                />
                
                <QuickAddProduct
                  categoryId={category.id}
                  className="subcat-card add-product-btn"
                  label={lang === "ar" ? "إضافة منتج" : "Add Product"}
                />

                <QuickAddCategory
                  onClose={() => queryClient.invalidateQueries({ queryKey: ["storefront-root-categories"] })}
                  category={{
                    id: category.id,
                    slug: category.slug,
                    name_ar: category.nameAr,
                    name_en: category.nameEn,
                    description_ar: category.descriptionAr,
                    description_en: category.descriptionEn,
                    tagline_ar: category.taglineAr,
                    tagline_en: category.taglineEn,
                    page_template: category.pageTemplate,
                    icon: category.icon,
                    accent_color: category.accentColor,
                    theme_gradient: category.themeGradient,
                  }}
                />
              </div>
            )}

          </div>
        </div>
      </section>
    </StoreShell>
  );
}
