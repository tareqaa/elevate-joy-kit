import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HOME_LAYOUT, type HomeLayout } from "./sections/types";
import {
  applyCatalogPrices,
  cacheCatalogPrices,
  CATALOG_PRICES_KEY,
  type CatalogPrices,
} from "./catalog-prices";

export type HomeHero = {
  enabled: boolean;
  badge: string | null;
  title_a: string | null;
  title_b: string | null;
  title_c: string | null;
  subtitle: string | null;
  cta_primary_text: string | null;
  cta_primary_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  image_url: string | null;
};

export type HomeBannerItem = {
  id: string;
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
};

export type HomeBanners = {
  enabled: boolean;
  autoplay: boolean;
  interval_ms: number;
  items: HomeBannerItem[];
};

export type HomeCategoryOverride = {
  name?: string | null;
  desc?: string | null;
  accent?: string | null;
  hidden?: boolean;
  sort?: number;
};

export type SiteSettings = {
  store_name: string;
  default_currency: string;
  order_completion_hours: number;
  support_whatsapp: string;
  support_email: string;
  social_instagram: string;
  social_facebook: string;
  social_tiktok: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  home_hero: HomeHero;
  home_banners: HomeBanners;
  home_categories_meta: Record<string, HomeCategoryOverride>;
  home_subcategories_meta: Record<string, HomeCategoryOverride>;
  home_bestseller_order: string[];
  home_layout: HomeLayout;
  catalog_prices: CatalogPrices;
};

const DEFAULT_HERO: HomeHero = {
  enabled: true, badge: null, title_a: null, title_b: null, title_c: null,
  subtitle: null, cta_primary_text: null, cta_primary_link: null,
  cta_secondary_text: null, cta_secondary_link: null, image_url: null,
};
const DEFAULT_BANNERS: HomeBanners = { enabled: false, autoplay: true, interval_ms: 5000, items: [] };

const DEFAULTS: SiteSettings = {
  store_name: "GX STORE",
  default_currency: "JOD",
  order_completion_hours: 24,
  support_whatsapp: "962776252313",
  support_email: "support@gxstore.com",
  social_instagram: "",
  social_facebook: "",
  social_tiktok: "",
  maintenance_mode: false,
  maintenance_message: "الموقع تحت الصيانة حالياً — راجعنا خلال قليل.",
  home_hero: DEFAULT_HERO,
  home_banners: DEFAULT_BANNERS,
  home_categories_meta: {},
  home_subcategories_meta: {},
  home_bestseller_order: [],
  home_layout: DEFAULT_HOME_LAYOUT,
  catalog_prices: {},
};

const CACHE_KEY = "gx_site_settings_v2";
const Ctx = createContext<SiteSettings>(DEFAULTS);

function readCache(): SiteSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(readCache);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data } = await supabase.from("site_settings").select("key,value");
      if (!mounted || !data) return;
      const merged: SiteSettings = { ...DEFAULTS };
      for (const row of data) {
        const k = row.key as keyof SiteSettings;
        const v = row.value as unknown;
        if (k in merged) (merged as Record<string, unknown>)[k] = v as never;
      }
      // Ensure nested defaults for objects
      merged.home_hero = { ...DEFAULT_HERO, ...(merged.home_hero || {}) };
      merged.home_banners = { ...DEFAULT_BANNERS, ...(merged.home_banners || {}) };
      merged.home_categories_meta = merged.home_categories_meta || {};
      merged.home_subcategories_meta = merged.home_subcategories_meta || {};
      merged.home_bestseller_order = Array.isArray(merged.home_bestseller_order) ? merged.home_bestseller_order : [];
      // Normalize home_layout — accept partial rows and fill missing sections keys.
      const rawLayout = merged.home_layout as unknown;
      if (!rawLayout || typeof rawLayout !== "object" || !Array.isArray((rawLayout as HomeLayout).sections)) {
        merged.home_layout = DEFAULT_HOME_LAYOUT;
      } else {
        // Ensure theme exists so renderers always get CSS variables.
        const l = merged.home_layout as HomeLayout;
        if (!l.theme) merged.home_layout = { ...l, theme: DEFAULT_HOME_LAYOUT.theme };
      }
      merged.catalog_prices =
        merged.catalog_prices && typeof merged.catalog_prices === "object" ? merged.catalog_prices : {};
      // Live prices: mutate the catalog before rendering so product pages,
      // search and the cart all read the same edited price.
      applyCatalogPrices(merged.catalog_prices);
      cacheCatalogPrices(merged.catalog_prices);
      setSettings(merged);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch { /* noop */ }
    }
    load();

    const ch = supabase
      .channel("site-settings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}
