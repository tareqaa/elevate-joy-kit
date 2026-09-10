import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout, type Section } from "@/lib/gx/sections/types";
import { AnimatedSection } from "@/components/gx/AnimatedSection";


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
        ].includes(s.type)
    );

    const composed: Section[] = [
      ...topSections,
      { id: "sec_top_categories_bar", type: "top_categories_bar", enabled: true, data: {} },
      { id: "sec_recently_viewed", type: "recently_viewed", enabled: true, data: {} },
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

