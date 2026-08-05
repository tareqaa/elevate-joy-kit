/** Execute esta instrucao no projeto: Part 1 — The core interaction model (read this first, it drives everything)

Important correction: this "+" lives directly on the live homepage itself, inside the actual category grid customers see (the "وين بدك تبدأ؟" section) — not on a separate admin backend page. This is edit-in-place: the admin sees the exact same visual card grid the customer sees, plus one extra "+" card, matching the same size/style as the real category cards.

Adding a new top-level catalog (from the homepage)

When an admin (has_role check, not visible to regular customers) views the homepage, an extra "+" card appears in that same grid, alongside the real category cards (Games, AI, Apps, Snapchat, Gift Cards, etc.).

Clicking it opens a small inline form (a popover or lightweight modal anchored right there, not a navigation to a different screen) with:

Name (Arabic + English)
Icon (emoji/icon picker) or an uploaded image
Accent color (a color picker, used for the card's icon background/glow, matching the style of the existing cards)
Description text — editable, and the admin can clear it completely (leave it empty) if they don't want a description shown under the title on this card.

Submitting it creates a new top-level category and it immediately appears in that same grid on the homepage, in the same visual style as the existing cards.

Adding something inside a catalog (once you click into it)

When the admin opens any catalog's page (e.g. clicking into "Games" or a newly created catalog), they see a "+" inside that catalog's page too. Clicking it asks:

"Add a product" → opens the product creation flow (see Part 2 for the two layout choices, and the step-by-step product wizard from Part 4).
"Add a sub-catalog" → creates a nested category under this one (same name/icon/color/description form as above), which itself can later contain more products or further sub-catalogs, recursively, through the same "+" pattern.

This reuses the existing parent_id / is_main structure already in the categories table — do not invent a parallel hierarchy system. The top-level "+" on the homepage creates a category with parent_id = null; the "+" inside a catalog creates a category with parent_id pointing to the one you're inside.

Keep this simple and instant — when the admin adds a catalog or product this way, it should just work and appear right away, without a multi-step publish/approval flow layered on top of it. Just validate that required fields (name, at least an icon or image) are filled before allowing save, so nothing broken-looking goes live. **/
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars, type HomeLayout } from "@/lib/gx/sections/types";
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
  const sections = layout.sections.filter((s) => s.enabled);
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

