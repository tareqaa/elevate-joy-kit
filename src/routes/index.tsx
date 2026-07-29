import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useSiteSettings } from "@/lib/gx/site-settings";
import { SECTION_REGISTRY } from "@/lib/gx/sections/registry";
import { containerMaxWidth, sectionWrapperStyle, themeToCssVars } from "@/lib/gx/sections/types";

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
  const sections = home_layout.sections.filter((s) => s.enabled);
  const themeVars = themeToCssVars(home_layout.theme);
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
            <section key={s.id} style={wrapStyle} data-section={s.type}>
              <div style={{ maxWidth: maxW, margin: "0 auto", width: "100%" }}>
                <Renderer data={s.data} />
              </div>
            </section>
          );
        })}
      </div>
    </StoreShell>
  );
}
