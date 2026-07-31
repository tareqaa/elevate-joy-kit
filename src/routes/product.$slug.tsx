import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { ProductIcon } from "@/lib/gx/brand-icons";
import { BuyActions } from "@/components/gx/BuyActions";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";
import { useLang } from "@/lib/gx/i18n";
import { localizedProduct } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { DiscountBadge } from "@/components/gx/DiscountBadge";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const p = PRODUCTS_CATALOG[params.slug];
    const title = p ? `${p.name} — GX Store` : "Product — GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: p?.description || "GX Store digital product" },
        { property: "og:title", content: title },
        { property: "og:description", content: p?.description || "" },
      ],
        links: STORE_HEAD_LINKS,
    };
  },
  loader: ({ params }) => {
    if (!PRODUCTS_CATALOG[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useLoaderData();
  const { lang, t } = useLang();
  const p = localizedProduct(PRODUCTS_CATALOG[slug], lang);
  const { format } = useCurrency();

  return (
    <StoreShell>
      <section className="product-hero">
        <div className="wrap">
          <div className="product-hero-inner fade-in">
            <div className="product-icon-badge">
              <div className="core"><ProductIcon product={p} /></div>
            </div>
            <div className="product-hero-text">
              <span className="cat-tag">{p.category}</span>
              <h1>{p.tagline}</h1>
              <p>{p.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
          <div className="plans-grid">
            {(p.plans || []).map((plan) => {
              const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
              return (
                <div key={plan.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    {plan.tag && <span className="tag-badge">{plan.tag}</span>}
                    <DiscountBadge value={discount} />
                    <ProductIcon product={p} />
                  </div>
                  <div className="prod-body">
                    <div className="prod-name" style={{ minHeight: "auto", fontSize: 16 }}>{plan.label}</div>
                    <div className="prod-prices">
                      {plan.oldPrice && <span className="prod-old">{format(plan.oldPrice)}</span>}
                      <span className="prod-new">{format(plan.price)}</span>
                    </div>
                    <BuyActions cartId={plan.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {p.features && p.features.length > 0 && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("product.features_title")} sub={t("product.features_sub")} />
            <FeatureAccordion features={p.features} />
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <DeliveryBox method={p.deliveryMethod} identifierLabel={p.identifierLabel} />
        </div>
      </section>
    </StoreShell>
  );
}
