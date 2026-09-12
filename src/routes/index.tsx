import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout, type Section } from "@/lib/gx/sections/types";
import { AnimatedSection } from "@/components/gx/AnimatedSection";


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

const SITE_NAVIGATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    {
      "@type": "SiteNavigationElement",
      position: 1,
      name: "الاشتراكات الرقمية",
      description: "اشتراكات رقمية رسمية وسريعة",
      url: "https://gxstore.me/category/subscriptions",
    },
    {
      "@type": "SiteNavigationElement",
      position: 2,
      name: "ألعاب وستيم",
      description: "ألعاب ستيم و PC وبلايستيشن وإكسبوكس",
      url: "https://gxstore.me/category/games",
    },
    {
      "@type": "SiteNavigationElement",
      position: 3,
      name: "بطاقات هدايا وشحن",
      description: "بطاقات بلايستيشن، إكسبوكس، آبل وآيتونز، جوجل بلاي",
      url: "https://gxstore.me/category/gift-cards",
    },
    {
      "@type": "SiteNavigationElement",
      position: 4,
      name: "اشتراك سناب بلس",
      description: "اشتراكات وتفعيل سناب شات بلس رسمي",
      url: "https://gxstore.me/category/snapchat",
    },
    {
      "@type": "SiteNavigationElement",
      position: 5,
      name: "شحن فورت نايت",
      description: "شحن فورت نايت في بوكس وحزم فورت نايت كرو",
      url: "https://gxstore.me/category/fortnite",
    },
    {
      "@type": "SiteNavigationElement",
      position: 6,
      name: "البرامج والتطبيقات",
      description: "برامج وتطبيقات أدوبي وكانفا ومايكروسوفت ومفاتيح ويندوز",
      url: "https://gxstore.me/category/design",
    },
    {
      "@type": "SiteNavigationElement",
      position: 7,
      name: "خدمات السوشال ميديا",
      description: "خدمات وحسابات منصات التواصل الاجتماعي",
      url: "https://gxstore.me/category/social-media",
    },
    {
      "@type": "SiteNavigationElement",
      position: 8,
      name: "كل المنتجات",
      description: "تصفح كافة منتجات متجر GX Store الرقمية",
      url: "https://gxstore.me/products",
    },
  ],
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
      {/* Structured Data: Organization, WebSite & Site Navigation Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_NAVIGATION_SCHEMA) }}
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
    </StoreShell>
  );
}

