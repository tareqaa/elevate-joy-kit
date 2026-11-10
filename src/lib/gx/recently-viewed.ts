import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CANONICAL_CATALOG_OVERRIDES } from "./catalog.functions";
import { PRODUCTS_CATALOG } from "@/data/products";

export interface RecentlyViewedItem {
  slug: string;
  cartId?: string | null;
  nameAr: string;
  nameEn: string;
  taglineAr?: string | null;
  taglineEn?: string | null;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  icon?: string | null;
  categorySlug?: string | null;
  region?: string | null;
  link?: string | null;
  isOutOfStock?: boolean;
  viewedAt: number;
}

const STORAGE_KEY = "gx_recently_viewed_v1";
const MAX_ITEMS = 12;

export const KNOWN_INACTIVE_SLUGS = new Set([
  "snapchat",
]);

// Curated starter items if user has not browsed anything yet
export const DEFAULT_RECENT_ITEMS: RecentlyViewedItem[] = [
  {
    slug: "ea-fc-27-pc",
    nameAr: "EA Sports FC 27 (PC)",
    nameEn: "EA Sports FC 27 (PC)",
    taglineAr: "حساب ستيم خاص بك — تفعيل فوري",
    taglineEn: "Steam Account — Instant Delivery",
    price: 28.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/ea-fc-27-pc.png",
    icon: "⚽",
    categorySlug: "games",
    viewedAt: Date.now() - 1000,
  },
  {
    slug: "gta-v-enhanced-pc",
    nameAr: "Grand Theft Auto V Enhanced (PC)",
    nameEn: "GTA V Enhanced (PC)",
    taglineAr: "كود روكستار الأصلي — تفعيل فوري",
    taglineEn: "Official Rockstar Key",
    price: 11.0,
    oldPrice: 19.0,
    imageUrl: "/app/assets/img/catalog/gta-v-enhanced-pc.jpg",
    icon: "🚗",
    categorySlug: "games",
    viewedAt: Date.now() - 2000,
  },
  {
    slug: "fortnite-crew",
    cartId: "fn-crew-1m",
    nameAr: "فورت نايت كرو — شهر",
    nameEn: "Fortnite Crew — 1 Month",
    taglineAr: "اشتراك كرو شهري مع باتل باس و1000 فيبوكس",
    taglineEn: "Fortnite Crew subscription with Battle Pass & 1,000 V-Bucks",
    price: 5.0,
    oldPrice: 7.0,
    imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
    icon: "🪂",
    categorySlug: "games",
    link: "/product/fortnite-crew",
    viewedAt: Date.now() - 3000,
  },
  {
    slug: "instagram-followers",
    nameAr: "متابعين إنستقرام (1000 متابع)",
    nameEn: "Instagram Followers (1,000 Followers)",
    taglineAr: "زيادة 1000 متابع حقيقي لحسابك بضمان",
    taglineEn: "1,000 Real Instagram Followers with guarantee",
    price: 1.5,
    oldPrice: 2.5,
    imageUrl: "/app/assets/img/instagram-logo.svg",
    icon: "📱",
    categorySlug: "social-media",
    viewedAt: Date.now() - 3500,
  },
  {
    slug: "xbox-game-pass-ultimate",
    nameAr: "Xbox Game Pass Ultimate",
    nameEn: "Xbox Game Pass Ultimate",
    taglineAr: "أقوى مكتبة ألعاب للكمبيوتر والإكسبوكس",
    taglineEn: "Hundreds of games on PC & Xbox",
    price: 10.5,
    oldPrice: 15.0,
    imageUrl: "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
    icon: "🎮",
    categorySlug: "subscriptions",
    viewedAt: Date.now() - 4000,
  },
  {
    slug: "canva",
    nameAr: "Canva Pro",
    nameEn: "Canva Pro",
    taglineAr: "اشتراك رسمي لكافة مزايا كانفا برو",
    taglineEn: "Official Canva Pro Subscription",
    price: 2.0,
    oldPrice: 4.0,
    imageUrl: "/app/assets/img/canva-logo.png",
    icon: "🎨",
    categorySlug: "canva",
    viewedAt: Date.now() - 5000,
  },
  {
    slug: "minecraft-java-bedrock",
    nameAr: "Minecraft: Java & Bedrock Edition",
    nameEn: "Minecraft: Java & Bedrock",
    taglineAr: "كود تفعيل ويندوز ستور أصلي",
    taglineEn: "Original Windows Store Key",
    price: 15.0,
    oldPrice: 24.0,
    imageUrl: "/app/assets/img/catalog/minecraft-java-bedrock.png",
    icon: "🧱",
    categorySlug: "games",
    viewedAt: Date.now() - 6000,
  },
  {
    slug: "helldivers-2",
    nameAr: "Helldivers 2 (PC)",
    nameEn: "Helldivers 2 (PC)",
    taglineAr: "كود ستيم الأصلي للكمبيوتر",
    taglineEn: "Official Steam Key",
    price: 27.0,
    oldPrice: 35.0,
    imageUrl: "/app/assets/img/catalog/helldivers-2.webp",
    icon: "🚀",
    categorySlug: "games",
    viewedAt: Date.now() - 7000,
  },
  {
    slug: "red-dead-redemption-2",
    nameAr: "Red Dead Redemption 2 (PC)",
    nameEn: "Red Dead Redemption 2 (PC)",
    taglineAr: "كود روكستار الأصلي للكمبيوتر",
    taglineEn: "Official Rockstar Key",
    price: 13.0,
    oldPrice: 25.0,
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    icon: "🤠",
    categorySlug: "games",
    viewedAt: Date.now() - 8000,
  },
];

/** Reconciles a recently viewed item with current catalog prices, canonical data & active variant */
export function reconcileItemWithLiveCatalog(
  item: RecentlyViewedItem,
  livePrices?: Record<string, { price: number; oldPrice?: number | null }>,
  stockLimits?: Record<string, number>
): RecentlyViewedItem {
  let res = { ...item };

  // 1. Dedicated Gemini update: Always keep it as the single active 6-Month subscription
  if (res.slug === "gemini" || res.slug.startsWith("gemini-")) {
    res.slug = "gemini";
    res.cartId = "gemini-plus-6m";
    res.nameAr = "Google Gemini Plus | اشتراك 6 أشهر";
    res.nameEn = "Google Gemini Plus — 6 Months";
    res.taglineAr = "رابط تفعيل رسمي 6 أشهر • لا يتطلب بطاقة بنكية (Credit Card) • صلاحية الرابط 10 ساعات";
    res.taglineEn = "Official 6-month activation link • No credit card required • Link valid for 10 hours";
    res.price = 4.0;
    res.oldPrice = 8.0;
    res.imageUrl = "/app/assets/img/gemini-logo.svg";
    res.link = "/product/gemini";
  }

  // 2. Canonical Overrides (Authoritative source for PlayStation SAR, Gemini, Windows, Notion, etc.)
  const cid = res.cartId || res.slug;
  const canonical = CANONICAL_CATALOG_OVERRIDES[cid] || CANONICAL_CATALOG_OVERRIDES[res.slug];
  if (canonical && typeof canonical.price === "number") {
    res.price = canonical.price;
    if (canonical.oldPrice !== undefined) res.oldPrice = canonical.oldPrice;
  }

  // 3. Live site_settings catalog_prices
  if (livePrices) {
    const liveOv = livePrices[cid] || livePrices[res.slug];
    if (liveOv && typeof liveOv.price === "number") {
      res.price = liveOv.price;
      if (liveOv.oldPrice !== undefined) res.oldPrice = liveOv.oldPrice;
    }
  }

  // 4. Fallback to PRODUCTS_CATALOG
  const catP = PRODUCTS_CATALOG[res.slug];
  if (catP && res.slug !== "gemini") {
    if (!canonical && (!livePrices || !livePrices[cid])) {
      const plan = (catP.plans || []).find((p) => p.id === cid) || (catP.plans || [])[0];
      if (plan) {
        res.price = plan.price;
        res.oldPrice = plan.oldPrice ?? null;
      }
    }
    if (!res.imageUrl || res.imageUrl.includes("gemini-logo.png")) {
      res.imageUrl = catP.imageUrl || catP.iconImg || res.imageUrl;
    }
  }

  // 5. Stock limits: if stock <= 0, mark out of stock
  if (stockLimits) {
    const lim = stockLimits[cid] ?? stockLimits[res.slug];
    if (typeof lim === "number" && lim <= 0) {
      res.isOutOfStock = true;
    }
  }

  return res;
}

/** Read items stored in localStorage with strict product-level deduplication */
export function getStoredRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("gx_recently_viewed");
      if (legacy) {
        raw = legacy;
        try {
          localStorage.removeItem("gx_recently_viewed");
        } catch {}
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seenSlugs = new Set<string>();
    const deduplicated: RecentlyViewedItem[] = [];

    for (const rawItem of parsed) {
      if (!rawItem || !rawItem.slug) continue;
      if (KNOWN_INACTIVE_SLUGS.has(rawItem.slug)) continue;
      if (rawItem.cartId && KNOWN_INACTIVE_SLUGS.has(rawItem.cartId)) continue;
      // Deduplicate strictly by product slug! A product must only appear ONCE in recently viewed.
      if (seenSlugs.has(rawItem.slug)) continue;
      seenSlugs.add(rawItem.slug);

      deduplicated.push(reconcileItemWithLiveCatalog(rawItem));
    }

    return deduplicated;
  } catch {
    return [];
  }
}

/** Track a product view */
export function trackRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  if (typeof window === "undefined" || !item.slug) return;
  if (KNOWN_INACTIVE_SLUGS.has(item.slug)) return;
  if (item.cartId && KNOWN_INACTIVE_SLUGS.has(item.cartId)) return;
  try {
    const reconciled = reconcileItemWithLiveCatalog({
      ...item,
      viewedAt: Date.now(),
    });

    // Strictly deduplicate by slug: a product must only appear ONCE in recently viewed!
    const current = getStoredRecentlyViewed().filter((p) => p.slug !== reconciled.slug);
    const updated: RecentlyViewedItem[] = [
      reconciled,
      ...current,
    ].slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("gx_recently_viewed_updated", { detail: updated }));
  } catch {
    // ignore
  }
}

/** React hook for reading recently viewed list */
export function useRecentlyViewed(): {
  items: RecentlyViewedItem[];
  hasRealHistory: boolean;
  clearHistory: () => void;
} {
  const [items, setItems] = useState<RecentlyViewedItem[]>(DEFAULT_RECENT_ITEMS);
  const [hasRealHistory, setHasRealHistory] = useState(false);

  useEffect(() => {
    // 1. Synchronously read from localStorage, deduplicate, reconcile and immediately prune obsolete items
    const rawStorage = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();
    const cleanStored = getStoredRecentlyViewed();

    // Persist the deduplicated & reconciled clean list back to localStorage immediately
    if (Array.isArray(rawStorage)) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanStored));
      } catch {}
    }

    if (cleanStored.length > 0) {
      setItems(cleanStored);
      setHasRealHistory(true);
    } else {
      setItems(DEFAULT_RECENT_ITEMS);
      setHasRealHistory(false);
    }

    // 2. Dynamically check active products, prices, and stock limits in Supabase:
    // If a product is deactivated or ended, mark as out of stock (نفدت الكمية)!
    void (async () => {
      try {
        const [{ data: products }, { data: settings }] = await Promise.all([
          supabase.from("products").select("slug, is_active, base_price_jod").limit(2000),
          supabase.from("site_settings").select("key, value").in("key", ["catalog_prices", "product_stock_limits"]),
        ]);

        const activeMap = new Map<string, boolean>();
        if (products && Array.isArray(products)) {
          for (const p of products) {
            if (p.slug) activeMap.set(p.slug, p.is_active !== false);
          }
        }

        let livePrices: Record<string, { price: number; oldPrice?: number | null }> | undefined;
        let stockLimits: Record<string, number> | undefined;

        if (settings && Array.isArray(settings)) {
          for (const s of settings) {
            if (s.key === "catalog_prices" && s.value && typeof s.value === "object") {
              livePrices = s.value as Record<string, { price: number; oldPrice?: number | null }>;
            } else if (s.key === "product_stock_limits" && s.value && typeof s.value === "object") {
              stockLimits = s.value as Record<string, number>;
            }
          }
        }

        const current = getStoredRecentlyViewed();
        const updated = current.map((it) => {
          const rec = reconcileItemWithLiveCatalog(it, livePrices, stockLimits);
          // If deactivated in DB, mark out of stock
          if (activeMap.has(rec.slug) && activeMap.get(rec.slug) === false) {
            rec.isOutOfStock = true;
          }
          return rec;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setItems(updated.length > 0 ? updated : DEFAULT_RECENT_ITEMS);
        setHasRealHistory(updated.length > 0);
        window.dispatchEvent(new CustomEvent("gx_recently_viewed_updated", { detail: updated }));
      } catch {
        // ignore
      }
    })();

    const handler = (e: Event) => {
      const custom = e as CustomEvent<RecentlyViewedItem[]>;
      if (custom.detail && Array.isArray(custom.detail) && custom.detail.length > 0) {
        const seenSlugs = new Set<string>();
        const valid: RecentlyViewedItem[] = [];
        for (const item of custom.detail) {
          if (!item?.slug || KNOWN_INACTIVE_SLUGS.has(item.slug)) continue;
          if (seenSlugs.has(item.slug)) continue;
          seenSlugs.add(item.slug);
          valid.push(reconcileItemWithLiveCatalog(item));
        }
        setItems(valid);
        setHasRealHistory(valid.length > 0);
      }
    };

    window.addEventListener("gx_recently_viewed_updated", handler);
    return () => window.removeEventListener("gx_recently_viewed_updated", handler);
  }, []);

  const clearHistory = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      setItems(DEFAULT_RECENT_ITEMS);
      setHasRealHistory(false);
      window.dispatchEvent(new CustomEvent("gx_recently_viewed_updated", { detail: [] }));
    }
  }, []);

  return { items, hasRealHistory, clearHistory };
}
