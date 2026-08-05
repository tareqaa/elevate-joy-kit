import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout } from "@/lib/gx/sections/types";
import { AnimatedSection } from "@/components/gx/AnimatedSection";

// Lazy load heavy section components to speed up initial hydration
const HeroRenderer = lazy(() => import("@/lib/gx/sections/renderers").then(m => ({ default: m.HeroRenderer })));
const CarouselRenderer = lazy(() => import("@/lib/gx/sections/renderers").then(m => ({ default: m.CarouselRenderer })));
const TrustRenderer = lazy(() => import("@/lib/gx/sections/renderers").then(m => ({ default: m.TrustRenderer })));
const ReviewsRenderer = lazy(() => import("@/lib/gx/sections/renderers").then(m => ({ default: m.ReviewsRenderer })));

// Critical sections kept synchronous or mapped via registry for direct access
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";


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
  const sections = layout.sections.filter((s) => s.enabled);
  const themeVars = themeToCssVars(layout.theme);

  return (
    <StoreShell>
      <div className="gx-home-root" style={themeVars}>
        {sections.map((s) => {
          const def = SECTION_REGISTRY[s.type];
          if (!def) return null;
          
          // Use specific lazy renderers for heavy sections to avoid blocking hydration
          let SectionComponent = def.Renderer;
          if (s.type === "hero") SectionComponent = HeroRenderer as any;
          else if (s.type === "carousel") SectionComponent = CarouselRenderer as any;
          else if (s.type === "trust") SectionComponent = TrustRenderer as any;
          else if (s.type === "reviews") SectionComponent = ReviewsRenderer as any;

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
                <Suspense fallback={<div className="section-loading-placeholder" style={{ height: 300, background: 'rgba(255,255,255,0.02)', borderRadius: 20 }} />}>
                  <SectionComponent data={s.data} />
                </Suspense>
              </div>
            </AnimatedSection>
          );
        })}
      </div>
    </StoreShell>
  );
}

