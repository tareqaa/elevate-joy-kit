import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HOME_LAYOUT, type HomeLayout } from "./sections/types";
import {
  applyCatalogPrices,
  cacheCatalogPrices,
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

export type BestsellerLabelConfig = {
  mode?: "category" | "custom";
  customLabel?: string;
  customIcon?: string;
};

export type BestsellerItemSnapshot = {
  cartId: string;
  productSlug: string;
  nameAr: string;
  nameEn: string;
  priceJod: number;
  oldPriceJod?: number | null;
  imageUrl?: string | null;
  iconImage?: string | null;
  icon?: string | null;
  badge?: string | null;
  bg?: string | null;
  thumbBg?: string | null;
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
  home_bestseller_items: BestsellerItemSnapshot[];
  home_bestseller_labels: Record<string, BestsellerLabelConfig>;
  home_layout: HomeLayout;
  catalog_prices: CatalogPrices;
  hide_fortnite_badges: boolean;
  isLoaded: boolean;
  dbFetched: boolean;
};

const DEFAULT_HERO: HomeHero = {
  enabled: true, badge: null, title_a: null, title_b: null, title_c: null,
  subtitle: null, cta_primary_text: null, cta_primary_link: null,
  cta_secondary_text: null, cta_secondary_link: null, image_url: null,
};
const DEFAULT_BANNERS: HomeBanners = { enabled: false, autoplay: true, interval_ms: 5000, items: [] };

export const DEFAULT_BESTSELLER_ORDER = [
  "snap-6",
  "fn-crew",
  "red-dead-redemption-2",
  "adobe-1",
  "gemini-18",
  "fn-vb-2400",
  "snap-3",
  "fn-vb-800",
];

export const DEFAULT_BESTSELLER_ITEMS: BestsellerItemSnapshot[] = [
  {
    cartId: "snap-6",
    productSlug: "snapchat",
    nameAr: "سناب بلس — 6 أشهر",
    nameEn: "Snapchat+ — 6 months",
    priceJod: 9,
    oldPriceJod: 14,
    imageUrl: "/app/assets/img/snapchat-logo.png",
    iconImage: "/app/assets/img/snapchat-logo.png",
    icon: "👻",
    thumbBg: "linear-gradient(145deg,#3a3a10,#14150c)",
  },
  {
    cartId: "fn-crew",
    productSlug: "fortnite",
    nameAr: "فورت نايت — Fortnite Crew — شهر",
    nameEn: "Fortnite — Fortnite Crew — 1 month",
    priceJod: 4,
    oldPriceJod: 6,
    imageUrl: "/app/assets/img/fortnite-logo.png",
    iconImage: "/app/assets/img/fortnite-logo.png",
    icon: "🪂",
    thumbBg: "linear-gradient(145deg,#0d1a30,#080d18)",
  },
  {
    cartId: "red-dead-redemption-2",
    productSlug: "red-dead-redemption-2",
    nameAr: "Red Dead Redemption 2 (RDR2) | كود روكستار (PC)",
    nameEn: "Red Dead Redemption 2 (PC)",
    priceJod: 18.5,
    oldPriceJod: 23.13,
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    iconImage: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    icon: "🎮",
    thumbBg: "linear-gradient(145deg,#10141f,#090c14)",
  },
  {
    cartId: "adobe-1",
    productSlug: "adobe",
    nameAr: "Adobe Creative Cloud — شهر واحد",
    nameEn: "Adobe Creative Cloud — 1 month",
    priceJod: 10,
    oldPriceJod: 15,
    imageUrl: "/app/assets/img/adobe-cc.webp",
    iconImage: "/app/assets/img/adobe-cc.webp",
    icon: "🎨",
    thumbBg: "linear-gradient(145deg,#2a0d30,#150818)",
  },
  {
    cartId: "gemini-18",
    productSlug: "gemini",
    nameAr: "Gemini Pro — 18 شهر",
    nameEn: "Gemini Pro — 18 months",
    priceJod: 8,
    oldPriceJod: 20,
    imageUrl: "/app/assets/img/gemini-logo.svg",
    iconImage: "/app/assets/img/gemini-logo.svg",
    icon: "✨",
    thumbBg: "linear-gradient(145deg,#2a1a4a,#0e0820)",
  },
  {
    cartId: "fn-vb-2400",
    productSlug: "fortnite",
    nameAr: "فورت نايت — 2400 وحدة V-Bucks",
    nameEn: "Fortnite — 2400 V-Bucks",
    priceJod: 12,
    oldPriceJod: 16,
    imageUrl: "/app/assets/img/fortnite-logo.png",
    iconImage: "/app/assets/img/fortnite-logo.png",
    icon: "🪂",
    thumbBg: "linear-gradient(145deg,#0d1a30,#080d18)",
  },
  {
    cartId: "snap-3",
    productSlug: "snapchat",
    nameAr: "سناب بلس — 3 أشهر",
    nameEn: "Snapchat+ — 3 months",
    priceJod: 5,
    oldPriceJod: 7,
    imageUrl: "/app/assets/img/snapchat-logo.png",
    iconImage: "/app/assets/img/snapchat-logo.png",
    icon: "👻",
    thumbBg: "linear-gradient(145deg,#3a3a10,#14150c)",
  },
  {
    cartId: "fn-vb-800",
    productSlug: "fortnite",
    nameAr: "فورت نايت — 800 وحدة V-Bucks",
    nameEn: "Fortnite — 800 V-Bucks",
    priceJod: 5,
    oldPriceJod: 7,
    imageUrl: "/app/assets/img/fortnite-logo.png",
    iconImage: "/app/assets/img/fortnite-logo.png",
    icon: "🪂",
    thumbBg: "linear-gradient(145deg,#0d1a30,#080d18)",
  },
];

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
  home_bestseller_order: DEFAULT_BESTSELLER_ORDER,
  home_bestseller_items: DEFAULT_BESTSELLER_ITEMS,
  home_bestseller_labels: {},
  home_layout: DEFAULT_HOME_LAYOUT,
  catalog_prices: {},
  hide_fortnite_badges: false,
  isLoaded: false,
  dbFetched: false,
};

const CACHE_KEY = "gx_site_settings_v2";
const Ctx = createContext<SiteSettings>(DEFAULTS);

function readCache(): SiteSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { ...DEFAULTS, isLoaded: false, dbFetched: false };
    const parsed = JSON.parse(raw);
    const hasOrder = Array.isArray(parsed.home_bestseller_order) && parsed.home_bestseller_order.length > 0;
    const hasItems = Array.isArray(parsed.home_bestseller_items) && parsed.home_bestseller_items.length > 0;
    const isLoaded = Boolean(hasOrder || hasItems);
    return { ...DEFAULTS, ...parsed, isLoaded, dbFetched: false };
  } catch {
    return { ...DEFAULTS, isLoaded: false, dbFetched: false };
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(readCache);

  useEffect(() => {
    let mounted = true;
    const TS_KEY = "gx_site_settings_v2_ts";
    const CACHE_VALID_MS = 10 * 60 * 1000; // 10 minutes cache

    async function load(force = false) {
      if (!force && typeof window !== "undefined") {
        const lastFetched = Number(localStorage.getItem(TS_KEY) || "0");
        let hasItems = false;
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY);
          const parsed = cachedRaw ? JSON.parse(cachedRaw) : null;
          hasItems = Array.isArray(parsed?.home_bestseller_items) && parsed.home_bestseller_items.length > 0;
        } catch { /* noop */ }

        if (Date.now() - lastFetched < CACHE_VALID_MS && hasItems) {
          return; // Still fresh and has bestseller items, avoid querying Supabase
        }
      }

      const { data } = await supabase.from("site_settings").select("key,value");
      if (!mounted || !data) return;
      const merged: SiteSettings = { ...DEFAULTS, isLoaded: true, dbFetched: true };
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
      merged.home_bestseller_items = Array.isArray(merged.home_bestseller_items) ? merged.home_bestseller_items : [];
      merged.home_bestseller_labels =
        merged.home_bestseller_labels && typeof merged.home_bestseller_labels === "object"
          ? merged.home_bestseller_labels
          : {};
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
      merged.isLoaded = true;
      merged.dbFetched = true;

      setSettings((prev) => {
        const orderEqual = JSON.stringify(prev.home_bestseller_order) === JSON.stringify(merged.home_bestseller_order);
        const itemsEqual = JSON.stringify(prev.home_bestseller_items) === JSON.stringify(merged.home_bestseller_items);
        const layoutEqual = JSON.stringify(prev.home_layout) === JSON.stringify(merged.home_layout);
        if (orderEqual && itemsEqual && layoutEqual && prev.store_name === merged.store_name && prev.isLoaded === merged.isLoaded && prev.dbFetched === merged.dbFetched) {
          return prev;
        }
        return merged;
      });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
        localStorage.setItem(TS_KEY, String(Date.now()));
      } catch { /* noop */ }
    }
    load();

    // 1. Listen for instant local updates within the same window
    function onLocalSettingsChange(e: Event) {
      const customEvent = e as CustomEvent<SiteSettings>;
      if (customEvent.detail) {
        setSettings((prev) => ({ ...prev, ...customEvent.detail, isLoaded: true, dbFetched: true }));
      }
    }
    window.addEventListener("gx_site_settings_changed", onLocalSettingsChange);

    // 1.1 Listen for explicit trigger to reload site settings from DB
    function onSettingsReload() {
      load(true);
    }
    window.addEventListener("gx:site-settings-updated", onSettingsReload);

    // 2. Listen for storage updates across tabs in the same browser
    function onStorageChange(e: StorageEvent) {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings((prev) => ({ ...prev, ...parsed, isLoaded: true, dbFetched: true }));
        } catch { /* noop */ }
      }
    }
    window.addEventListener("storage", onStorageChange);

    // 3. Subscribe to Supabase Realtime for instant multi-device / multi-browser updates
    const channel = supabase
      .channel("site_settings_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          load(true);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      window.removeEventListener("gx_site_settings_changed", onLocalSettingsChange);
      window.removeEventListener("gx:site-settings-updated", onSettingsReload);
      window.removeEventListener("storage", onStorageChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo(() => settings, [settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): SiteSettings {
  return useContext(Ctx);
}
