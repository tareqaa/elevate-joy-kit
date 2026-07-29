import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { CATEGORY_LINKS, getCategoryLink, getFeaturedItems, type FeaturedItem } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { ProductIcon, CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { PRODUCTS_CATALOG } from "@/data/products";
import { BuyActions } from "@/components/gx/BuyActions";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink, localizeResolvedName } from "@/lib/gx/product-locale";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GX Store — Games & digital subscriptions store" },
      { name: "description", content: "Subscriptions, game cards, and instant activation — GX Store." },
      { property: "og:title", content: "GX Store" },
      { property: "og:description", content: "Your digital store for all subscriptions and game cards." },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: Home,
});

function Home() {
  return (
    <StoreShell>
      <Hero />
      <BannerCarousel />
      <Categories />
      <Featured />
      <TrustStrip />
      <Testimonials />
    </StoreShell>
  );
}

function Hero() {
  const { t } = useLang();
  const { home_hero } = useSiteSettings();
  if (!home_hero.enabled) return null;
  const badge = home_hero.badge || t("home.hero_badge");
  const titleA = home_hero.title_a || t("home.hero_title_a");
  const titleB = home_hero.title_b || t("home.hero_title_b");
  const titleC = home_hero.title_c || t("home.hero_title_c");
  const subtitle = home_hero.subtitle || t("home.hero_desc");
  const ctaAText = home_hero.cta_primary_text || t("home.browse_products");
  const ctaALink = home_hero.cta_primary_link || "#products";
  const ctaBText = home_hero.cta_secondary_text || t("home.see_categories");
  const ctaBLink = home_hero.cta_secondary_link || "#categories";
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-inner fade-in">
          <div className="hero-text">
            <div className="hero-badge"><span className="dot" /> {badge}</div>
            <h1>{titleA} <span>{titleB}</span><br />{titleC}</h1>
            <p>{subtitle}</p>
            <div className="hero-ctas">
              <a href={ctaALink} className="btn btn-primary">{ctaAText}</a>
              <a href={ctaBLink} className="btn btn-ghost">{ctaBText}</a>
            </div>
          </div>
          <div className="hero-visual">
            {home_hero.image_url ? (
              <img src={home_hero.image_url} alt="" style={{ maxWidth: "100%", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }} />
            ) : (
              <>
                <div className="orb" />
                <div className="orb-core">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth={1.4}><rect x="2" y="7" width="20" height="12" rx="4" /><circle cx="8" cy="13" r="1.6" fill="#00e5ff" stroke="none" /><circle cx="6" cy="11" r="0.4" fill="#00e5ff" stroke="none" /><path d="M15 11h4M17 9v4" stroke="#ff2d78" /></svg>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BannerCarousel() {
  const { home_banners } = useSiteSettings();
  const [idx, setIdx] = useState(0);
  const items = home_banners.items || [];
  const enabled = home_banners.enabled && items.length > 0;
  useEffect(() => {
    if (!enabled || !home_banners.autoplay || items.length < 2) return;
    const id = setInterval(() => setIdx((v) => (v + 1) % items.length), Math.max(2000, home_banners.interval_ms || 5000));
    return () => clearInterval(id);
  }, [enabled, home_banners.autoplay, home_banners.interval_ms, items.length]);
  if (!enabled) return null;
  return (
    <section className="section" style={{ paddingTop: 12, paddingBottom: 0 }}>
      <div className="wrap">
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "21/8", background: "#0b0f1a", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          {items.map((b, i) => (
            <a key={b.id} href={b.link || "#"} style={{ position: "absolute", inset: 0, opacity: i === idx ? 1 : 0, transition: "opacity .6s ease", display: "block" }}>
              <img src={b.image_url} alt={b.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {(b.title || b.subtitle) && (
                <div style={{ position: "absolute", insetInlineStart: 24, bottom: 24, background: "rgba(0,0,0,.45)", padding: "10px 16px", borderRadius: 12, color: "#fff", backdropFilter: "blur(6px)" }}>
                  {b.title && <div style={{ fontWeight: 900, fontSize: 20 }}>{b.title}</div>}
                  {b.subtitle && <div style={{ fontSize: 13, opacity: .9 }}>{b.subtitle}</div>}
                </div>
              )}
            </a>
          ))}
          {items.length > 1 && (
            <div style={{ position: "absolute", bottom: 10, insetInlineEnd: 16, display: "flex", gap: 6 }}>
              {items.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
                  style={{ width: i === idx ? 24 : 10, height: 10, borderRadius: 99, background: i === idx ? "#00e5ff" : "rgba(255,255,255,.5)", border: 0, cursor: "pointer", transition: "all .2s" }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const { t, lang } = useLang();
  const { home_categories_meta } = useSiteSettings();
  const links = CATEGORY_LINKS
    .map((c) => {
      const meta = home_categories_meta[c.slug] || {};
      if (meta.hidden) return null;
      return {
        ...c,
        _override_name: meta.name,
        _override_desc: meta.desc,
        _override_accent: meta.accent,
        _sort: typeof meta.sort === "number" ? meta.sort : 999,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a._sort - b._sort);
  return (
    <section className="section" id="categories">
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">{t("home.cat_eyebrow")}</span><h2>{t("home.cat_title")}</h2></div>
        </div>
        <div className="cat-grid-big">
          {links.map(c0 => {
            const c = localizedCategoryLink(c0, lang);
            const name = c0._override_name || c.name;
            const desc = c0._override_desc || c.desc;
            const accent = c0._override_accent || c.accent;
            return (
              <Link key={c.slug} to={getCategoryLink(c.slug) as never} className="cat-card-big" style={{ ["--accent" as string]: accent } as React.CSSProperties}>
                <div className="ccb-top">
                  {c.slug === "design" ? (
                    <div className="app-icon-grid">
                      <span style={{ background: "linear-gradient(135deg,#3b7bf6,#1e4fd1)" }}>Ps</span>
                      <span style={{ background: "linear-gradient(135deg,#ff7a3d,#e0402a)" }}>Ai</span>
                      <span style={{ background: "linear-gradient(135deg,#8b5cf6,#5b21b6)" }}>Pr</span>
                      <span style={{ background: "linear-gradient(135deg,#22c1a8,#0e7a6a)" }}>Id</span>
                    </div>
                  ) : (
                    <div className="cat-ic" style={{ background: c.bg, boxShadow: `inset 0 0 0 1.5px ${accent}33` }}>{c.icon}</div>
                  )}
                  <div className="ccb-glow" style={{ background: accent }} />
                </div>
                <div>
                  <div className="cname-modern">{name}</div>
                  <div className="cdesc">{desc}</div>
                </div>
                <div className="carrow">{t("home.browse_category")} <span className="arrow-ic">‹</span></div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const { home_bestseller_order } = useSiteSettings();
  const base = getFeaturedItems();
  const items: FeaturedItem[] = home_bestseller_order.length > 0
    ? [...home_bestseller_order.map((id) => base.find((b) => b.cartId === id)).filter((x): x is FeaturedItem => !!x),
       ...base.filter((b) => !home_bestseller_order.includes(b.cartId))]
    : base;
  return (
    <section className="section" id="products" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">{t("home.featured_eyebrow")}</span><h2>{t("home.featured_title")}</h2></div>
        </div>
        <div className="featured-grid">
          {items.map(p => {
            const discount = Math.round((1 - p.price / p.oldPrice) * 100);
            const product = PRODUCTS_CATALOG[p.product];
            let iconEl: React.ReactNode = <ProductIcon product={product} />;
            if (p.product === "fortnite" && p.cartId.startsWith("fn-crew")) iconEl = <CrewIcon />;
            else if (p.product === "fortnite" && p.cartId.startsWith("fn-vb")) {
              const tier = parseInt(p.cartId.replace("fn-vb-", ""), 10);
              iconEl = <VbucksIcon tier={tier} />;
            }
            return (
              <div key={p.cartId} className="prod-card">
                <Link to={p.link as never} style={{ display: "contents" }}>
                  <div className="prod-thumb" style={{ background: p.bg }}>
                    <span className="discount-badge">-{discount}%</span>
                    {iconEl}
                  </div>
                </Link>
                <div className="prod-body">
                  <div className="prod-stars">★★★★★</div>
                  <div className="prod-name">{localizeResolvedName(p.name, lang)}</div>
                  <div className="prod-prices">
                    <span className="prod-old">{format(p.oldPrice)}</span>
                    <span className="prod-new">{format(p.price)}</span>
                  </div>
                  <BuyActions cartId={p.cartId} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { t } = useLang();
  const counterRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;
    const target = 2000;
    let raf = 0;
    const animate = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const dur = 3800;
      const tick = (t: number) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 5);
        el.textContent = Math.round(eased * target).toLocaleString("en-US");
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) animate(); });
    }, { threshold: 0.5 });
    const host = el.closest(".trust-item");
    if (host) io.observe(host);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section className="section">
      <div className="wrap">
        <div className="trust-strip">
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">⚡</div>
            <div className="trust-stat-body"><h4>{t("home.trust_instant")}</h4><p>{t("home.trust_instant_desc")}</p></div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">🛒</div>
            <div className="trust-stat-body">
              <h4 className="stat-number"><span ref={counterRef}>0</span>+</h4>
              <p className="stat-label">{t("home.trust_stat_desc")}</p>
            </div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">💬</div>
            <div className="trust-stat-body"><h4>{t("home.trust_support")}</h4><p>{t("home.trust_support_desc")}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "يوسف المومني", initial: "ي", color: "linear-gradient(135deg,#00e5ff,#0a6e8c)", quote: "أفضل متجر بالأسعار", quote_en: "Best store for pricing" },
  { name: "يزن القضاة", initial: "ي", color: "linear-gradient(135deg,#ff2d78,#b0195a)", quote: null, quote_en: null },
  { name: "زهير زامل", initial: "ز", color: "linear-gradient(135deg,#c6ff3d,#7ea62a)", quote: "التفعيل كان فوري", quote_en: "Activation was instant" },
  { name: "Wessam", initial: "W", color: "linear-gradient(135deg,#b26bff,#6a2df0)", quote: "أنصح فيه بشدة", quote_en: "Highly recommended" },
  { name: "علي", initial: "ع", color: "linear-gradient(135deg,#ffcb47,#c98a12)", quote: null, quote_en: null },
  { name: "افنان عمر", initial: "ا", color: "linear-gradient(135deg,#4fdc4f,#0e7a3c)", quote: "خدمة ممتازة", quote_en: "Excellent service" },
  { name: "طارق دوعر", initial: "ط", color: "linear-gradient(135deg,#ff8a3d,#c9530f)", quote: "تعامل راقي", quote_en: "Great to deal with" },
  { name: "Sara Alasmar", initial: "S", color: "linear-gradient(135deg,#ff5ea8,#c91e6b)", quote: null, quote_en: null },
  { name: "Kh H", initial: "K", color: "linear-gradient(135deg,#38bdf8,#1d6fa8)", quote: "سريع وموثوق", quote_en: "Fast and reliable" },
  { name: "Rami Awad", initial: "R", color: "linear-gradient(135deg,#a3e635,#5c8a12)", quote: "تجربة ممتازة", quote_en: "Great experience" },
  { name: "أحمد زامل", initial: "أ", color: "linear-gradient(135deg,#818cf8,#4338ca)", quote: "خدمة رائعة وسريعة", quote_en: "Amazing and fast service" },
];

function Testimonials() {
  const { t, lang, dir } = useLang();
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let paused = false;
    let resumeAt = 0;
    let loopWidth = grid.scrollWidth / 2;
    let pos = 0;
    grid.scrollLeft = 0;
    const onResize = () => { loopWidth = grid.scrollWidth / 2; };
    window.addEventListener("resize", onResize);
    const pause = () => { paused = true; };
    const resumeSoon = () => {
      pos = grid.scrollLeft;
      resumeAt = performance.now() + 1500;
    };
    grid.addEventListener("mouseenter", pause);
    grid.addEventListener("mouseleave", () => { pos = grid.scrollLeft; paused = false; });
    grid.addEventListener("touchstart", pause, { passive: true });
    grid.addEventListener("touchend", resumeSoon, { passive: true });
    grid.addEventListener("touchcancel", resumeSoon, { passive: true });
    let raf = 0;
    const SPEED = 2.5;
    const step = () => {
      const now = performance.now();
      const active = !paused || now >= resumeAt;
      if (paused && now >= resumeAt) { paused = false; }
      if (active && loopWidth > 0) {
        if (dir === "rtl") {
          pos -= SPEED;
          if (pos <= -loopWidth) pos += loopWidth;
        } else {
          pos += SPEED;
          if (pos >= loopWidth) pos -= loopWidth;
        }
        grid.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [dir]);

  const cards = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="section" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head"><div><span className="k">{t("home.testi_eyebrow")}</span><h2>{t("home.testi_title")}</h2></div></div>
        <div className="testi-grid" ref={gridRef}>
          {cards.map((tItem, i) => {
            const quote = lang === "en" ? tItem.quote_en : tItem.quote;
            return (
              <div key={i} className="testi-card">
                <div className="testi-top">
                  <div className="testi-avatar" style={{ background: tItem.color }}>{tItem.initial}</div>
                  <div>
                    <div className="testi-name">{tItem.name}</div>
                    <div className="testi-stars">★★★★★</div>
                  </div>
                </div>
                {quote && <div className="testi-quote">{quote}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
