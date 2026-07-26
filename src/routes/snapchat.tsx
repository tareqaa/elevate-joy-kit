import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { PRODUCTS_CATALOG } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";
import { useLang } from "@/lib/gx/i18n";
import { localizedProduct } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";

export const Route = createFileRoute("/snapchat")({
  head: () => ({
    meta: [
      { title: "Snapchat+ — GX Store" },
      { name: "description", content: "Activate Snapchat+ fast and easily — official activation via Snapchat's gifting feature." },
      { property: "og:title", content: "Snapchat+ — GX Store" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: SnapchatPage,
});

function SnapchatPage() {
  const { lang, t } = useLang();
  const sp = localizedProduct(PRODUCTS_CATALOG.snapchat, lang);
  const { format } = useCurrency();
  const cart = useCart();
  const defaultPlan = sp.plans!.find((pl) => pl.tag)?.id || sp.plans![0].id;
  const [planId, setPlanId] = useState(defaultPlan);
  const [usernames, setUsernames] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [addedFlash, setAddedFlash] = useState(false);
  const plan = useMemo(() => sp.plans!.find((p) => p.id === planId)!, [planId, sp.plans]);

  function updateUsername(i: number, v: string) {
    const next = usernames.slice();
    next[i] = v.trim();
    setUsernames(next);
    setError(null);
  }

  function inc() {
    if (usernames.length >= 10) return;
    const missingIdx = usernames.findIndex((u) => !u.trim());
    if (missingIdx !== -1) { setError(t("snap.err_fill_current")); return; }
    setUsernames([...usernames, ""]);
  }
  function dec() {
    if (usernames.length <= 1) return;
    setUsernames(usernames.slice(0, -1));
  }

  function validate() {
    const missingIdx = usernames.findIndex((u) => !u.trim());
    if (missingIdx !== -1) { setError(t("snap.err_fill_all")); return false; }
    return true;
  }

  function addToCart() {
    if (!validate()) return;
    cart.addSnap(plan.id, usernames);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1600);
  }
  function buyNow() {
    if (!validate()) return;
    cart.buyNowSnap(plan.id, usernames);
    navigate({ to: "/cart" });
  }

  return (
    <StoreShell>
      <section className="product-hero">
        <div className="wrap">
          <div className="product-hero-inner fade-in">
            <div className="product-icon-badge"><div className="core">{sp.icon}</div></div>
            <div className="product-hero-text">
              <span className="cat-tag">{sp.category}</span>
              <h1>{sp.tagline}</h1>
              <p>{sp.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("snap.pick_plan")} />
          <div className="snap-plan-grid">
            {sp.plans!.map((pl) => {
              const discount = pl.oldPrice ? Math.round((1 - pl.price / pl.oldPrice) * 100) : 0;
              return (
                <div key={pl.id} className={"snap-plan" + (pl.id === planId ? " selected" : "")} onClick={() => setPlanId(pl.id)}>
                  <div className="sp-check">✓</div>
                  {pl.tag && <div className="sp-tag">{pl.tag}</div>}
                  {discount > 0 && <div className="sp-discount">{t("snap.save_pct")} {discount}%</div>}
                  <div className="sp-icon">👻</div>
                  <div className="sp-label">{pl.label}</div>
                  <div>
                    {pl.oldPrice && <span className="sp-old">{format(pl.oldPrice)}</span>}
                    <span className="sp-price">{format(pl.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg2)", paddingTop: 0 }}>
        <div className="wrap">
          <SectionHead eyebrow={t("snap.order_eyebrow")} title={t("snap.order_title")} />
          <div className="order-box">
            <div>
              <div className="order-field">
                <label>{t("snap.accounts_count")}</label>
                <div className="stepper-row">
                  <button type="button" onClick={inc}>+</button>
                  <div className="count">{usernames.length}</div>
                  <button type="button" onClick={dec}>−</button>
                </div>
                <div className="stepper-hint">{t("snap.stepper_hint")}</div>
              </div>
              <div>
                {usernames.map((val, i) => (
                  <div key={i} className="username-field">
                    <label>{usernames.length === 1 ? sp.identifierLabel : `${sp.identifierLabel} — ${t("snap.account_n")} ${i + 1}`}</label>
                    <input
                      type="text"
                      className={"uname-input" + (error && !val.trim() ? " error" : "")}
                      placeholder={sp.identifierPlaceholder}
                      value={val}
                      onChange={(e) => updateUsername(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="order-summary">
              <h3>{t("cart.summary")}</h3>
              <div className="os-row"><span>{t("snap.duration")}</span><span>{plan.label}</span></div>
              <div className="os-row"><span>{t("snap.plan_price")}</span><span>{format(plan.price)}</span></div>
              <div className="os-row"><span>{t("snap.accounts_count")}</span><span>{usernames.length}</span></div>
              <div className="os-total">
                <span className="lbl">{t("cart.total")}</span>
                <span className="val">{format(plan.price * usernames.length)}</span>
              </div>
              {error && <div className="order-error" style={{ display: "block" }}>{error}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className={"btn btn-primary btn-block" + (addedFlash ? " added" : "")} type="button" onClick={addToCart}>
                  {addedFlash ? t("snap.added_ok") : t("snap.add_cart")}
                </button>
                <button className="btn btn-ghost btn-block" type="button" onClick={buyNow}>{t("buy.buy_now")}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("product.features_eyebrow")} title={t("product.features_title")} sub={t("product.features_sub")} />
          <FeatureAccordion features={sp.features || []} />
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <DeliveryBox method={sp.deliveryMethod} identifierLabel={sp.identifierLabel} />
        </div>
      </section>
    </StoreShell>
  );
}
