/**
 * ============================================================
 * GX STORE — UNIFIED PRODUCT & VARIANT IMAGE REGISTRY
 * Guarantees 100% identical imagery across:
 * 1. Product page poster & cards (GxProductTemplate)
 * 2. Cart drawer & cart page (CartThumb / cart.tsx)
 * 3. Order confirmation & inventory screen (DriffleOrderDeliveryView)
 * 4. Customer order confirmation emails (order-email.functions.ts)
 * ============================================================
 */

export const CANONICAL_VARIANT_IMAGES: Record<string, string> = {
  // TOD Plans (exact artwork cards)
  "tod-total-1d": "/app/assets/img/catalog/one_day.webp",
  "tod-total-1w": "/app/assets/img/catalog/one_week_2.webp",
  "tod-mobile-1m": "/app/assets/img/catalog/1-01.webp",
  "tod-total-1m": "/app/assets/img/catalog/1-03.webp",
  "tod-4k-1m": "/app/assets/img/catalog/1-02.webp",
  "tod-mobile-6m": "/app/assets/img/catalog/tod_mobile_6_months_1.webp",
  "tod-tv-6m": "/app/assets/img/catalog/total_6_months.webp",
  "tod-mobile-1y": "/app/assets/img/catalog/tod_mobile_-one_year.webp",
  "tod-tv-1y": "/app/assets/img/catalog/tod_total_one_year.webp",
  "tod-4k-1y": "/app/assets/img/catalog/4k_.png",

  // Discord Nitro
  "discord-nitro-1m": "/app/assets/img/catalog/discord-nitro-1-month.png",
  "discord-nitro-1y": "/app/assets/img/catalog/discord-nitro-1-year.jpg",

  // YouTube Premium (Invites & Dedicated Accounts)
  "youtube-premium": "/app/assets/img/catalog/youtube-premium.jpg",
  "youtube-premium-1m": "/app/assets/img/catalog/youtube-premium.jpg",
  "youtube-premium-account": "/app/assets/img/catalog/youtube-premium.jpg",
  "yt-account-1m": "/app/assets/img/catalog/youtube-premium.jpg",
  "youtube-premium-account-1m": "/app/assets/img/catalog/youtube-premium.jpg",

  // Valorant Points (Turkey Region)
  "valorant": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-375": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-825": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-1700": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-2925": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-4325": "/app/assets/img/catalog/valorant-cover.jpg",
  "valorant-8900": "/app/assets/img/catalog/valorant-cover.jpg",

  // EA Sports FC 27
  "ea-fc-27-pc": "/app/assets/img/catalog/ea-fc-27-pc.png",
  "ea-fc-27-xbox": "/app/assets/img/catalog/ea-fc-27-xbox.jpg",

  // Euro Truck Simulator 2
  "euro-truck-simulator-2": "/app/assets/img/catalog/euro-truck-simulator-2.jpg",

  // Additional Popular Catalog Games
  "gta-v-enhanced-pc": "/app/assets/img/catalog/gta-v-enhanced-pc.jpg",
  "red-dead-redemption-2": "/app/assets/img/catalog/red-dead-redemption-2.jpg",
  "minecraft-realms-plus": "/app/assets/img/catalog/minecraft-realms-plus.png",
  "duolingo-super": "/app/assets/img/catalog/duolingo-super.png",
  "nordvpn": "/app/assets/img/catalog/nordvpn.jpg",
  "headspace": "/app/assets/img/catalog/headspace.png",
  "adobe-acrobat": "/app/assets/img/catalog/adobe-acrobat.jpg",
  "adobe-express": "/app/assets/img/catalog/adobe-express.jpg",
  "notion": "/app/assets/img/catalog/notion.png",
  "lovable": "/app/assets/img/catalog/lovable.webp",
};

export interface ResolveImageOptions {
  cartId?: string | null;
  slug?: string | null;
  name?: string | null;
  fallback?: string | null;
}

/**
 * Resolves the canonical, unified image URL for any item across the store.
 */
export function resolveProductImage(options: ResolveImageOptions): string {
  const { cartId, slug, name, fallback } = options;
  const cleanId = (cartId || "").trim().toLowerCase();
  const cleanSlug = (slug || "").trim().toLowerCase();
  const cleanName = (name || "").trim().toLowerCase();

  // 1. Direct match by cartId in canonical registry
  if (cleanId && CANONICAL_VARIANT_IMAGES[cleanId]) {
    return CANONICAL_VARIANT_IMAGES[cleanId];
  }

  // 2. TOD specific resolution by cartId or naming
  if (cleanId.includes("tod") || cleanSlug.includes("tod") || cleanName.includes("tod") || cleanName.includes("تود")) {
    if (cleanId === "tod-total-1d" || cleanName.includes("يوم واحد") || cleanName.includes("1 day")) {
      return "/app/assets/img/catalog/one_day.webp";
    }
    if (cleanId === "tod-total-1w" || cleanName.includes("أسبوع") || cleanName.includes("1 week")) {
      return "/app/assets/img/catalog/one_week_2.webp";
    }
    if (cleanId === "tod-mobile-1m" || (cleanName.includes("موبايل") && (cleanName.includes("شهر") || cleanName.includes("1 month")))) {
      return "/app/assets/img/catalog/1-01.webp";
    }
    if (cleanId === "tod-4k-1m" || (cleanName.includes("4k") && (cleanName.includes("شهر") || cleanName.includes("1 month")))) {
      return "/app/assets/img/catalog/1-02.webp";
    }
    if (cleanId === "tod-total-1m" || cleanName.includes("شهر") || cleanName.includes("1 month")) {
      return "/app/assets/img/catalog/1-03.webp";
    }
    if (cleanId === "tod-mobile-6m" || (cleanName.includes("موبايل") && (cleanName.includes("6") || cleanName.includes("نصف")))) {
      return "/app/assets/img/catalog/tod_mobile_6_months_1.webp";
    }
    if (cleanId === "tod-tv-6m" || cleanName.includes("6") || cleanName.includes("نصف")) {
      return "/app/assets/img/catalog/total_6_months.webp";
    }
    if (cleanId === "tod-mobile-1y" || (cleanName.includes("موبايل") && (cleanName.includes("سنة") || cleanName.includes("1 year")))) {
      return "/app/assets/img/catalog/tod_mobile_-one_year.webp";
    }
    if (cleanId === "tod-4k-1y" || (cleanName.includes("4k") && (cleanName.includes("سنة") || cleanName.includes("1 year")))) {
      return "/app/assets/img/catalog/4k_.png";
    }
    if (cleanId === "tod-tv-1y" || cleanName.includes("سنة") || cleanName.includes("1 year")) {
      return "/app/assets/img/catalog/tod_total_one_year.webp";
    }
    // Default TOD card
    return "/app/assets/img/catalog/tod_total_one_year.webp";
  }

  // 3. Valorant points
  if (cleanId.includes("valorant") || cleanSlug.includes("valorant") || cleanName.includes("فالورانت")) {
    return "/app/assets/img/catalog/valorant-cover.jpg";
  }

  // 4. FC 27 PC
  if (cleanId === "ea-fc-27-pc" || (cleanSlug.includes("fc-27") && cleanSlug.includes("pc")) || cleanName.includes("fc 27")) {
    return "/app/assets/img/catalog/ea-fc-27-pc.png";
  }

  // 5. Euro Truck Simulator 2
  if (cleanId.includes("truck") || cleanSlug.includes("truck") || cleanName.includes("euro truck")) {
    return "/app/assets/img/catalog/euro-truck-simulator-2.jpg";
  }

  // 6. Direct match by slug in canonical registry
  if (cleanSlug && CANONICAL_VARIANT_IMAGES[cleanSlug]) {
    return CANONICAL_VARIANT_IMAGES[cleanSlug];
  }

  // 7. Fallback to provided image
  if (fallback && typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }

  return "";
}
