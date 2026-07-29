// Section-based Homepage Builder — foundation types.
// A homepage is an ordered list of sections. Each section has a type
// (mapped in the registry to a renderer + editor + default data) and a
// free-form `data` payload that only that section understands. Adding a
// new section type = adding one entry to the registry — nothing here.

export type SectionType =
  | "hero"
  | "announcement"
  | "carousel"
  | "categories"
  | "bestsellers"
  | "products"
  | "trust"
  | "reviews"
  | "faq"
  | "newsletter";

// Per-section visual controls applied by the wrapper (no code editing).
export type SectionAnimation = "none" | "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom-in";
export type SectionStyle = {
  padding_top?: number;      // px
  padding_bottom?: number;   // px
  bg?: string | null;        // CSS color / gradient; null = inherit theme bg
  container?: "full" | "wide" | "normal" | "narrow";
  align?: "start" | "center" | "end";
  animation?: SectionAnimation;
  animation_duration?: number; // ms
  animation_delay?: number;    // ms
};

export type Section = {
  id: string;
  type: SectionType;
  enabled: boolean;
  data: Record<string, unknown>;
  style?: SectionStyle;
};

// Site-wide theme applied via CSS variables on the homepage wrapper.
export type ThemeConfig = {
  primary?: string;          // accent color (buttons, highlights)
  bg?: string;               // page background
  surface?: string;          // card/section surface
  text?: string;             // main text color
  muted?: string;            // muted text
  radius?: number;           // px — border-radius scale
  font?: "sans" | "display" | "mono";
};

export type HomeLayout = {
  version: 1;
  sections: Section[];
  theme?: ThemeConfig;
};

export const DEFAULT_THEME: ThemeConfig = {
  primary: "#22d3ee",
  bg: "#0b0f1a",
  surface: "#101827",
  text: "#e6edf7",
  muted: "#8a94a7",
  radius: 14,
  font: "sans",
};

// ---------- Per-section data shapes (all fields optional so old rows keep working) ----------

export type HeroData = {
  badge?: string | null;
  title_a?: string | null;
  title_b?: string | null;
  title_c?: string | null;
  subtitle?: string | null;
  cta_primary_text?: string | null;
  cta_primary_link?: string | null;
  cta_secondary_text?: string | null;
  cta_secondary_link?: string | null;
  image_url?: string | null;
};

export type AnnouncementData = {
  text?: string;
  link?: string;
  bg?: string;
  color?: string;
};

export type CarouselSlide = {
  id: string;
  image_url: string;
  image_url_tablet?: string | null;
  image_url_mobile?: string | null;
  title?: string;
  subtitle?: string;
  link?: string;
  starts_at?: string | null; // ISO — publish window start
  ends_at?: string | null;   // ISO — publish window end
  enabled?: boolean;
};
export type CarouselData = {
  autoplay?: boolean;
  interval_ms?: number;
  items?: CarouselSlide[];
};

// Runtime helper — filter carousel slides by enabled flag and schedule window.
export function activeCarouselSlides(items: CarouselSlide[] | undefined): CarouselSlide[] {
  const now = Date.now();
  return (items || []).filter((s) => {
    if (s.enabled === false) return false;
    if (s.starts_at && Date.parse(s.starts_at) > now) return false;
    if (s.ends_at && Date.parse(s.ends_at) < now) return false;
    return true;
  });
}

export type CategoryOverride = { name?: string; desc?: string; accent?: string; hidden?: boolean; sort?: number };
export type CategoriesData = {
  title?: string;
  eyebrow?: string;
  overrides?: Record<string, CategoryOverride>;
};

export type BestsellersData = {
  title?: string;
  eyebrow?: string;
  order?: string[]; // cartId list — items listed first appear first
};

export type ProductsData = {
  title?: string;
  eyebrow?: string;
  ids?: string[]; // cartId list — only these products are shown, in this order
};

export type TrustData = {
  instant_title?: string;
  instant_desc?: string;
  stat_target?: number;
  stat_desc?: string;
  support_title?: string;
  support_desc?: string;
};

export type ReviewItem = {
  id: string;
  name: string;
  initial: string;
  color: string;
  quote_ar?: string;
  quote_en?: string;
};
export type ReviewsData = {
  title?: string;
  eyebrow?: string;
  items?: ReviewItem[];
};

export type FaqItem = { id: string; q: string; a: string };
export type FaqData = { title?: string; items?: FaqItem[] };

export type NewsletterData = {
  title?: string;
  subtitle?: string;
  cta?: string;
  placeholder?: string;
};

// Default layout — used when `home_layout` is not present in site_settings.
export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  version: 1,
  theme: DEFAULT_THEME,
  sections: [
    { id: "sec_hero",         type: "hero",         enabled: true,  data: {} },
    { id: "sec_announcement", type: "announcement", enabled: false, data: { text: "", link: "", bg: "#0f172a", color: "#ffffff" } },
    { id: "sec_carousel",     type: "carousel",     enabled: true,  data: {} },
    { id: "sec_categories",   type: "categories",   enabled: true,  data: {} },
    { id: "sec_bestsellers",  type: "bestsellers",  enabled: true,  data: {} },
    { id: "sec_trust",        type: "trust",        enabled: true,  data: {} },
    { id: "sec_reviews",      type: "reviews",      enabled: true,  data: {} },
    { id: "sec_faq",          type: "faq",          enabled: false, data: {} },
    { id: "sec_newsletter",   type: "newsletter",   enabled: false, data: {} },
  ],
};

// Helper: build CSS style object for a section wrapper from its SectionStyle.
export function sectionWrapperStyle(style?: SectionStyle): React.CSSProperties {
  if (!style) return {};
  const css: React.CSSProperties = {};
  if (style.padding_top != null)    css.paddingTop = `${style.padding_top}px`;
  if (style.padding_bottom != null) css.paddingBottom = `${style.padding_bottom}px`;
  if (style.bg)                     css.background = style.bg;
  if (style.align)                  css.textAlign = style.align === "start" ? "start" : style.align === "end" ? "end" : "center";
  return css;
}

export function containerMaxWidth(c?: SectionStyle["container"]): string {
  switch (c) {
    case "full":   return "100%";
    case "wide":   return "1400px";
    case "narrow": return "760px";
    case "normal":
    default:       return "1160px";
  }
}

// Helper: turn a ThemeConfig into CSS variables applied on the homepage root.
export function themeToCssVars(theme?: ThemeConfig): React.CSSProperties {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const fontStack =
    t.font === "display" ? '"Cairo", "Tajawal", system-ui, sans-serif'
    : t.font === "mono"  ? '"JetBrains Mono", ui-monospace, monospace'
    :                      '"Tajawal", "Cairo", system-ui, sans-serif';
  return {
    ["--gx-primary" as never]: t.primary,
    ["--gx-bg" as never]:      t.bg,
    ["--gx-surface" as never]: t.surface,
    ["--gx-text" as never]:    t.text,
    ["--gx-muted" as never]:   t.muted,
    ["--gx-radius" as never]:  `${t.radius}px`,
    ["--gx-font" as never]:    fontStack,
  } as React.CSSProperties;
}
