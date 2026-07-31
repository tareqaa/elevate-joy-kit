import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";

import { BuyActions } from "@/components/gx/BuyActions";
import { CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { FeatureAccordion, SectionHead } from "@/components/gx/Primitives";
import { useLang } from "@/lib/gx/i18n";
import { localizedProduct } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { DiscountBadge } from "@/components/gx/DiscountBadge";

export const Route = createFileRoute("/fortnite")({
  head: () => ({
    meta: [
      { title: "Fortnite — GX Store" },
      { name: "description", content: "Fortnite Crew subscription and V-Bucks — delivered to your Epic Games account." },
      { property: "og:title", content: "Fortnite — GX Store" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: FortnitePage,
});

function FortnitePage() {
  const { lang, t } = useLang();
  const p = localizedProduct(PRODUCTS_CATALOG.fortnite, lang);
  const { format } = useCurrency();



  return (
    <StoreShell>
      <section className="product-hero">
        <div className="wrap">
          <div className="product-hero-inner fade-in">
            <div className="product-icon-badge"><div className="core">{p.icon}</div></div>
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
          <SectionHead eyebrow={t("fn.crew_eyebrow")} title={t("fn.crew_title")} />
          <div className="plans-grid">
            {(p.crewPlans || []).map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              return (
                <div key={pl.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    {pl.tag && <span className="tag-badge">{pl.tag}</span>}
                    <DiscountBadge value={discount} />
                    <CrewIcon />
                  </div>
                  <div className="prod-body">
                    <div className="prod-name" style={{ minHeight: "auto", fontSize: 16 }}>{pl.label}</div>
                    <div className="prod-prices">
                      {pl.oldPrice && <span className="prod-old">{format(pl.oldPrice)}</span>}
                      <span className="prod-new">{format(pl.price)}</span>
                    </div>
                    <BuyActions cartId={pl.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <SectionHead eyebrow={t("fn.vb_eyebrow")} title={t("fn.vb_title")} />
          <div className="plans-grid">
            {(p.vbucksPlans || []).map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              const tier = parseInt(pl.id.replace("fn-vb-", ""), 10);
              return (
                <div key={pl.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    <DiscountBadge value={discount} />
                    <VbucksIcon tier={tier} />
                  </div>
                  <div className="prod-body">
                    <div className="prod-name" style={{ minHeight: "auto", fontSize: 15 }}>{pl.label}</div>
                    <div className="prod-prices">
                      {pl.oldPrice && <span className="prod-old">{format(pl.oldPrice)}</span>}
                      <span className="prod-new">{format(pl.price)}</span>
                    </div>
                    <BuyActions cartId={pl.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {p.features && p.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("fn.features_title")} />
            <FeatureAccordion features={p.features} />
          </div>
        </section>
      )}

      {p.delivery && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="delivery-box fade-in delivery-box-wide">
              <div className="dic">🔒</div>
              <div>
                <h3>{t("fn.delivery_title")}</h3>
                <p>{p.delivery.intro}</p>
                <div className="delivery-cols">
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.req_title")}</div>
                    <ul className="delivery-list">{p.delivery.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.safety_title")}</div>
                    <ul className="delivery-list">{p.delivery.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
                <div className="delivery-col-title" style={{ marginTop: 18 }}>{t("fn.platform_title")}</div>
                <ul className="delivery-list">{p.delivery.platformNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </StoreShell>
  );
}
