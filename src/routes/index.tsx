import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout } from "@/lib/gx/sections/types";
import { AnimatedSection } from "@/components/gx/AnimatedSection";
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
          
          const SectionComponent = def.Renderer;

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
                <Suspense fallback={<div className="section-loading-placeholder animate-pulse" style={{ height: 300, background: 'rgba(255,255,255,0.03)', borderRadius: 24, margin: '20px 0' }} />}>
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

