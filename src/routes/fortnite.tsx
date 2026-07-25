import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { BuyActions } from "@/components/gx/BuyActions";
import { CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { FeatureAccordion, SectionHead } from "@/components/gx/Primitives";

export const Route = createFileRoute("/fortnite")({
  head: () => ({
    meta: [
      { title: "فورت نايت — GX Store" },
      { name: "description", content: "اشتراك Fortnite Crew ورصيد V-Bucks — يوصلك على حساب Epic Games مباشرة." },
      { property: "og:title", content: "فورت نايت — GX Store" },
    ],
  }),
  component: FortnitePage,
});

function FortnitePage() {
  const p = PRODUCTS_CATALOG.fortnite;
  const { format } = useCurrency();
  const cart = useCart();
  const [customVb, setCustomVb] = useState("");
  const [customFlash, setCustomFlash] = useState(false);

  function submitCustom() {
    const amount = parseInt(customVb, 10);
    if (!amount || amount <= 0) return;
    cart.addCustom({ name: `V-Bucks — كمية مخصصة (${amount.toLocaleString("en-US")})`, icon: "🪙", bg: p.thumbBg, price: 0 });
    cart.setNotes((cart.notes ? cart.notes + "\n" : "") + `طلب كمية V-Bucks مخصصة: ${amount.toLocaleString("en-US")} وحدة — الرجاء تأكيد السعر`);
    setCustomFlash(true);
    setCustomVb("");
    setTimeout(() => setCustomFlash(false), 1600);
  }

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
          <SectionHead eyebrow="Fortnite Crew" title="اشتراك الكرو الشهري" />
          <div className="plans-grid">
            {(p.crewPlans || []).map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              return (
                <div key={pl.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    {pl.tag && <span className="tag-badge">{pl.tag}</span>}
                    {discount > 0 && <span className="discount-badge">-{discount}%</span>}
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
          <SectionHead eyebrow="V-Bucks" title="اشحن رصيد V-Bucks" />
          <div className="plans-grid">
            {(p.vbucksPlans || []).map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              const tier = parseInt(pl.id.replace("fn-vb-", ""), 10);
              return (
                <div key={pl.id} className="prod-card">
                  <div className="prod-thumb" style={{ background: p.thumbBg }}>
                    {discount > 0 && <span className="discount-badge">-{discount}%</span>}
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
          <div className="delivery-box fade-in" style={{ marginTop: 24 }}>
            <div className="dic">🪙</div>
            <div style={{ flex: 1 }}>
              <h3>كمية V-Bucks مخصصة</h3>
              <p>اكتب الكمية اللي بدك ياها ومنأكدلك السعر عالواتساب.</p>
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <input
                  type="number" min={1}
                  value={customVb}
                  onChange={(e) => setCustomVb(e.target.value)}
                  className="uname-input"
                  placeholder="مثال: 5000"
                  style={{ flex: "1 1 200px", minWidth: 180 }}
                />
                <button type="button" className={"btn btn-primary" + (customFlash ? " added" : "")} onClick={submitCustom}>
                  {customFlash ? "✓ أضيفت — بنأكدلك السعر" : "أضف الكمية المخصصة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {p.features && p.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow="المميزات" title="شو يشمل الاشتراك" />
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
                <h3>كيف توصلك الباقة؟</h3>
                <p>{p.delivery.intro}</p>
                <div className="delivery-cols">
                  <div className="delivery-col">
                    <div className="delivery-col-title">📋 المطلوب منك بعد الطلب</div>
                    <ul className="delivery-list">{p.delivery.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="delivery-col">
                    <div className="delivery-col-title">🛡️ الأمان والموثوقية</div>
                    <ul className="delivery-list">{p.delivery.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
                <div className="delivery-col-title" style={{ marginTop: 18 }}>🎮 يشمل رصيد V-Bucks</div>
                <ul className="delivery-list">{p.delivery.platformNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </StoreShell>
  );
}
