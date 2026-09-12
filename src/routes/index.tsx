import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout, type Section } from "@/lib/gx/sections/types";
import { AnimatedSection } from "@/components/gx/AnimatedSection";


import { Link } from "@tanstack/react-router";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GX Store",
  alternateName: ["GXStore", "متجر GX", "GX Store Jordan"],
  url: "https://gxstore.me/",
  logo: "https://gxstore.me/app/assets/img/gx-logo.png",
  image: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg",
  description:
    "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+962776252313",
    contactType: "customer service",
    areaServed: ["JO", "SA", "AE", "KW", "QA", "OM", "BH", "EG", "IQ"],
    availableLanguage: ["Arabic", "English"],
  },
  sameAs: ["https://wa.me/962776252313"],
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GX Store",
  alternateName: ["GXStore", "متجر GX", "GX Store Jordan"],
  url: "https://gxstore.me/",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://gxstore.me/products?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        name: "description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
      { property: "og:site_name", content: "GX Store" },
      { property: "og:title", content: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        property: "og:description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gxstore.me/" },
      { property: "og:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GX Store | متجر ألعاب واشتراكات رقمية" },
      {
        name: "twitter:description",
        content:
          "GX Store متجر رقمي للألعاب والاشتراكات. اشتراكات، بطاقات هدايا، عملات ألعاب وخدمات رقمية بتفعيل سريع وأسعار منافسة.",
      },
      { name: "twitter:image", content: "https://gxstore.me/app/assets/img/gx-logo-hires.jpg" },
      {
        name: "keywords",
        content:
          "GX Store, GXStore, GX Store Jordan, متجر GX, متجر ألعاب, متجر اشتراكات, اشتراكات رقمية, بطاقات ألعاب, شحن ألعاب, فورت نايت, ستيم, ألعاب PC, بطاقات بلايستيشن, بطاقات إكسبوكس",
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
    ],
    links: [
      ...STORE_HEAD_LINKS,
      { rel: "canonical", href: "https://gxstore.me/" },
    ],
  }),
  component: Home,
});

function Home() {
  const { home_layout } = useSiteSettings();
  const [draftLayout, setDraftLayout] = useState<HomeLayout | null>(null);
  const isDraftPreview =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "draft";

  useEffect(() => {
    if (!isDraftPreview) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("site_settings").select("value").eq("key", "home_layout_draft").maybeSingle();
      const v = data?.value as unknown;
      if (alive && v && typeof v === "object" && Array.isArray((v as HomeLayout).sections)) {
        setDraftLayout(v as HomeLayout);
      }
    })();
    return () => { alive = false; };
  }, [isDraftPreview]);

  const layout = draftLayout ?? home_layout;

  // Ensure sections render in the exact sequence requested by the user:
  // 1. Hero / Carousel
  // 2. Top Categories Bar (top_categories_bar)
  // 3. Recently Viewed (recently_viewed)
  // 4. Best Selling in Store (bestsellers)
  // 5. Discover Games By Category (discover_genres - auto-scrolling marquee)
  // 6. Best Selling Games (best_selling_games)
  // 7. Best Selling Gift Cards (gamepoints)
  // 8. Discover By Price (discover_price)
  // 9. Categories Grid & Trust & Reviews
  const sections = useMemo(() => {
    const rawList = layout?.sections || [];

    const topSections = rawList.filter((s) => ["hero", "announcement", "carousel"].includes(s.type));
    const bestsellersSection = rawList.find((s) => s.type === "bestsellers") ?? {
      id: "sec_bestsellers",
      type: "bestsellers" as const,
      enabled: true,
      data: {},
    };
    const remainingSections = rawList.filter(
      (s) =>
        ![
          "hero",
          "announcement",
          "carousel",
          "bestsellers",
          "top_categories_bar",
          "recently_viewed",
          "discover_genres",
          "best_selling_games",
          "gamepoints",
          "discover_price",
          "categories",
        ].includes(s.type)
    );

    const composed: Section[] = [
      ...topSections,
      { id: "sec_categories", type: "categories", enabled: true, data: {} },
      bestsellersSection,
      { id: "sec_discover_genres", type: "discover_genres", enabled: true, data: {} },
      { id: "sec_best_selling_games", type: "best_selling_games", enabled: true, data: {} },
      { id: "sec_gamepoints", type: "gamepoints", enabled: true, data: {} },
      { id: "sec_discover_price", type: "discover_price", enabled: true, data: {} },
      ...remainingSections,
    ];

    return composed.filter((s) => s.enabled);
  }, [layout.sections]);

  const themeVars = themeToCssVars(layout.theme);

  return (
    <StoreShell>
      {/* Structured Data: Organization & WebSite Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
      />

      <div className="gx-home-root" style={themeVars}>
        {sections.map((s) => {
          const def = SECTION_REGISTRY[s.type];
          if (!def) return null;
          const { Renderer } = def;
          const wrapStyle = sectionWrapperStyle(s.style);
          const maxW = containerMaxWidth(s.style?.container);
          return (
            <AnimatedSection
              key={s.id}
              animation={s.style?.animation ?? "none"}
              duration={s.style?.animation_duration ?? 600}
              delay={s.style?.animation_delay ?? 0}
              style={wrapStyle}
              dataAttrs={{ "data-section": s.type }}
            >
              <div style={{ maxWidth: maxW, margin: "0 auto", width: "100%" }}>
                <Renderer data={s.data} />
              </div>
            </AnimatedSection>
          );
        })}
      </div>

      {/* Semantic SEO Section for Google indexing & Sitelinks */}
      <section
        className="gx-seo-store-section"
        aria-labelledby="gx-store-seo-heading"
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          background: "linear-gradient(180deg, rgba(13, 17, 26, 0.4), rgba(9, 11, 16, 0.95))",
          padding: "38px 0 30px",
          marginTop: "20px",
        }}
      >
        <div className="wrap" style={{ maxWidth: 1140, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center" }}>
            <h2
              id="gx-store-seo-heading"
              style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                color: "#f5f6f8",
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              GX Store | متجر الألعاب والاشتراكات الرقمية في الأردن والشرق الأوسط
            </h2>
            <p
              style={{
                fontSize: "0.92rem",
                color: "#94a3b8",
                lineHeight: 1.75,
                margin: "0 auto 22px",
                maxWidth: 820,
              }}
            >
              مرحباً بكم في <strong>GX Store</strong> (متجر GX)، وجهتك الرقمية المعتمدة لشراء وتفعيل الاشتراكات الرقمية، بطاقات الهدايا والشحن، مفاتيح الألعاب والبرامج الأصلية بأسعار منافسة وتفعيل رسمي فوري. نوفر اشتراكات سناب بلس، شحن فورت نايت، بطاقات بلايستيشن، إكسبوكس، آبل وآيتونز، جوجل بلاي، ومكتبة ألعاب ستيم و PC وبرامج التصميم مع دعم فني سريع ومتواصل عبر واتساب.
            </p>

            {/* Semantic Internal Navigation for Sitelinks */}
            <nav
              aria-label="أقسام متجر GX Store الرئيسية"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
                marginTop: 14,
              }}
            >
              <Link
                to="/category/subscriptions"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.28)",
                  color: "#c084fc",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                ⚡ الاشتراكات الرقمية
              </Link>
              <Link
                to="/category/games"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(5, 223, 114, 0.12)",
                  border: "1px solid rgba(5, 223, 114, 0.28)",
                  color: "#4ade80",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🎮 ألعاب وستيم
              </Link>
              <Link
                to="/category/gift-cards"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 45, 120, 0.12)",
                  border: "1px solid rgba(255, 45, 120, 0.28)",
                  color: "#f472b6",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🎁 بطاقات هدايا وشحن
              </Link>
              <Link
                to="/category/snapchat"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 214, 0, 0.12)",
                  border: "1px solid rgba(255, 214, 0, 0.28)",
                  color: "#facc15",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                👻 اشتراك سناب بلس
              </Link>
              <Link
                to="/category/fortnite"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(0, 229, 255, 0.12)",
                  border: "1px solid rgba(0, 229, 255, 0.28)",
                  color: "#38bdf8",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🪂 شحن فورت نايت
              </Link>
              <Link
                to="/category/design"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.28)",
                  color: "#60a5fa",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                🧩 البرامج والتطبيقات
              </Link>
              <Link
                to="/category/social-media"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.12)",
                  border: "1px solid rgba(168, 85, 247, 0.28)",
                  color: "#a855f7",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                📱 خدمات السوشال ميديا
              </Link>
              <Link
                to="/products"
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                ✨ عرض كل المنتجات
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </StoreShell>
  );
}

