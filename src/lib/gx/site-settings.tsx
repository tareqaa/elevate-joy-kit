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
  region?: string | null;
  deliveryType?: string | null;
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
  "headspace-4m",
  "nordvpn-3m",
  "adobe-express-3m",
  "gpu-2m-acct",
  "notion-biz-3m",
  "discord-nitro-3-months-trial",
  "fn-crew",
  "acrobat-std-3m",
  "red-dead-redemption-2",
  "adobe-1",
];

export const DEFAULT_BESTSELLER_ITEMS: BestsellerItemSnapshot[] = [
  {
    cartId: "headspace-4m",
    productSlug: "headspace",
    nameAr: "Headspace | اشتراك 4 أشهر بريميوم",
    nameEn: "Headspace — 4 Months",
    priceJod: 1,
    oldPriceJod: 18,
    badge: "🔥 صيد اليوم (1 دينار)",
    imageUrl: "/app/assets/img/catalog/headspace.png",
    iconImage: "/app/assets/img/catalog/headspace.svg",
    icon: "🧘",
    thumbBg: "linear-gradient(145deg, #1e2340, #0f1122)",
  },
  {
    cartId: "nordvpn-3m",
    productSlug: "nordvpn",
    nameAr: "NordVPN | اشتراك 3 أشهر (10 أجهزة)",
    nameEn: "NordVPN — 3 Months (10 Devices)",
    priceJod: 10,
    oldPriceJod: 24,
    badge: "🛡️ حماية 10 أجهزة",
    imageUrl: "/app/assets/img/catalog/nordvpn.jpg",
    iconImage: "/app/assets/img/catalog/nordvpn.svg",
    icon: "🌐",
    thumbBg: "linear-gradient(145deg, #0f2b5c, #071329)",
  },
  {
    cartId: "adobe-express-3m",
    productSlug: "adobe-express",
    nameAr: "Adobe Express Premium | اشتراك 3 أشهر",
    nameEn: "Adobe Express — 3 Months",
    priceJod: 3,
    oldPriceJod: 15,
    badge: "🔥 عرض خاص",
    imageUrl: "/app/assets/img/catalog/adobe-express.jpg",
    iconImage: "/app/assets/img/catalog/adobe-express.svg",
    icon: "🎨",
    thumbBg: "linear-gradient(145deg, #2b1145, #12061f)",
  },
  {
    cartId: "gpu-2m-acct",
    productSlug: "xbox-game-pass-ultimate",
    nameAr: "Xbox Game Pass Ultimate | شهرين (حساب جاهز)",
    nameEn: "Xbox Game Pass Ultimate — 2 Months",
    priceJod: 12,
    oldPriceJod: 17,
    badge: "👑 الأكثر طلباً",
    imageUrl: "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
    iconImage: "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
    icon: "🎮",
    thumbBg: "linear-gradient(145deg, #10141f, #090c14)",
  },
  {
    cartId: "notion-biz-3m",
    productSlug: "notion-business",
    nameAr: "Notion Business | 3 أشهر (رصيد شهري)",
    nameEn: "Notion Business — 3 Months",
    priceJod: 9,
    oldPriceJod: 30,
    badge: "⭐ للأعمال",
    imageUrl: "/app/assets/img/catalog/notion.png",
    iconImage: "/app/assets/img/catalog/notion.svg",
    icon: "📝",
    thumbBg: "linear-gradient(145deg, #1f232b, #0f1122)",
  },
  {
    cartId: "discord-nitro-3-months-trial",
    productSlug: "discord-nitro-3-months-trial",
    nameAr: "Discord Nitro | 3 أشهر تجريبي",
    nameEn: "Discord Nitro — 3 Months Trial",
    priceJod: 1.95,
    oldPriceJod: 2.31,
    badge: "🔥 سعر حصري",
    imageUrl: "/app/assets/img/catalog/discord-nitro-3-months-trial.jpg",
    iconImage: "/app/assets/img/catalog/discord-nitro-3-months-trial.jpg",
    icon: "🎮",
    thumbBg: "linear-gradient(145deg, #1a1530, #0c0918)",
  },
  {
    cartId: "fn-crew",
    productSlug: "fortnite",
    nameAr: "فورت نايت كرو | اشتراك شهر",
    nameEn: "Fortnite Crew — 1 Month",
    priceJod: 4,
    oldPriceJod: 6,
    badge: "يشمل V-Bucks",
    imageUrl: "/app/assets/img/fortnite-logo.png",
    iconImage: "/app/assets/img/fortnite-logo.png",
    icon: "🪂",
    thumbBg: "linear-gradient(145deg, #0d1a30, #080d18)",
  },
  {
    cartId: "acrobat-std-3m",
    productSlug: "adobe-acrobat-standard",
    nameAr: "Adobe Acrobat Standard 2026 | جهازين 3 أشهر",
    nameEn: "Adobe Acrobat Standard — 3 Months",
    priceJod: 12,
    oldPriceJod: 40,
    badge: "📄 أصلي 100%",
    imageUrl: "/app/assets/img/catalog/adobe-acrobat.jpg",
    iconImage: "/app/assets/img/catalog/adobe-acrobat.svg",
    icon: "📕",
    thumbBg: "linear-gradient(145deg, #3a000d, #1a0005)",
  },
  {
    cartId: "red-dead-redemption-2",
    productSlug: "red-dead-redemption-2",
    nameAr: "Red Dead Redemption 2 (RDR2) | كود روكستار (PC)",
    nameEn: "Red Dead Redemption 2 (PC)",
    priceJod: 13,
    oldPriceJod: 25,
    badge: "جديد",
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    iconImage: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    icon: "🎮",
    thumbBg: "linear-gradient(145deg, #10141f, #090c14)",
  },
  {
    cartId: "adobe-1",
    productSlug: "adobe",
    nameAr: "Adobe Creative Cloud | كود شهر",
    nameEn: "Adobe Creative Cloud — 1 Month",
    priceJod: 13,
    oldPriceJod: 18,
    badge: "باقة المبدعين",
    imageUrl: "/app/assets/img/adobe-cc.webp",
    iconImage: "/app/assets/img/adobe-cc.webp",
    icon: "🎨",
    thumbBg: "linear-gradient(145deg, #2a0d30, #150818)",
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
    const CACHE_VALID_MS = 30 * 1000; // 30 seconds fresh cache (fast updates)

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
