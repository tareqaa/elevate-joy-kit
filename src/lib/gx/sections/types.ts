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
  | "trust"
  | "reviews"
  | "faq"
  | "newsletter";

export type Section = {
  id: string;
  type: SectionType;
  enabled: boolean;
  data: Record<string, unknown>;
};

export type HomeLayout = {
  version: 1;
  sections: Section[];
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
  title?: string;
  subtitle?: string;
  link?: string;
};
export type CarouselData = {
  autoplay?: boolean;
  interval_ms?: number;
  items?: CarouselSlide[];
};

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
