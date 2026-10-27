/* ============================================================
   GX STORE — DYNAMIC RELATED PRODUCTS RECOMMENDATION SYSTEM
   Deterministic, multi-tier product recommendation engine.
   Strictly uses GXStore's own catalog database without external APIs or AI.
   Guarantees up to 8 distinct, ranked related products.
   ============================================================ */

import type { CatalogStoreProduct } from "@/lib/gx/catalog.functions";

export interface RecommendationCandidate {
  id?: string;
  slug: string;
  nameAr?: string | null;
  nameEn?: string | null;
  taglineAr?: string | null;
  taglineEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  categorySlug?: string | null;
  parentCategorySlug?: string | null;
  categoryNameAr?: string | null;
  categoryNameEn?: string | null;
  platform?: string | null;
  deliveryType?: string | null;
  productType?: string | null;
  basePriceJod?: number | null;
  oldPriceJod?: number | null;
  imageUrl?: string | null;
  badge?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  isGiftCardMaster?: boolean;
  sortOrder?: number | null;
  [key: string]: any;
}

export interface ScoredRecommendation<T = RecommendationCandidate> {
  product: T;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  score: number;
  reason: string;
}

/**
 * Normalizes Arabic and English text for accurate token matching:
 * - Strips Arabic diacritics / Tashkeel & Tatweel
 * - Normalizes Alefs with Hamza / Madda (أ, إ, آ, ٱ -> ا)
 * - Normalizes Alif Maqsura (ى -> ي)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Waw/Yaa with Hamza (ؤ -> و, ئ -> ي)
 * - Lowercases English text and strips punctuation
 */
export function normalizeText(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[-_.,/:;()!+*~&|#@\\"'?<>\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common stopwords in Arabic and English to ignore during token similarity calculation
 */
const STOPWORDS = new Set([
  // Arabic stopwords
  "في", "من", "على", "عن", "مع", "الى", "إلى", "هذا", "هذه", "التي", "الذي", "الذين",
  "نسخة", "اشتراك", "حساب", "كود", "بطاقة", "بطاقات", "رسمي", "شحن", "باقة", "تفعيل",
  "سنة", "شهر", "اشهر", "أشهر", "يوم", "خاص", "بك", "لك", "متجر", "خدمة", "خدمات",
  // English stopwords
  "the", "and", "or", "for", "with", "edition", "subscription", "account", "key",
  "code", "card", "cards", "official", "pack", "packs", "global", "month", "months",
  "year", "years", "day", "days", "premium", "plus", "store", "digital", "instant",
]);

/**
 * Tokenizes text into distinct normalized words, filtering out stopwords
 */
export function tokenize(str?: string | null): string[] {
  if (!str) return [];
  const normalized = normalizeText(str);
  const rawWords = normalized.split(/\s+/);
  const tokens = new Set<string>();

  for (const w of rawWords) {
    if (w.length >= 2 && !STOPWORDS.has(w)) {
      tokens.add(w);
    }
  }

  return Array.from(tokens);
}

/**
 * Known brands/providers mapped to signature tokens.
 * Dynamically matches products by name or slug.
 */
const KNOWN_BRANDS: Array<{ brand: string; tokens: string[] }> = [
  { brand: "google", tokens: ["google", "gemini", "youtube", "play", "قوقل", "جوجل", "يوتيوب"] },
  { brand: "adobe", tokens: ["adobe", "photoshop", "illustrator", "acrobat", "ادوبي", "فوتوشوب"] },
  { brand: "microsoft", tokens: ["microsoft", "windows", "office", "365", "xbox", "minecraft", "ويندوز", "مايكروسوفت", "اوفيس", "اكسبوكس", "ماينكرافت"] },
  { brand: "sony", tokens: ["playstation", "psn", "ps5", "ps4", "sony", "بلايستيشن", "سوني"] },
  { brand: "apple", tokens: ["apple", "itunes", "icloud", "ios", "ابل", "آبل", "ايتونز", "آيتونز"] },
  { brand: "rockstar", tokens: ["rockstar", "gta", "grand theft auto", "red dead", "rdr", "روكستار", "قراند"] },
  { brand: "ea", tokens: ["ea", "ea sports", "fifa", "fc", "battlefield", "فيفا"] },
  { brand: "epic", tokens: ["epic", "fortnite", "vbucks", "v-bucks", "فورتنايت", "فورت نايت", "فيبوكس"] },
  { brand: "riot", tokens: ["riot", "valorant", "league of legends", "vp", "فالورانت"] },
  { brand: "steam", tokens: ["steam", "valve", "ستيم"] },
  { brand: "linkedin", tokens: ["linkedin", "لينكد", "لينكد ان"] },
  { brand: "canva", tokens: ["canva", "كانفا"] },
  { brand: "notion", tokens: ["notion", "نوشن"] },
  { brand: "nordvpn", tokens: ["nordvpn", "nord", "vpn"] },
  { brand: "tod", tokens: ["tod", "bein", "تود", "بي ان"] },
  { brand: "snapchat", tokens: ["snapchat", "snap", "سناب", "سناب شات"] },
  { brand: "discord", tokens: ["discord", "nitro", "ديسكورد", "دسكورد", "نيترو"] },
  { brand: "duolingo", tokens: ["duolingo", "دولينجو", "دولينغو"] },
  { brand: "autodesk", tokens: ["autodesk", "autocad", "3ds", "اوتوديسك"] },
];

/**
 * Extracts the primary brand or provider for a product
 */
export function extractBrand(p: RecommendationCandidate): string | null {
  const haystack = `${p.slug} ${p.nameEn || ""} ${p.nameAr || ""} ${p.platform || ""}`.toLowerCase();

  for (const b of KNOWN_BRANDS) {
    for (const t of b.tokens) {
      if (haystack.includes(t)) {
        return b.brand;
      }
    }
  }

  // Heuristic: check if platform itself is a specific brand
  if (p.platform) {
    const platNorm = normalizeText(p.platform);
    if (platNorm.includes("steam")) return "steam";
    if (platNorm.includes("rockstar")) return "rockstar";
    if (platNorm.includes("xbox")) return "microsoft";
    if (platNorm.includes("playstation")) return "sony";
    if (platNorm.includes("apple")) return "apple";
    if (platNorm.includes("windows")) return "microsoft";
  }

  // Heuristic: root segment of slug if length >= 3
  const slugParts = p.slug.split("-");
  if (slugParts.length > 1 && slugParts[0].length >= 4) {
    return slugParts[0];
  }

  return null;
}

/**
 * Determines broader product use-case / ecosystem domain
 */
export function determineDomain(p: RecommendationCandidate): string {
  const slug = p.slug.toLowerCase();
  const cat = (p.categorySlug || p.parentCategorySlug || "").toLowerCase();
  const name = `${p.nameEn || ""} ${p.nameAr || ""}`.toLowerCase();

  if (
    slug.includes("gemini") ||
    slug.includes("notion") ||
    slug.includes("lovable") ||
    slug.includes("cursor") ||
    slug.includes("chatgpt") ||
    cat === "ai"
  ) {
    return "ai_productivity";
  }

  if (
    slug.includes("adobe") ||
    slug.includes("canva") ||
    slug.includes("autodesk") ||
    cat === "design"
  ) {
    return "design_creative";
  }

  if (
    slug.includes("tod") ||
    slug.includes("youtube") ||
    slug.includes("netflix") ||
    slug.includes("shahid") ||
    slug.includes("osn") ||
    cat === "streaming"
  ) {
    return "streaming_entertainment";
  }

  if (
    slug.includes("fortnite") ||
    slug.includes("valorant") ||
    slug.includes("vbucks") ||
    name.includes("v-bucks") ||
    name.includes("points")
  ) {
    return "game_currencies";
  }

  if (
    cat === "games" ||
    cat === "pc-games" ||
    cat === "xbox-games" ||
    slug.includes("fc-") ||
    slug.includes("gta") ||
    slug.includes("red-dead") ||
    slug.includes("helldivers") ||
    slug.includes("forza") ||
    slug.includes("resident-evil") ||
    slug.includes("minecraft") ||
    slug.includes("mortal-kombat")
  ) {
    return "video_games";
  }

  if (
    cat === "gift-cards" ||
    slug === "playstation" ||
    slug === "xbox" ||
    slug === "itunes" ||
    slug === "google-play" ||
    p.isGiftCardMaster
  ) {
    return "gift_cards";
  }

  if (
    cat === "social-media" ||
    slug.includes("follower") ||
    slug.includes("like") ||
    slug.includes("snapchat")
  ) {
    return "social_media";
  }

  if (
    slug.includes("windows") ||
    slug.includes("microsoft365") ||
    slug.includes("nordvpn") ||
    slug.includes("headspace") ||
    slug.includes("duolingo") ||
    slug.includes("linkedin")
  ) {
    return "software_utility";
  }

  return cat || "general";
}

/**
 * Calculates token overlap between two products
 */
export function computeTokenOverlap(a: RecommendationCandidate, b: RecommendationCandidate): number {
  const tokensA = new Set([
    ...tokenize(a.nameAr),
    ...tokenize(a.nameEn),
    ...tokenize(a.slug),
    ...tokenize(a.taglineAr),
    ...tokenize(a.taglineEn),
  ]);

  const tokensB = [
    ...tokenize(b.nameAr),
    ...tokenize(b.nameEn),
    ...tokenize(b.slug),
    ...tokenize(b.taglineAr),
    ...tokenize(b.taglineEn),
  ];

  let matches = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) {
      matches++;
    }
  }

  return matches;
}

/**
 * Scores a candidate against the current product following the 6-Tier Hierarchy
 */
export function scoreCandidate(
  current: RecommendationCandidate,
  candidate: RecommendationCandidate,
): ScoredRecommendation {
  // Compute common signals
  const currentBrand = extractBrand(current);
  const candidateBrand = extractBrand(candidate);
  const currentDomain = determineDomain(current);
  const candidateDomain = determineDomain(candidate);

  const currentSlugRoot = current.slug.split("-")[0];
  const candidateSlugRoot = candidate.slug.split("-")[0];

  const sameCategory =
    Boolean(current.categorySlug && current.categorySlug === candidate.categorySlug) ||
    Boolean(current.parentCategorySlug && current.parentCategorySlug === candidate.parentCategorySlug);

  const currentType = (current.deliveryType || current.productType || "").toLowerCase();
  const candidateType = (candidate.deliveryType || candidate.productType || "").toLowerCase();
  const sameType = Boolean(currentType && currentType === candidateType);

  const currentPlat = normalizeText(current.platform);
  const candidatePlat = normalizeText(candidate.platform);
  const samePlatform = Boolean(currentPlat && candidatePlat && (currentPlat.includes(candidatePlat) || candidatePlat.includes(currentPlat)));

  const tokenMatches = computeTokenOverlap(current, candidate);

  // Price proximity bonus (max 10 points)
  const priceA = Number(current.basePriceJod || 0);
  const priceB = Number(candidate.basePriceJod || 0);
  const priceDiff = Math.abs(priceA - priceB);
  const priceProximityBonus = priceA > 0 && priceB > 0 ? Math.max(0, 10 - Math.min(10, priceDiff / 5)) : 0;

  // ------------------------------------------------------------
  // TIER 1: Same product family, different variants/packages
  // ------------------------------------------------------------
  const isVariantOfSameProduct =
    (currentSlugRoot.length >= 3 && currentSlugRoot === candidateSlugRoot) ||
    current.slug.startsWith(candidate.slug + "-") ||
    candidate.slug.startsWith(current.slug + "-");

  if (isVariantOfSameProduct) {
    const score = 1000 + tokenMatches * 20 + priceProximityBonus;
    return { product: candidate, tier: 1, score, reason: "Same product family or package variant" };
  }

  // ------------------------------------------------------------
  // TIER 2: Same brand or service
  // ------------------------------------------------------------
  if (currentBrand && candidateBrand && currentBrand === candidateBrand) {
    const score = 500 + tokenMatches * 15 + priceProximityBonus;
    return { product: candidate, tier: 2, score, reason: `Same brand/service (${currentBrand})` };
  }

  // ------------------------------------------------------------
  // TIER 3: Same product type and compatible platform
  // ------------------------------------------------------------
  if (sameType && samePlatform) {
    const score = 300 + tokenMatches * 12 + priceProximityBonus;
    return { product: candidate, tier: 3, score, reason: "Same product type and platform" };
  }

  // ------------------------------------------------------------
  // TIER 4: Related alternatives or complementary products (same domain)
  // ------------------------------------------------------------
  if (currentDomain !== "general" && currentDomain === candidateDomain) {
    const score = 200 + tokenMatches * 10 + (sameType ? 25 : 0) + priceProximityBonus;
    return { product: candidate, tier: 4, score, reason: `Related complementary product in domain (${currentDomain})` };
  }

  // ------------------------------------------------------------
  // TIER 5: Same broader product domain / category
  // ------------------------------------------------------------
  if (sameCategory) {
    const score = 100 + tokenMatches * 8 + priceProximityBonus;
    return { product: candidate, tier: 5, score, reason: "Same category/store section" };
  }

  // ------------------------------------------------------------
  // TIER 6: Closest remaining eligible products
  // ------------------------------------------------------------
  const orderRank = typeof candidate.sortOrder === "number" ? Math.max(0, 50 - candidate.sortOrder) : 10;
  const score = 10 + tokenMatches * 5 + priceProximityBonus + orderRank * 0.2;
  return { product: candidate, tier: 6, score, reason: "Closest available catalog alternative" };
}

/**
 * Main Deterministic Recommendation Ranking Engine.
 *
 * Rules:
 * 1. Excludes current product.
 * 2. Excludes duplicates (unique slugs).
 * 3. Excludes inactive/unpublished items (is_active === false).
 * 4. Ranks strictly by Tier (Tier 1 down to Tier 6).
 * 5. Within each tier, ranks by similarity score descending.
 * 6. Always fills up to `limit` (default 8) distinct products whenever enough items exist.
 */
export function rankRelatedProducts<T extends RecommendationCandidate = CatalogStoreProduct>(
  currentProduct: RecommendationCandidate,
  allCatalogProducts: T[],
  limit = 8,
): T[] {
  if (!currentProduct || !allCatalogProducts || allCatalogProducts.length === 0) {
    return [];
  }

  const currentSlug = (currentProduct.slug || "").trim().toLowerCase();
  const currentId = currentProduct.id;

  // 1. Filter out current product, inactive items, and deduplicate by slug
  const seenSlugs = new Set<string>();
  if (currentSlug) seenSlugs.add(currentSlug);

  const eligibleCandidates: T[] = [];

  for (const item of allCatalogProducts) {
    if (!item || !item.slug) continue;
    const itemSlug = item.slug.trim().toLowerCase();

    // Exclude current product
    if (itemSlug === currentSlug) continue;
    if (currentId && item.id && item.id === currentId) continue;

    // Exclude inactive / unpublished
    if (item.isActive === false || item.is_active === false) continue;

    // Deduplicate
    if (seenSlugs.has(itemSlug)) continue;
    seenSlugs.add(itemSlug);

    eligibleCandidates.push(item);
  }

  // 2. Score every candidate
  const scoredByTier: Record<1 | 2 | 3 | 4 | 5 | 6, Array<ScoredRecommendation<T>>> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (const candidate of eligibleCandidates) {
    const scored = scoreCandidate(currentProduct, candidate);
    scoredByTier[scored.tier].push({
      product: candidate,
      tier: scored.tier,
      score: scored.score,
      reason: scored.reason,
    });
  }

  // 3. Sort each tier descending by score
  for (let t = 1; t <= 6; t++) {
    const tierKey = t as 1 | 2 | 3 | 4 | 5 | 6;
    scoredByTier[tierKey].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Secondary tie-breaker: sortOrder
      const ordA = a.product.sortOrder ?? 999;
      const ordB = b.product.sortOrder ?? 999;
      return ordA - ordB;
    });
  }

  // 4. Progressively fill final recommendations up to `limit`
  const result: T[] = [];

  for (let t = 1; t <= 6; t++) {
    const tierKey = t as 1 | 2 | 3 | 4 | 5 | 6;
    for (const item of scoredByTier[tierKey]) {
      result.push(item.product);
      if (result.length >= limit) {
        return result;
      }
    }
  }

  return result;
}
