// All section renderers in one file. Each takes its typed `data` prop and
// renders the section for the public homepage. Reuses existing store CSS
// classes so styling stays consistent with the rest of the site.

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CATEGORY_LINKS, getCategoryLink, getFeaturedItems, PRODUCTS_CATALOG, type FeaturedItem } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { ProductIcon, CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { BuyActions } from "@/components/gx/BuyActions";
import { useLang } from "@/lib/gx/i18n";
import { localizedCategoryLink, localizeResolvedName } from "@/lib/gx/product-locale";
import { supabase } from "@/integrations/supabase/client";
import { initialOf, avatarColorFor } from "@/lib/gx/reviews";
import type {
  HeroData, AnnouncementData, CarouselData, CategoriesData,
  BestsellersData, ProductsData, TrustData, ReviewsData, ReviewItem, FaqData, NewsletterData,
} from "./types";
import { activeCarouselSlides } from "./types";
import { RichHtml } from "./rich-text";

/* ---------------- HERO ---------------- */
export function HeroRenderer({ data }: { data: HeroData }) {
  const { t } = useLang();
  const badge = data.badge || t("home.hero_badge");
  const titleA = data.title_a || t("home.hero_title_a");
  const titleB = data.title_b || t("home.hero_title_b");
  const titleC = data.title_c || t("home.hero_title_c");
  const subtitle = data.subtitle || t("home.hero_desc");
  const ctaAText = data.cta_primary_text || t("home.browse_products");
  const ctaALink = data.cta_primary_link || "#products";
  const ctaBText = data.cta_secondary_text || t("home.see_categories");
  const ctaBLink = data.cta_secondary_link || "#categories";
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-inner fade-in">
          <div className="hero-text">
            <div className="hero-badge"><span className="dot" /> {badge}</div>
            <h1>{titleA} <span>{titleB}</span><br />{titleC}</h1>
            <RichHtml as="p" html={subtitle} />
            <div className="hero-ctas">
              <a href={ctaALink} className="btn btn-primary">{ctaAText}</a>
              <a href={ctaBLink} className="btn btn-ghost">{ctaBText}</a>
            </div>
          </div>
          <div className="hero-visual">
            {data.image_url ? (
              <img src={data.image_url} alt="" style={{ maxWidth: "100%", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }} />
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

/* ---------------- ANNOUNCEMENT ---------------- */
export function AnnouncementRenderer({ data }: { data: AnnouncementData }) {
  if (!data.text) return null;
  const inner = (
    <div style={{
      background: data.bg || "#0f172a",
      color: data.color || "#ffffff",
      padding: "10px 16px",
      textAlign: "center",
      fontWeight: 700,
      fontSize: 14,
    }}>{data.text}</div>
  );
  return data.link ? <a href={data.link} style={{ display: "block", textDecoration: "none" }}>{inner}</a> : inner;
}

/* ---------------- CAROUSEL ---------------- */
export function CarouselRenderer({ data }: { data: CarouselData }) {
  const items = activeCarouselSlides(data.items);
  const [idx, setIdx] = useState(0);
  const [vw, setVw] = useState<number>(typeof window === "undefined" ? 1280 : window.innerWidth);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const autoplay = data.autoplay ?? true;
  const interval = Math.max(2000, data.interval_ms || 5000);
  useEffect(() => {
    if (!autoplay || items.length < 2) return;
    const id = setInterval(() => setIdx((v) => (v + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [autoplay, interval, items.length]);
  if (items.length === 0) return null;
  const pickSrc = (b: (typeof items)[number]) =>
    (vw < 640 ? b.image_url_mobile : vw < 1024 ? b.image_url_tablet : null) || b.image_url;
  return (
    <section className="section" style={{ paddingTop: 12, paddingBottom: 0 }}>
      <div className="wrap">
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "21/8", background: "#0b0f1a", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          {items.map((b, i) => (
            <a key={b.id} href={b.link || "#"} style={{ position: "absolute", inset: 0, opacity: i === idx ? 1 : 0, transition: "opacity .6s ease", display: "block" }}>
              <img src={pickSrc(b)} alt={b.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

/* ---------------- CATEGORIES ---------------- */
export function CategoriesRenderer({ data }: { data: CategoriesData }) {
  const { t, lang } = useLang();
  const overrides = data.overrides || {};
  const links = CATEGORY_LINKS
    .map((c) => {
      const meta = overrides[c.slug] || {};
      if (meta.hidden) return null;
      return { ...c, _o_name: meta.name, _o_desc: meta.desc, _o_accent: meta.accent, _sort: typeof meta.sort === "number" ? meta.sort : 999 };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a._sort - b._sort);
  return (
    <section className="section" id="categories">
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">{data.eyebrow || t("home.cat_eyebrow")}</span><h2>{data.title || t("home.cat_title")}</h2></div>
        </div>
        <div className="cat-grid-big">
          {links.map(c0 => {
            const c = localizedCategoryLink(c0, lang);
            const name = c0._o_name || c.name;
            const desc = c0._o_desc || c.desc;
            const accent = c0._o_accent || c.accent;
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

/* ---------------- BESTSELLERS ---------------- */
export function BestsellersRenderer({ data }: { data: BestsellersData }) {
  const { format } = useCurrency();
  const { t, lang } = useLang();
  const order = data.order || [];
  const base = getFeaturedItems();
  const items: FeaturedItem[] = order.length > 0
    ? [...order.map((id) => base.find((b) => b.cartId === id)).filter((x): x is FeaturedItem => !!x),
       ...base.filter((b) => !order.includes(b.cartId))]
    : base;
  return (
    <section className="section" id="products" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">{data.eyebrow || t("home.featured_eyebrow")}</span><h2>{data.title || t("home.featured_title")}</h2></div>
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

/* ---------------- PRODUCTS (custom pick) ---------------- */
export function ProductsRenderer({ data }: { data: ProductsData }) {
  const { format } = useCurrency();
  const { lang } = useLang();
  const base = getFeaturedItems();
  const ids = data.ids || [];
  const items: FeaturedItem[] = ids.length
    ? ids.map((id) => base.find((b) => b.cartId === id)).filter((x): x is FeaturedItem => !!x)
    : [];
  if (items.length === 0) return null;
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            {data.eyebrow ? <span className="k">{data.eyebrow}</span> : null}
            <h2>{data.title || "منتجات مختارة"}</h2>
          </div>
        </div>
        <div className="featured-grid">
          {items.map((p) => {
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
                    {discount > 0 && <span className="discount-badge">-{discount}%</span>}
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

/* ---------------- TRUST ---------------- */
export function TrustRenderer({ data }: { data: TrustData }) {
  const { t } = useLang();
  const counterRef = useRef<HTMLSpanElement>(null);
  const target = data.stat_target ?? 2000;
  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;
    let raf = 0;
    const animate = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now(); const dur = 3800;
      const tick = (t: number) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 5);
        el.textContent = Math.round(eased * target).toLocaleString("en-US");
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((ents) => { ents.forEach(e => { if (e.isIntersecting) animate(); }); }, { threshold: 0.5 });
    const host = el.closest(".trust-item");
    if (host) io.observe(host);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target]);
  return (
    <section className="section">
      <div className="wrap">
        <div className="trust-strip">
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">⚡</div>
            <div className="trust-stat-body"><h4>{data.instant_title || t("home.trust_instant")}</h4><p>{data.instant_desc || t("home.trust_instant_desc")}</p></div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">🛒</div>
            <div className="trust-stat-body">
              <h4 className="stat-number"><span ref={counterRef}>0</span>+</h4>
              <p className="stat-label">{data.stat_desc || t("home.trust_stat_desc")}</p>
            </div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">💬</div>
            <div className="trust-stat-body"><h4>{data.support_title || t("home.trust_support")}</h4><p>{data.support_desc || t("home.trust_support_desc")}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- REVIEWS ---------------- */
const DEFAULT_REVIEWS = [
  { id: "r1", name: "يوسف المومني", initial: "ي", color: "linear-gradient(135deg,#00e5ff,#0a6e8c)", quote_ar: "أفضل متجر بالأسعار", quote_en: "Best store for pricing" },
  { id: "r2", name: "يزن القضاة", initial: "ي", color: "linear-gradient(135deg,#ff2d78,#b0195a)" },
  { id: "r3", name: "زهير زامل", initial: "ز", color: "linear-gradient(135deg,#c6ff3d,#7ea62a)", quote_ar: "التفعيل كان فوري", quote_en: "Activation was instant" },
  { id: "r4", name: "Wessam", initial: "W", color: "linear-gradient(135deg,#b26bff,#6a2df0)", quote_ar: "أنصح فيه بشدة", quote_en: "Highly recommended" },
  { id: "r5", name: "علي", initial: "ع", color: "linear-gradient(135deg,#ffcb47,#c98a12)" },
  { id: "r6", name: "افنان عمر", initial: "ا", color: "linear-gradient(135deg,#4fdc4f,#0e7a3c)", quote_ar: "خدمة ممتازة", quote_en: "Excellent service" },
  { id: "r7", name: "طارق دوعر", initial: "ط", color: "linear-gradient(135deg,#ff8a3d,#c9530f)", quote_ar: "تعامل راقي", quote_en: "Great to deal with" },
  { id: "r8", name: "Sara Alasmar", initial: "S", color: "linear-gradient(135deg,#ff5ea8,#c91e6b)" },
  { id: "r9", name: "Kh H", initial: "K", color: "linear-gradient(135deg,#38bdf8,#1d6fa8)", quote_ar: "سريع وموثوق", quote_en: "Fast and reliable" },
  { id: "r10", name: "Rami Awad", initial: "R", color: "linear-gradient(135deg,#a3e635,#5c8a12)", quote_ar: "تجربة ممتازة", quote_en: "Great experience" },
  { id: "r11", name: "أحمد زامل", initial: "أ", color: "linear-gradient(135deg,#818cf8,#4338ca)", quote_ar: "خدمة رائعة وسريعة", quote_en: "Amazing and fast service" },
];

export function ReviewsRenderer({ data }: { data: ReviewsData }) {
  const { t, lang, dir } = useLang();
  const [dbItems, setDbItems] = useState<ReviewItem[] | null>(null);
  const auto = (data.source ?? "auto") === "auto";

  useEffect(() => {
    if (!auto) { setDbItems(null); return; }
    let alive = true;
    (async () => {
      const { data: rows } = await supabase
        .from("reviews")
        .select("id, display_name, comment, rating, product_name, created_at, is_featured")
        .eq("status", "approved")
        .gte("rating", 4)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (!alive || !rows) return;
      setDbItems(rows.map((r) => ({
        id: r.id,
        name: r.display_name || "عميل GX",
        initial: initialOf(r.display_name),
        color: avatarColorFor(r.id),
        quote_ar: r.comment || undefined,
        quote_en: r.comment || undefined,
        rating: r.rating,
        date: r.created_at,
        product: r.product_name || undefined,
      })));
    })();
    return () => { alive = false; };
  }, [auto]);

  const items: ReviewItem[] =
    (auto && dbItems && dbItems.length > 0)
      ? dbItems
      : (data.items && data.items.length > 0 ? data.items : DEFAULT_REVIEWS);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current; if (!grid) return;
    let paused = false; let resumeAt = 0;
    let loopWidth = grid.scrollWidth / 2; let pos = 0; grid.scrollLeft = 0;
    const onResize = () => { loopWidth = grid.scrollWidth / 2; };
    window.addEventListener("resize", onResize);
    const pause = () => { paused = true; };
    const resumeSoon = () => { pos = grid.scrollLeft; resumeAt = performance.now() + 1500; };
    grid.addEventListener("mouseenter", pause);
    grid.addEventListener("mouseleave", () => { pos = grid.scrollLeft; paused = false; });
    grid.addEventListener("touchstart", pause, { passive: true });
    grid.addEventListener("touchend", resumeSoon, { passive: true });
    let raf = 0; const SPEED = 2.5;
    const step = () => {
      const now = performance.now();
      const active = !paused || now >= resumeAt;
      if (paused && now >= resumeAt) paused = false;
      if (active && loopWidth > 0) {
        if (dir === "rtl") { pos -= SPEED; if (pos <= -loopWidth) pos += loopWidth; }
        else { pos += SPEED; if (pos >= loopWidth) pos -= loopWidth; }
        grid.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [dir, items.length]);

  const cards = [...items, ...items];
  return (
    <section className="section" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head"><div><span className="k">{data.eyebrow || t("home.testi_eyebrow")}</span><h2>{data.title || t("home.testi_title")}</h2></div></div>
        <div className="testi-grid" ref={gridRef}>
          {cards.map((it, i) => {
            const q = lang === "en" ? it.quote_en : it.quote_ar;
            const stars = Math.max(1, Math.min(5, it.rating ?? 5));
            return (
              <div key={`${it.id}-${i}`} className="testi-card">
                <div className="testi-top">
                  <div className="testi-avatar" style={{ background: it.color }}>{it.initial}</div>
                  <div>
                    <div className="testi-name">{it.name}</div>
                    <div className="testi-stars">{"★".repeat(stars)}<span style={{ opacity: .25 }}>{"★".repeat(5 - stars)}</span></div>
                  </div>
                </div>
                {q && <div className="testi-quote">{q}</div>}
                {it.product && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted,#7d92a8)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>{it.product}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
export function FaqRenderer({ data }: { data: FaqData }) {
  const items = data.items || [];
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head"><div><h2>{data.title || "الأسئلة الشائعة"}</h2></div></div>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gap: 10 }}>
          {items.map((it) => {
            const isOpen = open === it.id;
            return (
              <div key={it.id} style={{ background: "var(--bg2)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpen(isOpen ? null : it.id)}
                  style={{ width: "100%", padding: "14px 18px", background: "transparent", border: 0, color: "inherit", textAlign: "start", fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <span>{it.q}</span>
                  <span style={{ opacity: .6, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s", fontSize: 20 }}>+</span>
                </button>
                {isOpen && (
                  <RichHtml html={it.a} style={{ padding: "0 18px 16px", opacity: .8, lineHeight: 1.7 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- NEWSLETTER ---------------- */
export function NewsletterRenderer({ data }: { data: NewsletterData }) {
  return (
    <section className="section" style={{ background: "var(--bg2)" }}>
      <div className="wrap" style={{ textAlign: "center", maxWidth: 620 }}>
        <h2 style={{ marginBottom: 8 }}>{data.title || "اشترك بالنشرة"}</h2>
        <p style={{ opacity: .7, marginBottom: 20 }}>{data.subtitle || "أول من يعرف عن العروض والإصدارات الجديدة"}</p>
        <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8, maxWidth: 460, margin: "0 auto" }}>
          <input type="email" required placeholder={data.placeholder || "بريدك الإلكتروني"}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.04)", color: "inherit", fontSize: 14 }} />
          <button type="submit" className="btn btn-primary">{data.cta || "اشترك"}</button>
        </form>
      </div>
    </section>
  );
}
