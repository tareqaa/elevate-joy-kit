import { useState, useEffect, useCallback } from "react";

export interface RecentlyViewedItem {
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr?: string | null;
  taglineEn?: string | null;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string | null;
  icon?: string | null;
  categorySlug?: string | null;
  viewedAt: number;
}

const STORAGE_KEY = "gx_recently_viewed_v1";
const MAX_ITEMS = 12;

// Curated starter items if user has not browsed anything yet
export const DEFAULT_RECENT_ITEMS: RecentlyViewedItem[] = [
  {
    slug: "ea-fc-27-pc",
    nameAr: "EA Sports FC 27 (PC)",
    nameEn: "EA Sports FC 27 (PC)",
    taglineAr: "حساب ستيم خاص بك — تفعيل فوري",
    taglineEn: "Steam Account — Instant Delivery",
    price: 26.0,
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
    slug: "fortnite",
    nameAr: "فورت نايت — V-Bucks & Crew",
    nameEn: "Fortnite — V-Bucks & Crew",
    taglineAr: "شحن فيبوكس وحزم الطاقم على حسابك",
    taglineEn: "V-Bucks & Crew Subscription",
    price: 4.0,
    oldPrice: 6.0,
    imageUrl: "/app/assets/img/fortnite-logo.png",
    icon: "⚡",
    categorySlug: "fortnite",
    viewedAt: Date.now() - 3000,
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
    price: 17.0,
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
    price: 18.5,
    oldPrice: 28.0,
    imageUrl: "/app/assets/img/catalog/red-dead-redemption-2.jpg",
    icon: "🤠",
    categorySlug: "games",
    viewedAt: Date.now() - 8000,
  },
];

/** Read items stored in localStorage */
export function getStoredRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Track a product view */
export function trackRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  if (typeof window === "undefined" || !item.slug) return;
  try {
    const current = getStoredRecentlyViewed().filter((p) => p.slug !== item.slug);
    const updated: RecentlyViewedItem[] = [
      {
        ...item,
        viewedAt: Date.now(),
      },
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
    const stored = getStoredRecentlyViewed();
    if (stored.length > 0) {
      setItems(stored);
      setHasRealHistory(true);
    } else {
      setItems(DEFAULT_RECENT_ITEMS);
      setHasRealHistory(false);
    }

    const handler = (e: Event) => {
      const custom = e as CustomEvent<RecentlyViewedItem[]>;
      if (custom.detail && Array.isArray(custom.detail) && custom.detail.length > 0) {
        setItems(custom.detail);
        setHasRealHistory(true);
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
