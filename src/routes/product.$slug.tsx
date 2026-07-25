import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { ProductIcon } from "@/lib/gx/brand-icons";
import { BuyActions } from "@/components/gx/BuyActions";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const p = PRODUCTS_CATALOG[params.slug];
    const title = p ? `${p.name} — GX Store` : "منتج — GX Store";
    return {
      meta: [
        { title },
        { name: "description", content: p?.description || "منتج رقمي على GX Store" },
        { property: "og:title", content: title },
        { property: "og:description", content: p?.description || "" },
      ],
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
  const p = PRODUCTS_CATALOG[slug];
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
          <SectionHead eyebrow="الباقات" title="اختار الباقة اللي تناسبك" />
          <div className="plans-grid">
            {(p.plans || []).map((plan) => {
              const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
              return (
                <div key={plan.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    {plan.tag && <span className="tag-badge">{plan.tag}</span>}
                    {discount > 0 && <span className="discount-badge">-{discount}%</span>}
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
            <SectionHead eyebrow="المميزات" title="شو رح تحصل عليه بالضبط" sub="اضغط على أي ميزة لتشوف تفاصيلها" />
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
