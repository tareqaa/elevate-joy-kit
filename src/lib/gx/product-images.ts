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
  "valorant": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-tr": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-375": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-825": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-1700": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-2925": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-4325": "/app/assets/img/catalog/valorant-tr-cover.jpg",
  "valorant-8900": "/app/assets/img/catalog/valorant-tr-cover.jpg",

  // Valorant Points (Europe Region)
  "valorant-eu": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-240": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-325": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-475": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-675": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-1000": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-1375": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-1750": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-2050": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-2450": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-3550": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-3650": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-5350": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-7350": "/app/assets/img/catalog/valorant-eu-cover.jpg",
  "vp-eu-11000": "/app/assets/img/catalog/valorant-eu-cover.jpg",

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
  // Autodesk
  "autodesk": "/app/assets/img/catalog/autodesk-cover.jpg",
  "autodesk-12": "/app/assets/img/catalog/autodesk-cover.jpg",

  // Windows
  "windows": "/app/assets/img/catalog/windows-cover.jpg",
  "win-pro-oem": "/app/assets/img/catalog/windows-cover.jpg",
  "win-pro-acct": "/app/assets/img/catalog/windows-cover.jpg",
  "win-home-oem": "/app/assets/img/catalog/windows-cover.jpg",
  "win-home-acct": "/app/assets/img/catalog/windows-cover.jpg",

  // Razer Gold
  "razer-gold": "/app/assets/img/razer-card.jpg",
  "razer-global-5": "/app/assets/img/razer-card.jpg",
  "razer-global-10": "/app/assets/img/razer-card.jpg",
  "razer-global-20": "/app/assets/img/razer-card.jpg",
  "razer-global-50": "/app/assets/img/razer-card.jpg",
  "razer-global-60": "/app/assets/img/razer-card.jpg",
  "razer-global-100": "/app/assets/img/razer-card.jpg",
  "razer-us-10": "/app/assets/img/razer-card.jpg",
  "razer-us-20": "/app/assets/img/razer-card.jpg",
  "razer-us-50": "/app/assets/img/razer-card.jpg",
  "razer-us-60": "/app/assets/img/razer-card.jpg",
  "razer-us-100": "/app/assets/img/razer-card.jpg",

  // PlayStation PSN Gift Cards (Official Store Design)
  "playstation": "/app/assets/img/playstation-card.jpg",
  "psn": "/app/assets/img/playstation-card.jpg",
  "gc-playstation": "/app/assets/img/playstation-card.jpg",
  "psn-card": "/app/assets/img/playstation-card.jpg",

  // Fortnite V-Bucks Packs (Official Artwork matching cards & catalog)
  "fn-vb-800": "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912",
  "fn-vb-2400": "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d",
  "fn-vb-4500": "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3",
  "fn-vb-12500": "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e",

  // Fortnite Crew
  "fortnite-crew": "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
  "fn-crew": "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
  "fn-crew-3": "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
  "fn-crew-1m": "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
  "fn-crew-3m": "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",

  // Xbox Game Pass Ultimate (Official Artwork)
  "xbox-game-pass-ultimate": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-1m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-2m-acct": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-35m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-4m-acct": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-6m-acct": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-65m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-8m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-10m-acct": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-10m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-12m-acct": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",
  "gpu-12m-topup": "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg",

  // PC Game Pass (Official Artwork)
  "pc-game-pass": "/app/assets/img/catalog/pc-game-pass.jpg",
  "pcgp-3m-topup": "/app/assets/img/catalog/pc-game-pass.jpg",
  "pcgp-6m-topup": "/app/assets/img/catalog/pc-game-pass.jpg",
  "pcgp-9m-topup": "/app/assets/img/catalog/pc-game-pass.jpg",
  "pcgp-12m-topup": "/app/assets/img/catalog/pc-game-pass.jpg",

  // Roblox Robux (Official Artwork)
  "roblox-robux": "/app/assets/img/catalog/roblox-robux.jpg",
  "roblox": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-500": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-600": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-1000": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-1200": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-1500": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-1800": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-2000": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-2400": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-3625": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-4800": "/app/assets/img/catalog/roblox-robux.jpg",
  "rbx-11100": "/app/assets/img/catalog/roblox-robux.jpg",

  // Google Gemini / AI
  "gemini": "/app/assets/img/gemini-logo.png",
  "gemini-18": "/app/assets/img/gemini-logo.png",
  "gemini-plus-3m": "/app/assets/img/gemini-logo.png",
  "gemini-pro-3m": "/app/assets/img/gemini-logo.png",
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

  // 1.1 Fortnite V-Bucks packs & Crew explicit resolution
  if (cleanId.includes("800") || (cleanSlug === "fortnite" && cleanName.includes("800"))) {
    return "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912";
  }
  if (cleanId.includes("2400") || (cleanSlug === "fortnite" && cleanName.includes("2400"))) {
    return "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d";
  }
  if (cleanId.includes("4500") || (cleanSlug === "fortnite" && cleanName.includes("4500"))) {
    return "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3";
  }
  if (cleanId.includes("12500") || (cleanSlug === "fortnite" && cleanName.includes("12500"))) {
    return "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e";
  }
  if (cleanId.includes("crew") || cleanSlug.includes("crew") || cleanName.includes("كرو") || cleanName.includes("crew")) {
    return "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473";
  }

  // 2. Autodesk specific resolution (must be BEFORE any 'tod' check to avoid 'autodesk' matching)
  if (cleanSlug.includes("autodesk") || cleanId.includes("autodesk") || cleanName.includes("autodesk") || cleanName.includes("أوتوديسك")) {
    return "/app/assets/img/catalog/autodesk-cover.jpg";
  }

  // 3. Windows specific resolution
  if (cleanSlug.includes("windows") || cleanId.startsWith("win-") || cleanName.includes("windows") || cleanName.includes("ويندوز")) {
    return "/app/assets/img/catalog/windows-cover.jpg";
  }

  // 4. Razer Gold specific resolution
  if (cleanSlug.includes("razer") || cleanId.includes("razer") || cleanName.includes("razer") || cleanName.includes("ريزر")) {
    return "/app/assets/img/razer-card.jpg";
  }

  // 5. TOD specific resolution by cartId or naming (explicit matching to prevent false positives)
  const isExplicitTod =
    cleanId === "tod" ||
    cleanId.startsWith("tod-") ||
    cleanSlug === "tod" ||
    cleanSlug.startsWith("tod-") ||
    cleanName.startsWith("tod") ||
    cleanName.includes("تود") ||
    cleanName.includes(" tod");

  if (isExplicitTod && !cleanSlug.includes("autodesk") && !cleanId.includes("autodesk")) {
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
  if (
    cleanId.includes("valorant-eu") ||
    cleanSlug.includes("valorant-eu") ||
    cleanId.startsWith("vp-eu") ||
    cleanName.includes("اوروب") ||
    cleanName.includes("europe")
  ) {
    return "/app/assets/img/catalog/valorant-eu-cover.jpg";
  }
  if (cleanId.includes("valorant") || cleanSlug.includes("valorant") || cleanName.includes("فالورانت") || cleanName.includes("ترك")) {
    return "/app/assets/img/catalog/valorant-tr-cover.jpg";
  }

  // 4. FC 27 PC
  if (cleanId === "ea-fc-27-pc" || (cleanSlug.includes("fc-27") && cleanSlug.includes("pc")) || cleanName.includes("fc 27")) {
    return "/app/assets/img/catalog/ea-fc-27-pc.png";
  }

  // 5. Euro Truck Simulator 2
  if (cleanId.includes("truck") || cleanSlug.includes("truck") || cleanName.includes("euro truck")) {
    return "/app/assets/img/catalog/euro-truck-simulator-2.jpg";
  }

  // 6. Xbox Game Pass Ultimate
  if (
    cleanSlug === "xbox-game-pass-ultimate" ||
    cleanId.startsWith("gpu-") ||
    cleanName.includes("ultimate") ||
    cleanName.includes("التيمت") ||
    cleanName.includes("التميت")
  ) {
    return "/app/assets/img/catalog/xbox-game-pass-ultimate.jpg";
  }

  // 7. PC Game Pass
  if (
    cleanSlug === "pc-game-pass" ||
    cleanId.startsWith("pcgp-") ||
    (cleanName.includes("game pass") && cleanName.includes("pc")) ||
    (cleanName.includes("قيم باس") && cleanName.includes("pc"))
  ) {
    return "/app/assets/img/catalog/pc-game-pass.jpg";
  }

  // 8. Roblox Robux
  if (
    cleanSlug.includes("roblox") ||
    cleanId.startsWith("rbx-") ||
    cleanName.includes("roblox") ||
    cleanName.includes("روبلوكس") ||
    cleanName.includes("robux") ||
    cleanName.includes("روبوكس")
  ) {
    return "/app/assets/img/catalog/roblox-robux.jpg";
  }

  // 9. Google Gemini / AI
  if (
    cleanSlug.includes("gemini") ||
    cleanId.startsWith("gemini-") ||
    cleanName.includes("gemini") ||
    cleanName.includes("جيمناي") ||
    cleanName.includes("جيميناي") ||
    cleanName.includes("google ai")
  ) {
    return "/app/assets/img/gemini-logo.png";
  }

  // 10. PlayStation PSN Gift Cards (Official Store Design)
  if (
    cleanSlug.includes("playstation") ||
    cleanSlug.includes("psn") ||
    cleanId.startsWith("psn-") ||
    cleanId.includes("playstation") ||
    cleanName.includes("playstation") ||
    cleanName.includes("بلايستيشن") ||
    cleanName.includes("سوني") ||
    cleanName.includes("psn")
  ) {
    return "/app/assets/img/playstation-card.jpg";
  }

  // 10. Direct match by slug in canonical registry
  if (cleanSlug && CANONICAL_VARIANT_IMAGES[cleanSlug]) {
    return CANONICAL_VARIANT_IMAGES[cleanSlug];
  }

  // 7. Fallback to provided image
  if (fallback && typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }

  return "";
}
