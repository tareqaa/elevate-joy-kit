import { resolveRegionLabel, formatFullRegion } from "@/lib/gx/region";
/* ============================================================
   GX STORE — DYNAMIC PRODUCT TEMPLATES
   One component per `products.page_template` value. All of them
   render from the database DTO returned by catalog.functions.ts.
   ============================================================ */

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { CatalogProduct, CatalogVariant } from "@/lib/gx/catalog.functions";
import { useCurrency } from "@/lib/gx/currency";
import { useCart } from "@/lib/gx/cart";
import { useLang } from "@/lib/gx/i18n";
import type { Lang } from "@/lib/gx/i18n";
import { useSiteSettings, getEffectiveStockLimit, isSocialMediaStockItem } from "@/lib/gx/site-settings";
import { BuyActions } from "@/components/gx/BuyActions";
import { FeatureAccordion, DeliveryBox, SectionHead } from "@/components/gx/Primitives";
import { CrewIcon, VbucksIcon, SnapchatPoster, AdobePoster, CanvaPoster, WindowsPoster } from "@/lib/gx/brand-icons";
import { ProductPlatformBar } from "@/components/gx/ProductPlatformBar";
import { getDeliveryTypeInfo } from "@/lib/gx/delivery-types";
import { GxProductTemplate } from "@/components/gx/GxProductTemplate";
import { RelatedProductsSection } from "@/components/gx/RelatedProductsSection";
import type { CatalogStoreProduct } from "@/lib/gx/catalog.functions";
import { resolveProductActivationGuide } from "@/lib/gx/activation-guide";
import { Sparkles, ExternalLink, ShieldCheck } from "lucide-react";

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
        tag: null,
      })),
    }),
    [p, lang],
  );
}

function ProductHero({ p, l }: { p: CatalogProduct; l: ReturnType<typeof useLocalized> }) {
  const imgSrc =
    p.slug === "snapchat"
      ? "/app/assets/img/snapchat-logo.png"
      : p.slug === "windows"
      ? "/app/assets/img/windows-icon.svg"
      : p.slug === "fortnite"
      ? "/app/assets/img/fortnite-f-icon.jpg"
      : p.imageUrl || p.iconImage;

  // Avoid repeating identical text in both hero-sub and description
  const cleanDescription =
    l.description && l.tagline && l.description.startsWith(l.tagline)
      ? l.description.slice(l.tagline.length).trim().replace(/^[-—،,.]\s*/, "")
      : l.description;

  return (
    <section className="product-hero">
      <div className="wrap">
        <div className="product-hero-inner fade-in">
          <div className="product-icon-badge">
            <div className="core">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={l.name}
                  className="product-hero-badge-img"
                />
              ) : (
                <span>{p.icon}</span>
              )}
            </div>
          </div>
          <div className="product-hero-text">
            {l.category && <span className="cat-tag">{l.category}</span>}
            <h1>{l.name}</h1>
            {l.tagline && l.tagline !== l.name && <p className="hero-sub">{l.tagline}</p>}
            {cleanDescription && <p>{cleanDescription}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

export const VBUCKS_TIER_THEMES: Record<
  number,
  {
    bg: string;
    border: string;
    accent: string;
    badgeAr: string;
    badgeEn: string;
  }
> = {
  800: {
    bg: "linear-gradient(145deg, rgba(75,217,75,0.22), rgba(10,25,10,0.95))",
    border: "rgba(75,217,75,0.45)",
    accent: "#4bd94b",
    badgeAr: "🌱 فئة برونزية",
    badgeEn: "Starter Pack",
  },
  2400: {
    bg: "linear-gradient(145deg, rgba(59,169,255,0.25), rgba(10,25,50,0.95))",
    border: "rgba(59,169,255,0.5)",
    accent: "#3ba9ff",
    badgeAr: "🔥 الأكثر طلبًا",
    badgeEn: "Most Popular",
  },
  4500: {
    bg: "linear-gradient(145deg, rgba(178,107,255,0.28), rgba(30,12,60,0.95))",
    border: "rgba(178,107,255,0.55)",
    accent: "#b26bff",
    badgeAr: "💎 قيمة ممتازة",
    badgeEn: "Best Value",
  },
  12500: {
    bg: "linear-gradient(145deg, rgba(255,207,71,0.32), rgba(50,30,5,0.95))",
    border: "rgba(255,207,71,0.65)",
    accent: "#ffcf47",
    badgeAr: "👑 الباقة الكبرى",
    badgeEn: "Ultimate Pack",
  },
};

export const CREW_TIER_THEMES: Record<
  string,
  {
    bg: string;
    border: string;
    accent: string;
    badgeAr: string;
    badgeEn: string;
  }
> = {
  "fn-crew": {
    bg: "linear-gradient(145deg, rgba(31,169,255,0.28), rgba(10,35,80,0.95))",
    border: "rgba(31,169,255,0.55)",
    accent: "#1fa9ff",
    badgeAr: "⭐ اشتراك شهر",
    badgeEn: "Monthly Pass",
  },
  "fn-crew-3": {
    bg: "linear-gradient(145deg, rgba(255,180,50,0.32), rgba(60,30,5,0.95))",
    border: "rgba(255,180,50,0.65)",
    accent: "#ffb432",
    badgeAr: "👑 3 أشهر - أفضل توفير",
    badgeEn: "3 Months - Max Savings",
  },
};

function VariantCard({
  p,
  v,
  theme,
  icon,
}: {
  p: CatalogProduct;
  v: CatalogVariant & { label: string; tag: string | null };
  theme?: { bg?: string; border?: string; accent?: string; badgeAr?: string; badgeEn?: string } | null;
  icon?: React.ReactNode;
}) {
  const { format } = useCurrency();
  const { lang } = useLang();
  const siteSettings = useSiteSettings();
  const rawTag = pick(lang, v.tagAr, v.tagEn);
  const isTagDisabled =
    !rawTag ||
    rawTag.toLowerCase() === "none" ||
    rawTag.toLowerCase() === "no-badge" ||
    rawTag.toLowerCase() === "off" ||
    rawTag === "بدون شارة" ||
    rawTag === "إخفاء" ||
    rawTag === "لا شيء";

  const imgSrc =
    (v as { imageUrl?: string }).imageUrl ||
    (p.imageUrl && !p.imageUrl.includes("gradient") ? p.imageUrl : undefined) ||
    (p.iconImage && !p.iconImage.includes("gradient") ? p.iconImage : undefined) ||
    (p.slug === "gemini" ? "/app/assets/img/gemini-logo.svg" : undefined) ||
    (p.thumbBg && (p.thumbBg.startsWith("/") || p.thumbBg.startsWith("http")) ? p.thumbBg : undefined);

  const badgeText: string | null = null;

  const snapDuration =
    p.slug === "snapchat"
      ? v.cartId === "snap-3" || (v as { id?: string }).id === "snap-3"
        ? lang === "en"
          ? "3 MONTHS"
          : "3 أشهر"
        : v.cartId === "snap-6" || (v as { id?: string }).id === "snap-6"
        ? lang === "en"
          ? "6 MONTHS"
          : "6 أشهر"
        : v.cartId === "snap-12" || (v as { id?: string }).id === "snap-12"
        ? lang === "en"
          ? "12 MONTHS"
          : "12 شهر"
        : v.cartId === "snap-1" || (v as { id?: string }).id === "snap-1"
        ? lang === "en"
          ? "1 MONTH"
          : "شهر واحد"
        : undefined
      : undefined;

  let thumbContent = icon;
  if (!thumbContent) {
    if (p.slug === "snapchat") {
      thumbContent = <SnapchatPoster duration={snapDuration} />;
    } else if (p.slug === "adobe") {
      thumbContent = <AdobePoster />;
    } else if (p.slug === "canva") {
      thumbContent = <CanvaPoster />;
    } else if (p.slug === "windows") {
      thumbContent = <WindowsPoster cartId={v.cartId} planLabel={v.label} />;
    } else if (imgSrc) {
      thumbContent = <img src={imgSrc} alt="" className="prod-thumb-img prod-card-img" />;
    } else {
      thumbContent = <span style={{ fontSize: 44 }}>{p.icon}</span>;
    }
  }

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const deliveryInfo = getDeliveryTypeInfo(
    { slug: p.slug, cartId: v.cartId, name: v.label, productType: p.deliveryType },
    lang
  );

  const getCleanRegion = () =>
    resolveRegionLabel(
      { region: p.region, tagline: p.taglineAr, name: v.label, cartId: v.cartId, slug: p.slug },
      lang,
      { flag: false },
    );
  const cleanRegion = getCleanRegion();

  const stockLimit = getEffectiveStockLimit(
    siteSettings?.product_stock_limits,
    v.cartId,
    p.slug,
    p.categorySlug,
    p.categoryNameAr,
    p.nameAr
  );
  const isOutOfStock =
    isSocialMediaStockItem(v.cartId, p.slug, p.categorySlug, p.categoryNameAr, p.nameAr) ||
    (stockLimit !== null && stockLimit <= 0);

  return (
    <div
      className={`prod-card ${isOutOfStock ? "is-sold-out" : ""}`}
      style={
        theme
          ? { borderColor: theme.border, boxShadow: `0 8px 24px -6px ${theme.border}`, ...(isOutOfStock ? { opacity: 0.72, filter: "grayscale(0.38)" } : {}) }
          : isOutOfStock
          ? { opacity: 0.72, filter: "grayscale(0.38)" }
          : undefined
      }
    >
      <div className="prod-thumb" style={{ background: theme?.bg || p.thumbBg || undefined }}>
        {thumbContent}
      </div>
      <div className="prod-body">
        <ProductPlatformBar
          productKey={p.slug}
          cartId={v.cartId}
          name={`${lang === "en" ? p.nameEn : p.nameAr} — ${v.label}`}
          categoryName={lang === "en" ? p.categoryNameEn || p.categoryNameAr || undefined : p.categoryNameAr || p.categoryNameEn || undefined}
        />
        <div className="prod-name">
          {v.label}
        </div>

        {/* Region (Right in Blue) & Product Delivery Type (Left) with Exclamation Info Tooltip */}
        <div className="prod-meta-row">
          <span className="prod-meta-region">{cleanRegion}</span>

          <div
            className={`prod-meta-type-wrap ${tooltipOpen ? "is-active" : ""}`}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTooltipOpen((prev) => !prev);
            }}
          >
            <span className="prod-meta-type-label">{deliveryInfo.label}</span>
            <span
              className="prod-meta-info-icon"
              role="button"
              tabIndex={0}
              aria-label={deliveryInfo.label}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setTooltipOpen((prev) => !prev);
                }
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8" cy="8" r="7" />
                <line x1="8" y1="4.5" x2="8" y2="8.5" />
                <circle cx="8" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </div>

          <div
            className={`prod-type-tooltip ${tooltipOpen ? "is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <div className="prod-type-tooltip-title">
              <span>{deliveryInfo.icon}</span>
              <span>{deliveryInfo.label}</span>
            </div>
            <div className="prod-type-tooltip-desc">{deliveryInfo.desc}</div>
          </div>
        </div>

        {isOutOfStock ? (
          <div
            className="prod-sold-out-box"
            style={{
              marginTop: "auto",
              height: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              userSelect: "none",
            }}
          >
            <span
              style={{
                color: "#ff3b71",
                fontSize: 15,
                fontWeight: 900,
                fontFamily: "'Tajawal', sans-serif",
                letterSpacing: 0.3,
              }}
            >
              {lang === "en" ? "Sold Out" : "نفدت الكمية"}
            </span>
          </div>
        ) : (
          <>
            <div className="prod-prices">
              {v.oldPrice && <span className="prod-old">{format(v.oldPrice)}</span>}
              <div className="prod-price-row">
                <span className="prod-new" style={theme ? { color: theme.accent } : undefined}>
                  {format(v.price)}
                </span>
              </div>
            </div>
            <BuyActions
              cartId={v.cartId}
              meta={{
                price: v.price,
                name: `${p.nameAr || p.nameEn} — ${v.labelAr || v.labelEn}`,
                product: p.slug,
              }}
            />
          </>
        )}
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
                <div
                  key={pl.cartId}
                  className={"snap-plan" + (pl.cartId === planId ? " selected" : "")}
                  onClick={() => {
                    setPlanId(pl.cartId);
                  }}
                >
                  <div className="sp-check">✓</div>
                  <div className="sp-icon">
                    {product.slug === "snapchat" ? (
                      <img src="/app/assets/img/snapchat-logo.png" alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6 }} />
                    ) : product.iconImage ? (
                      <img src={product.iconImage} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} />
                    ) : (
                      product.icon
                    )}
                  </div>
                  <div className="sp-label">{pl.label}</div>
                  <div className="sp-prices-wrap">
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
export function GiftCardTemplate({ product, initialVariant }: { product: CatalogProduct; initialVariant?: string }) {
  const { lang, t } = useLang();
  const l = useLocalized(product);
  const { format } = useCurrency();

  // Variants carry their region as "ar|en|flag" plus a plan_group country code.
  const regions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: typeof l.variants }>();
    for (const v of l.variants) {
      let code = (v.planGroup || "").toLowerCase();
      const cId = (v.cartId || "").toLowerCase();
      const r = (v.region || "").toLowerCase();
      if (!code || code === "xx") {
        if (cId.includes("global") || cId.includes("razer") || r.includes("global") || r.includes("عالمي")) code = "global";
        else if (cId.includes("-us-") || cId.startsWith("gp-us") || r.includes("أمريك") || r.includes("usa")) code = "us";
        else if (cId.includes("-sa-") || r.includes("سعود") || r.includes("ksa")) code = "sa";
        else if (cId.includes("-ae-") || r.includes("إمارات") || r.includes("uae")) code = "ae";
        else if (cId.includes("-tr-") || r.includes("ترك") || r.includes("turkey")) code = "tr";
        else if (cId === "gb" || cId.includes("uk") || r.includes("gb") || r.includes("بريطان")) code = "gb";
        else code = "global";
      }

      const name = formatFullRegion({ region: v.region || code, cartId: v.cartId }, lang, { withDetails: true });

      if (!map.has(code)) map.set(code, { code, name, items: [] });
      map.get(code)!.items.push(v);
    }
    return Array.from(map.values());
  }, [l.variants, lang]);

  const initialRegion = useMemo(() => {
    const target = initialVariant || (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("variant") || window.location.hash.replace("#", "")) : "");
    if (target) {
      const clean = target.toLowerCase();
      for (const r of regions) {
        if (r.code.toLowerCase() === clean || r.items.some((it) => it.cartId?.toLowerCase() === clean || it.cartId?.toLowerCase().includes(clean))) {
          return r.code;
        }
      }
    }
    return "all";
  }, [regions, initialVariant]);

  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);

  // Guarantee page starts scrolled to the very top upon entering gift card page
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [product.slug]);

  const visibleRegions = useMemo(() => {
    if (selectedRegion === "all") return regions;
    return regions.filter((r) => r.code === selectedRegion);
  }, [regions, selectedRegion]);

  const iconMarkup = product.iconImage ? (
    <img src={product.iconImage} alt={l.name} style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} />
  ) : (
    <span style={{ fontSize: 44, lineHeight: 1 }}>{product.icon}</span>
  );

  const renderDenomLabel = (d: { label: string; cartId?: string; planGroup?: string | null }, regionCode: string) => {
    const raw = (d.label || "").trim();
    const cartId = (d.cartId || "").toLowerCase();
    const isPsn = (product.slug || "").toLowerCase().includes("playstation") || cartId.startsWith("psn-");
    const rCode = (d.planGroup || regionCode || "").toLowerCase();

    let main = raw;
    let eqAmount = "";
    let currencySymbol = "";

    if (raw.includes("≈") || raw.includes("=")) {
      const sep = raw.includes("≈") ? "≈" : "=";
      const parts = raw.split(sep);
      main = parts[0]?.trim() || raw;
      const right = parts.slice(1).join(sep).trim();
      const numMatch = right.match(/([\d.]+)/);
      if (numMatch) {
        eqAmount = numMatch[1];
        if (rCode === "ae" || cartId.includes("-ae-") || right.includes("درهم") || right.includes("AED") || right.includes("د.إ")) {
          currencySymbol = lang === "en" ? "AED" : "د.إ";
        } else if (rCode === "sa" || cartId.includes("-sa-") || right.includes("ريال") || right.includes("SAR") || right.includes("ر.س")) {
          currencySymbol = lang === "en" ? "SAR" : "ر.س";
        } else {
          currencySymbol = right.replace(numMatch[1], "").trim();
        }
      }
    } else if (isPsn && !raw.includes("ر.س") && !raw.includes("SAR") && !raw.includes("ريال") && !cartId.includes("-sa-") && rCode !== "sa") {
      const match = raw.match(/(\d+)/);
      const amount = match ? Number(match[1]) : 0;
      if (amount > 0) {
        if (rCode === "ae" || cartId.includes("-ae-")) {
          eqAmount = String(amount * 4);
          currencySymbol = lang === "en" ? "AED" : "د.إ";
        }
      }
    }

    if (eqAmount && currencySymbol) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: "19px", fontWeight: 900, lineHeight: 1.15 }}>
            {main}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "11px",
              fontWeight: 800,
              color: "#10b981",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.22)",
              borderRadius: "6px",
              padding: "2px 8px",
              lineHeight: "15px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 900, opacity: 0.85 }}>≈</span>
            <span>{eqAmount}</span>
            <span style={{ fontSize: "10px", opacity: 0.9 }}>{currencySymbol}</span>
          </span>
        </div>
      );
    }

    return <span style={{ fontSize: "19px", fontWeight: 900 }}>{raw}</span>;
  };

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

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="wrap">
          {regions.length > 1 && (
            <div className="gc-region-filter-bar">
              <button
                type="button"
                className={`gc-region-pill ${selectedRegion === "all" ? "active" : ""}`}
                onClick={() => setSelectedRegion("all")}
              >
                <span>{lang === "ar" ? "جميع الدول" : "All Regions"}</span>
                <span className="gc-pill-badge">{l.variants.length}</span>
              </button>
              {regions.map((r) => {
                const codeClean = r.code.toLowerCase().trim();
                const isGlobal = codeClean === "global" || codeClean === "ww" || codeClean === "xx";
                const flagSrc = isGlobal
                  ? null
                  : (codeClean.startsWith("http") || codeClean.startsWith("data:")
                    ? codeClean
                    : `https://flagcdn.com/w160/${codeClean === "uk" ? "gb" : codeClean}.png`);
                return (
                  <button
                    key={r.code}
                    type="button"
                    className={`gc-region-pill ${selectedRegion === r.code ? "active" : ""}`}
                    onClick={() => setSelectedRegion(r.code)}
                  >
                    {!isGlobal && flagSrc && (
                      <img
                        src={flagSrc}
                        alt=""
                        className="gc-pill-flag"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <span>{r.name}</span>
                    <span className="gc-pill-badge">{r.items.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {visibleRegions.length === 0 ? (
            <div className="giftcard-empty fade-in">
              <div className="ge-icon">🕓</div>
              <h3>{t("gc.empty_title")}</h3>
            </div>
          ) : (
            visibleRegions.map((region) => {
              const codeClean = region.code.toLowerCase().trim();
              const isGlobal = codeClean === "global" || codeClean === "ww" || codeClean === "xx";
              const flagSrc = isGlobal
                ? null
                : (codeClean.startsWith("http") || codeClean.startsWith("data:")
                  ? codeClean
                  : `https://flagcdn.com/w160/${codeClean === "uk" ? "gb" : codeClean}.png`);
              return (
                <div key={region.code} className="region-section">
                  <div className="region-head">
                    {!isGlobal && flagSrc && (
                      <div className="region-flag">
                        <img
                          src={flagSrc}
                          alt={region.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="region-name">{region.name}</div>
                  </div>
                  <div className="denom-grid" style={{ ["--gc-accent" as string]: product.accentColor || "var(--accent)" } as React.CSSProperties}>
                    {region.items.map((d) => (
                      <div key={d.cartId} className="denom-card">
                        <div className="dc-value">{renderDenomLabel(d, region.code)}</div>
                        <div className="dc-price"><span>{format(d.price)}</span></div>
                        <BuyActions
                          cartId={d.cartId}
                          meta={{
                            price: d.price,
                            name: `${product.nameAr || product.nameEn} (${d.label})`,
                            product: product.slug,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Activation Instructions Section */}
          {(() => {
            const guide = resolveProductActivationGuide(
              {
                name: product.nameAr,
                nameAr: product.nameAr,
                nameEn: product.nameEn,
                slug: product.slug,
                platform: product.platform || undefined,
                deliveryInstructionsAr: product.deliveryInstructionsAr || undefined,
                deliveryInstructionsEn: (product as any).deliveryInstructionsEn || undefined,
              },
              lang
            );

            return (
              <div
                style={{
                  marginTop: 40,
                  borderRadius: 16,
                  background: "linear-gradient(145deg, rgba(16, 24, 39, 0.7), rgba(9, 11, 16, 0.9))",
                  border: "1px solid rgba(0, 229, 255, 0.15)",
                  padding: "24px 28px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(0, 229, 255, 0.12)",
                        color: "var(--cyan)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                        {guide.title}
                      </h3>
                      <span style={{ fontSize: 12, color: "var(--cyan)", fontWeight: 600 }}>
                        {guide.platformName}
                      </span>
                    </div>
                  </div>
                  {guide.directUrl && (
                    <a
                      href={guide.directUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: "rgba(0, 229, 255, 0.1)",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                        color: "var(--cyan)",
                        fontWeight: 700,
                        fontSize: 12,
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>{lang === "ar" ? "رابط صفحة التفعيل المباشر 🔗" : "Direct Redemption Link 🔗"}</span>
                    </a>
                  )}
                </div>

                <ol
                  style={{
                    margin: 0,
                    paddingLeft: lang === "ar" ? 0 : 20,
                    paddingRight: lang === "ar" ? 20 : 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: "#cbd5e1",
                  }}
                >
                  {guide.steps.map((step, idx) => (
                    <li key={idx} style={{ color: "#e2e8f0" }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}
        </div>
      </section>
    </>
  );
}

export function ProductTemplate({
  product,
  initialVariant,
  relatedProducts,
}: {
  product: CatalogProduct;
  initialVariant?: string;
  relatedProducts?: CatalogStoreProduct[];
}) {
  return (
    <>
      {product.slug === "snapchat" || product.pageTemplate === "multi_account" ? (
        <MultiAccountTemplate product={product} />
      ) : product.pageTemplate === "gift_card" ? (
        <GiftCardTemplate product={product} initialVariant={initialVariant} />
      ) : (
        <GxProductTemplate product={product} initialVariant={initialVariant} />
      )}
      <RelatedProductsSection currentProduct={product} initialRelatedProducts={relatedProducts} />
    </>
  );
}
