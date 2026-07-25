import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { CATEGORY_LINKS, getCategoryLink, getFeaturedItems } from "@/data/products";
import { useCurrency } from "@/lib/gx/currency";
import { ProductIcon, CrewIcon, VbucksIcon } from "@/lib/gx/brand-icons";
import { PRODUCTS_CATALOG } from "@/data/products";
import { BuyActions } from "@/components/gx/BuyActions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GX Store — متجر الألعاب والاشتراكات الرقمية" },
      { name: "description", content: "اشتراكات، بطاقات ألعاب، وتفعيل فوري — GX Store." },
      { property: "og:title", content: "GX Store" },
      { property: "og:description", content: "متجرك الرقمي لكل الاشتراكات وبطاقات الألعاب." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <StoreShell>
      <Hero />
      <Categories />
      <Featured />
      <TrustStrip />
      <Testimonials />
    </StoreShell>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <div className="hero-inner fade-in">
          <div className="hero-text">
            <div className="hero-badge"><span className="dot" /> أكثر من 500 عميل وثقوا فينا</div>
            <h1>كل اشتراكاتك <span>وشحن ألعابك</span><br />بمكان واحد</h1>
            <p>اشتراكات، بطاقات هدايا، عملات ألعاب، وحسابات — تفعيل فوري وأسعار منافسة.</p>
            <div className="hero-ctas">
              <a href="#products" className="btn btn-primary">تصفح المنتجات</a>
              <a href="#categories" className="btn btn-ghost">شوف الأقسام</a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orb" />
            <div className="orb-core">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth={1.4}><rect x="2" y="7" width="20" height="12" rx="4" /><circle cx="8" cy="13" r="1.6" fill="#00e5ff" stroke="none" /><circle cx="6" cy="11" r="0.4" fill="#00e5ff" stroke="none" /><path d="M15 11h4M17 9v4" stroke="#ff2d78" /></svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  return (
    <section className="section" id="categories">
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">تصفح حسب القسم</span><h2>وين بدك تبدأ؟</h2></div>
        </div>
        <div className="cat-grid-big">
          {CATEGORY_LINKS.map(c => (
            <a key={c.slug} href={getCategoryLink(c.slug)} className="cat-card-big" style={{ ["--accent" as string]: c.accent } as React.CSSProperties}>
              <div className="ccb-top">
                {c.slug === "design" ? (
                  <div className="app-icon-grid">
                    <span style={{ background: "linear-gradient(135deg,#3b7bf6,#1e4fd1)" }}>Ps</span>
                    <span style={{ background: "linear-gradient(135deg,#ff7a3d,#e0402a)" }}>Ai</span>
                    <span style={{ background: "linear-gradient(135deg,#8b5cf6,#5b21b6)" }}>Pr</span>
                    <span style={{ background: "linear-gradient(135deg,#22c1a8,#0e7a6a)" }}>Id</span>
                  </div>
                ) : (
                  <div className="cat-ic" style={{ background: c.bg, boxShadow: `inset 0 0 0 1.5px ${c.accent}33` }}>{c.icon}</div>
                )}
                <div className="ccb-glow" style={{ background: c.accent }} />
              </div>
              <div>
                <div className="cname-modern">{c.name}</div>
                <div className="cdesc">{c.desc}</div>
              </div>
              <div className="carrow">تصفح القسم <span className="arrow-ic">‹</span></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const { format } = useCurrency();
  const items = getFeaturedItems();
  return (
    <section className="section" id="products" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head">
          <div><span className="k">🔥 الأكثر طلبًا</span><h2>منتجاتنا الأكثر مبيعًا</h2></div>
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
                <a href={p.link} style={{ display: "contents" }}>
                  <div className="prod-thumb" style={{ background: p.bg }}>
                    <span className="discount-badge">-{discount}%</span>
                    {iconEl}
                  </div>
                </a>
                <div className="prod-body">
                  <div className="prod-stars">★★★★★</div>
                  <div className="prod-name">{p.name}</div>
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
            <div className="trust-stat-body"><h4>تفعيل فوري</h4><p>خلال دقائق من تأكيد الطلب</p></div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">🛒</div>
            <div className="trust-stat-body">
              <h4 className="stat-number"><span ref={counterRef}>0</span>+</h4>
              <p className="stat-label">عملية شراء آمنة تمت عبر المتجر</p>
            </div>
          </div>
          <div className="trust-item trust-item--stat">
            <div className="trust-ic stat-ic">💬</div>
            <div className="trust-stat-body"><h4>دعم 24/7</h4><p>تواصل مباشر على واتساب</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "يوسف المومني", initial: "ي", color: "linear-gradient(135deg,#00e5ff,#0a6e8c)", quote: "أفضل متجر بالأسعار" },
  { name: "يزن القضاة", initial: "ي", color: "linear-gradient(135deg,#ff2d78,#b0195a)", quote: null },
  { name: "زهير زامل", initial: "ز", color: "linear-gradient(135deg,#c6ff3d,#7ea62a)", quote: "التفعيل كان فوري" },
  { name: "Wessam", initial: "W", color: "linear-gradient(135deg,#b26bff,#6a2df0)", quote: "أنصح فيه بشدة" },
  { name: "علي", initial: "ع", color: "linear-gradient(135deg,#ffcb47,#c98a12)", quote: null },
  { name: "افنان عمر", initial: "ا", color: "linear-gradient(135deg,#4fdc4f,#0e7a3c)", quote: "خدمة ممتازة" },
  { name: "طارق دوعر", initial: "ط", color: "linear-gradient(135deg,#ff8a3d,#c9530f)", quote: "تعامل راقي" },
  { name: "Sara Alasmar", initial: "S", color: "linear-gradient(135deg,#ff5ea8,#c91e6b)", quote: null },
  { name: "Kh H", initial: "K", color: "linear-gradient(135deg,#38bdf8,#1d6fa8)", quote: "سريع وموثوق" },
  { name: "Rami Awad", initial: "R", color: "linear-gradient(135deg,#a3e635,#5c8a12)", quote: "تجربة ممتازة" },
  { name: "أحمد زامل", initial: "أ", color: "linear-gradient(135deg,#818cf8,#4338ca)", quote: "خدمة رائعة وسريعة" },
];

function Testimonials() {
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let paused = false;
    let loopWidth = grid.scrollWidth / 2;
    let pos = 0;
    const onResize = () => { loopWidth = grid.scrollWidth / 2; };
    window.addEventListener("resize", onResize);
    const enter = () => { paused = true; };
    const leave = () => { pos = grid.scrollLeft; paused = false; };
    grid.addEventListener("mouseenter", enter);
    grid.addEventListener("mouseleave", leave);
    let raf = 0;
    const SPEED = 2.5;
    const step = () => {
      if (!paused && loopWidth > 0) {
        pos -= SPEED;
        if (pos <= -loopWidth) pos += loopWidth;
        grid.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      grid.removeEventListener("mouseenter", enter);
      grid.removeEventListener("mouseleave", leave);
    };
  }, []);
  const cards = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="section" style={{ background: "var(--bg2)" }}>
      <div className="wrap">
        <div className="section-head"><div><span className="k">قالوا عنا</span><h2>آراء عملائنا</h2></div></div>
        <div className="testi-grid" ref={gridRef}>
          {cards.map((t, i) => (
            <div key={i} className="testi-card">
              <div className="testi-top">
                <div className="testi-avatar" style={{ background: t.color }}>{t.initial}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-stars">★★★★★</div>
                </div>
              </div>
              {t.quote && <div className="testi-quote">{t.quote}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
