/* ============================================================
   GX STORE — DYNAMIC PRODUCT TEMPLATES
   One component per `products.page_template` value. All of them
   render from the database DTO returned by catalog.functions.ts.
   ============================================================ */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { CatalogProduct, CatalogVariant } from "@/lib/gx/catalog.functions";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import type { Lang } from "@/lib/gx/i18n";
import { BuyActions } from "@/components/gx/BuyActions";
import { DiscountBadge } from "@/components/gx/DiscountBadge";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";
import { CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";

const pick = (lang: Lang, ar: string | null | undefined, en: string | null | undefined) =>
  (lang === "en" ? en || ar : ar || en) || "";

const discountOf = (v: CatalogVariant) =>
  v.oldPrice && v.oldPrice > v.price ? Math.round((1 - v.price / v.oldPrice) * 100) : 0;

function useLocalized(p: CatalogProduct) {
  const { lang } = useLang();
  return useMemo(
    () => ({
      lang,
      name: pick(lang, p.nameAr, p.nameEn),
      tagline: pick(lang, p.taglineAr, p.taglineEn) || pick(lang, p.nameAr, p.nameEn),
      description: pick(lang, p.descriptionAr, p.descriptionEn),
      category: pick(lang, p.categoryNameAr, p.categoryNameEn),
      identifierLabel: pick(lang, p.identifierLabelAr, p.identifierLabelEn),
      deliveryMethod: pick(lang, p.deliveryMethodAr, p.deliveryMethodEn),
      features: p.features.map((f) => ({
        icon: f.icon || "✨",
        title: pick(lang, f.titleAr, f.titleEn),
        desc: pick(lang, f.descAr, f.descEn),
      })),
      variants: p.variants.map((v) => ({
        ...v,
        label: pick(lang, v.labelAr, v.labelEn),
        tag: pick(lang, v.tagAr, v.tagEn) || null,
      })),
    }),
    [p, lang],
  );
}

function ProductHero({ p, l }: { p: CatalogProduct; l: ReturnType<typeof useLocalized> }) {
  return (
    <section className="product-hero">
      <div className="wrap">
        <div className="product-hero-inner fade-in">
          <div className="product-icon-badge">
            <div className="core">
              {p.iconImage ? (
                <img src={p.iconImage} alt={l.name} style={{ width: 56, height: 56, objectFit: "contain" }} />
              ) : (
                <span>{p.icon}</span>
              )}
            </div>
          </div>
          <div className="product-hero-text">
            {l.category && <span className="cat-tag">{l.category}</span>}
            <h1>{l.tagline}</h1>
            <p>{l.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VariantCard({
  p,
  v,
  icon,
}: {
  p: CatalogProduct;
  v: CatalogVariant & { label: string; tag: string | null };
  icon?: React.ReactNode;
}) {
  const { format } = useCurrency();
  return (
    <div className="prod-card">
      <div className="prod-thumb" style={{ background: p.thumbBg || undefined }}>
        {v.tag && <span className="tag-badge">{v.tag}</span>}
        <DiscountBadge value={discountOf(v)} />
        {icon ??
          (p.iconImage ? (
            <img src={p.iconImage} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 44 }}>{p.icon}</span>
          ))}
      </div>
      <div className="prod-body">
        <div className="prod-name" style={{ minHeight: "auto", fontSize: 16 }}>{v.label}</div>
        <div className="prod-prices">
          {v.oldPrice && <span className="prod-old">{format(v.oldPrice)}</span>}
          <span className="prod-new">{format(v.price)}</span>
        </div>
        <BuyActions cartId={v.cartId} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- standard */
export function StandardTemplate({ product }: { product: CatalogProduct }) {
  const { t } = useLang();
  const l = useLocalized(product);
  return (
    <>
      <ProductHero p={product} l={l} />
      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
          <div className="plans-grid">
            {l.variants.map((v) => <VariantCard key={v.cartId} p={product} v={v} />)}
          </div>
        </div>
      </section>

      {l.features.length > 0 && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("product.features_title")} sub={t("product.features_sub")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <DeliveryBox method={l.deliveryMethod} identifierLabel={l.identifierLabel} />
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------- multi_account */
export function MultiAccountTemplate({ product }: { product: CatalogProduct }) {
  const { t } = useLang();
  const l = useLocalized(product);
  const { format } = useCurrency();
  const cart = useCart();
  const navigate = useNavigate();

  const plans = l.variants;
  const [planId, setPlanId] = useState(plans.find((p) => p.tag)?.cartId || plans[0]?.cartId || "");
  const [usernames, setUsernames] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [addedFlash, setAddedFlash] = useState(false);
  const plan = plans.find((p) => p.cartId === planId) || plans[0];

  function updateUsername(i: number, v: string) {
    const next = usernames.slice();
    next[i] = v.trim();
    setUsernames(next);
    setError(null);
  }
  function inc() {
    if (usernames.length >= 10) return;
    if (usernames.findIndex((u) => !u.trim()) !== -1) { setError(t("snap.err_fill_current")); return; }
    setUsernames([...usernames, ""]);
  }
  function dec() {
    if (usernames.length <= 1) return;
    setUsernames(usernames.slice(0, -1));
  }
  function validate() {
    if (usernames.findIndex((u) => !u.trim()) !== -1) { setError(t("snap.err_fill_all")); return false; }
    return true;
  }
  function addToCart() {
    if (!plan || !validate()) return;
    cart.addSnap(plan.cartId, usernames);
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 1600);
  }
  function buyNow() {
    if (!plan || !validate()) return;
    cart.buyNowSnap(plan.cartId, usernames);
    navigate({ to: "/cart" });
  }

  if (!plan) return <ProductHero p={product} l={l} />;

  return (
    <>
      <ProductHero p={product} l={l} />

      <section className="section">
        <div className="wrap">
          <SectionHead eyebrow={t("sec.plans")} title={t("snap.pick_plan")} />
          <div className="snap-plan-grid">
            {plans.map((pl) => {
              const discount = discountOf(pl);
              return (
                <div key={pl.cartId} className={"snap-plan" + (pl.cartId === planId ? " selected" : "")} onClick={() => setPlanId(pl.cartId)}>
                  <div className="sp-check">✓</div>
                  {pl.tag && <div className="sp-tag">{pl.tag}</div>}
                  {discount > 0 && <div className="sp-discount">{t("snap.save_pct")} {discount}%</div>}
                  <div className="sp-icon">
                    {product.iconImage ? <img src={product.iconImage} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} /> : product.icon}
                  </div>
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
                    <label>{usernames.length === 1 ? l.identifierLabel : `${l.identifierLabel} — ${t("snap.account_n")} ${i + 1}`}</label>
                    <input
                      type="text"
                      className={"uname-input" + (error && !val.trim() ? " error" : "")}
                      placeholder={product.identifierPlaceholder || ""}
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

      {l.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("product.features_title")} sub={t("product.features_sub")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      <section className="section" style={{ background: "var(--bg2)" }}>
        <div className="wrap">
          <DeliveryBox method={l.deliveryMethod} identifierLabel={l.identifierLabel} />
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------- dual_plans */
export function DualPlansTemplate({ product }: { product: CatalogProduct }) {
  const { lang, t } = useLang();
  const l = useLocalized(product);
  const crew = l.variants.filter((v) => v.planGroup === "crew");
  const vbucks = l.variants.filter((v) => v.planGroup === "vbucks");
  const rest = l.variants.filter((v) => v.planGroup !== "crew" && v.planGroup !== "vbucks");
  const d = (product.deliveryDetails?.[lang === "en" ? "en" : "ar"] ??
    product.deliveryDetails?.ar ??
    null) as { intro?: string; requirements?: string[]; safety?: string[]; platformNotes?: string[] } | null;

  return (
    <>
      <ProductHero p={product} l={l} />

      {crew.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("fn.crew_eyebrow")} title={t("fn.crew_title")} />
            <div className="plans-grid">
              {crew.map((v) => <VariantCard key={v.cartId} p={product} v={v} icon={<CrewIcon />} />)}
            </div>
          </div>
        </section>
      )}

      {vbucks.length > 0 && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <SectionHead eyebrow={t("fn.vb_eyebrow")} title={t("fn.vb_title")} />
            <div className="plans-grid">
              {vbucks.map((v) => {
                const tier = parseInt(v.cartId.replace(/\D+/g, ""), 10) || 0;
                return <VariantCard key={v.cartId} p={product} v={v} icon={<VbucksIcon tier={tier} />} />;
              })}
            </div>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("sec.plans")} title={t("product.pick_plan")} />
            <div className="plans-grid">
              {rest.map((v) => <VariantCard key={v.cartId} p={product} v={v} />)}
            </div>
          </div>
        </section>
      )}

      {l.features.length > 0 && (
        <section className="section">
          <div className="wrap">
            <SectionHead eyebrow={t("product.features_eyebrow")} title={t("fn.features_title")} />
            <FeatureAccordion features={l.features} />
          </div>
        </section>
      )}

      {d && (
        <section className="section" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="delivery-box fade-in delivery-box-wide">
              <div className="dic">🔒</div>
              <div>
                <h3>{t("fn.delivery_title")}</h3>
                <p>{d.intro}</p>
                <div className="delivery-cols">
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.req_title")}</div>
                    <ul className="delivery-list">{(d.requirements || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                  <div className="delivery-col">
                    <div className="delivery-col-title">{t("fn.safety_title")}</div>
                    <ul className="delivery-list">{(d.safety || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
                <div className="delivery-col-title" style={{ marginTop: 18 }}>{t("fn.platform_title")}</div>
                <ul className="delivery-list">{(d.platformNotes || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* -------------------------------------------------------- gift_card */
export function GiftCardTemplate({ product }: { product: CatalogProduct }) {
  const { lang, t } = useLang();
  const l = useLocalized(product);
  const { format } = useCurrency();

  // Variants carry their region as "ar|en|flag" plus a plan_group country code.
  const regions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: typeof l.variants }>();
    for (const v of l.variants) {
      const code = (v.planGroup || "xx").toLowerCase();
      const [ar, en] = (v.region || "").split("|");
      const name = (lang === "en" ? en || ar : ar || en) || code.toUpperCase();
      if (!map.has(code)) map.set(code, { code, name, items: [] });
      map.get(code)!.items.push(v);
    }
    return Array.from(map.values());
  }, [l.variants, lang]);

  const iconMarkup = product.iconImage ? (
    <img src={product.iconImage} alt={l.name} style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
  ) : (
    <span style={{ fontSize: 44, lineHeight: 1 }}>{product.icon}</span>
  );

  return (
    <>
      <section className="giftcard-hero">
        <div className="wrap">
          <div className="giftcard-hero-inner fade-in">
            <div className="giftcard-mockup" style={{ background: product.cardGradient || product.thumbBg || undefined }}>
              <div className="gc-top">
                <span className="gc-icon">{iconMarkup}</span>
                <div className="gc-chip" />
              </div>
              <div>
                <div className="gc-name">{l.name}</div>
                <div className="gc-sub">{t("gc.digital_card")}</div>
              </div>
            </div>
            <div className="giftcard-hero-text">
              <h1>{l.name}</h1>
              <p>{t("gc.pick_region")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          {regions.length === 0 ? (
            <div className="giftcard-empty fade-in">
              <div className="ge-icon">🕓</div>
              <h3>{t("gc.empty_title")}</h3>
              <p>{t("gc.empty_desc_a")} {l.name} {t("gc.empty_desc_b")}</p>
            </div>
          ) : (
            regions.map((region) => (
              <div key={region.code} className="region-section">
                <div className="region-head">
                  <div className="region-flag">
                    <img src={`https://flagcdn.com/w160/${region.code}.png`} srcSet={`https://flagcdn.com/w320/${region.code}.png 2x`} alt={region.name} />
                  </div>
                  <div className="region-name">{region.name}</div>
                </div>
                <div className="denom-grid" style={{ ["--gc-accent" as string]: product.accentColor || "var(--accent)" } as React.CSSProperties}>
                  {region.items.map((d) => (
                    <div key={d.cartId} className="denom-card">
                      <div className="dc-value">{d.label}</div>
                      <div className="dc-price"><span>{format(d.price)}</span></div>
                      <BuyActions cartId={d.cartId} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

export function ProductTemplate({ product }: { product: CatalogProduct }) {
  switch (product.pageTemplate) {
    case "multi_account":
      return <MultiAccountTemplate product={product} />;
    case "dual_plans":
      return <DualPlansTemplate product={product} />;
    case "gift_card":
      return <GiftCardTemplate product={product} />;
    default:
      return <StandardTemplate product={product} />;
  }
}
