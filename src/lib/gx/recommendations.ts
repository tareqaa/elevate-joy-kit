/* ============================================================
   GX STORE — DYNAMIC RELATED PRODUCTS RECOMMENDATION SYSTEM
   Deterministic, multi-factor product recommendation engine.
   Strictly uses GXStore's own catalog database without external APIs or AI.
   Analyzes product names, taglines, descriptions, categories,
   platforms, and delivery types with an intelligent scoring system.
   Guarantees up to 8 distinct, ranked related products.
   ============================================================ */

import type { CatalogStoreProduct } from "@/lib/gx/catalog.functions";

export interface RecommendationCandidate {
  id?: string;
  slug: string;
  nameAr?: string | null;
  name_ar?: string | null;
  nameEn?: string | null;
  name_en?: string | null;
  taglineAr?: string | null;
  tagline_ar?: string | null;
  taglineEn?: string | null;
  tagline_en?: string | null;
  descriptionAr?: string | null;
  description_ar?: string | null;
  descriptionEn?: string | null;
  description_en?: string | null;
  categorySlug?: string | null;
  category_slug?: string | null;
  parentCategorySlug?: string | null;
  parent_category_slug?: string | null;
  categoryNameAr?: string | null;
  categoryNameEn?: string | null;
  platform?: string | null;
  deliveryType?: string | null;
  delivery_type?: string | null;
  productType?: string | null;
  product_type?: string | null;
  basePriceJod?: number | null;
  base_price_jod?: number | null;
  oldPriceJod?: number | null;
  old_price_jod?: number | null;
  imageUrl?: string | null;
  badge?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  isGiftCardMaster?: boolean;
  sortOrder?: number | null;
  sort_order?: number | null;
  [key: string]: any;
}

export interface ScoredRecommendation<T = RecommendationCandidate> {
  product: T;
  score: number;
  reason: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
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
    .replace(/[\u064B-\u0652\u0640]/g, "") // Diacritics & Tatweel
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
 * Common stopwords and store eCommerce boilerplate words in Arabic and English
 * to ignore during token similarity calculation, ensuring matches reflect
 * true domain/product relevance rather than generic store templates.
 */
export const STOPWORDS = new Set([
  // Common Arabic particles & prepositions
  "في", "من", "على", "عن", "مع", "الى", "إلى", "هذا", "هذه", "التي", "الذي", "الذين", "او", "أو", "ثم", "حتى",
  "كل", "جميع", "غير", "بدون", "بين", "دون", "تم", "يتم", "عبر", "خلال", "ما", "هو", "هي", "هم", "كان", "كانت",
  // Store & eCommerce boilerplate (present in almost every product description)
  "نسخة", "اشتراك", "حساب", "كود", "بطاقة", "بطاقات", "رسمي", "شحن", "باقة", "تفعيل",
  "سنة", "شهر", "اشهر", "أشهر", "يوم", "خاص", "بك", "لك", "متجر", "خدمة", "خدمات",
  "جهاز", "اجهزة", "أجهزة", "مدى", "الحياة", "سريع", "فوري", "تلقائي", "مباشر", "رابط",
  "تسليم", "ضمان", "ذهبي", "كامل", "المدة", "المده", "طوال", "اصلي", "أصلي", "افضل", "أفضل",
  "سعر", "اسعار", "أسعار", "طلب", "شراء", "حصري", "رقمي", "جديد", "مباشرة", "مباشره",
  "شامل", "مضمون", "عالمي", "متوفر", "الان", "الآن", "فقط", "طريقة", "كيفية",
  // English common words & boilerplate
  "the", "and", "or", "for", "with", "edition", "subscription", "account", "key",
  "code", "card", "cards", "official", "pack", "packs", "global", "month", "months",
  "year", "years", "day", "days", "premium", "plus", "store", "digital", "instant",
  "delivery", "guarantee", "lifetime", "price", "best", "order", "buy", "exclusive",
  "link", "original", "full", "all", "new", "available", "now", "device", "devices"
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
 * Semantic Concept Clusters for GX Store products.
 * Matches products by their core functional domain across title, slug, and descriptions.
 */
export const CONCEPT_CLUSTERS: Array<{
  id: string;
  name: string;
  keywords: string[];
}> = [
  {
    id: "vpn_privacy",
    name: "VPN & Privacy / Security",
    keywords: [
      "vpn", "بروكسي", "proxy", "خصوصيه", "خصوصية", "تشفير", "secureline",
      "تصفح امن", "تصفح آمن", "شبكه افتراضيه", "شبكة افتراضية", "nordvpn", "nord",
      "surfshark", "سيرفشارك", "سورفشارك", "expressvpn", "اكسبريس", "avast", "افاست",
      "avg", "اي في جي"
    ]
  },
  {
    id: "ai_productivity",
    name: "AI & Smart Productivity",
    keywords: [
      "ai", "ذكاء اصطناعي", "gemini", "جيمناي", "chatgpt", "gpt", "notion", "نوشن",
      "lovable", "cursor", "copilot", "claude", "شات جي بي تي", "مساعد ذكي"
    ]
  },
  {
    id: "design_creative",
    name: "Design & Creative Tools",
    keywords: [
      "تصميم", "adobe", "ادوبي", "photoshop", "فوتوشوب", "illustrator",
      "اليستريتور", "canva", "كانفا", "autodesk", "اوتوديسك", "autocad", "3ds",
      "maya", "capcut", "كاب كات", "مونتاج", "جرافيك", "creative cloud"
    ]
  },
  {
    id: "streaming_entertainment",
    name: "Streaming & Entertainment",
    keywords: [
      "streaming", "بث", "مشاهده", "مباريات", "افلام", "مسلسلات", "tod", "تود",
      "bein", "بي ان", "youtube", "يوتيوب", "netflix", "نتفلكس", "shahid", "شاهد",
      "osn", "او اس ان", "spotify", "سبوتيفاي", "anghami", "انغامي", "crunchyroll"
    ]
  },
  {
    id: "football_sports",
    name: "Football & Sports Gaming",
    keywords: [
      "fc", "fifa", "فيفا", "كره قدم", "كرة قدم", "football", "soccer", "ea sports", "nba",
      "2k", "كره السله", "دوري"
    ]
  },
  {
    id: "horror_survival",
    name: "Horror & Survival Games",
    keywords: [
      "resident evil", "ريزدنت", "biohazard", "horror", "رعب", "بقاء", "survival",
      "zombie", "زومبي", "silent hill", "dead space", "alan wake", "last of us"
    ]
  },
  {
    id: "action_openworld",
    name: "Open World & Action Adventure",
    keywords: [
      "gta", "grand theft auto", "قراند", "red dead", "rdr", "روكستار", "rockstar",
      "mafia", "مافيا", "batman", "باتمان", "cyberpunk", "control", "witcher"
    ]
  },
  {
    id: "shooter_battle_royale",
    name: "Shooters & In-game Currencies",
    keywords: [
      "fortnite", "فورتنايت", "vbucks", "v-bucks", "فيبوكس", "valorant", "فالورانت",
      "vp", "call of duty", "كول اوف ديوتي", "cod", "pubg", "ببجي", "شدات",
      "helldivers", "arc raiders", "battlefield"
    ]
  },
  {
    id: "gift_cards_wallets",
    name: "Gift Cards & Wallet Vouchers",
    keywords: [
      "gift card", "شحن رصيد", "محفظه", "محفظة", "playstation", "psn", "بلايستيشن",
      "xbox card", "itunes", "ايتونز", "آيتونز", "google play", "جوجل بلاي",
      "steam wallet", "ستيم والت", "razer"
    ]
  },
  {
    id: "social_media_growth",
    name: "Social Media & Growth",
    keywords: [
      "متابعين", "followers", "لايكات", "likes", "سناب شات", "snapchat", "سناب",
      "تيك توك", "tiktok", "انستغرام", "instagram", "ديسكورد", "discord", "nitro",
      "نيترو", "telegram", "تيليجرام"
    ]
  },
  {
    id: "os_office_software",
    name: "Operating Systems & Office Utilities",
    keywords: [
      "windows", "ويندوز", "microsoft 365", "مايكروسوفت", "office", "اوفيس",
      "oem", "word", "excel", "powerpoint"
    ]
  }
];

/**
 * Extracts semantic concept IDs matching a given product candidate
 */
export function extractConcepts(p: RecommendationCandidate): Set<string> {
  const concepts = new Set<string>();
  const titleHaystack = normalizeText(`
    ${p.slug || ""}
    ${p.nameEn || p.name_en || ""}
    ${p.nameAr || p.name_ar || ""}
    ${p.taglineEn || p.tagline_en || ""}
    ${p.taglineAr || p.tagline_ar || ""}
  `);
  const fullHaystack = normalizeText(`
    ${titleHaystack}
    ${p.descriptionEn || p.description_en || ""}
    ${p.descriptionAr || p.description_ar || ""}
    ${p.platform || ""}
  `);

  const hayTokens = new Set(tokenize(fullHaystack));

  for (const cluster of CONCEPT_CLUSTERS) {
    for (const kw of cluster.keywords) {
      const normKw = normalizeText(kw);
      if (normKw.includes(" ")) {
        if (fullHaystack.includes(normKw)) {
          concepts.add(cluster.id);
          break;
        }
      } else {
        if (
          hayTokens.has(normKw) ||
          fullHaystack.includes(` ${normKw} `) ||
          fullHaystack.startsWith(`${normKw} `) ||
          fullHaystack.endsWith(` ${normKw}`)
        ) {
          concepts.add(cluster.id);
          break;
        }
      }
    }
  }

  return concepts;
}

/**
 * Determines broader product use-case / ecosystem domain
 */
export function determineDomain(p: RecommendationCandidate): string {
  const concepts = extractConcepts(p);
  if (concepts.size > 0) {
    return Array.from(concepts)[0];
  }
  const cat = (p.categorySlug || p.category_slug || p.parentCategorySlug || p.parent_category_slug || "").toLowerCase();
  return cat || "general";
}

/**
 * Known brands/publishers mapped to strict signature tokens.
 * Matches using exact word boundaries only to avoid false substring matches
 * (e.g. "ios" must not match "bioshock").
 */
const KNOWN_BRANDS: Array<{ brand: string; wordTokens: string[] }> = [
  { brand: "capcom", wordTokens: ["capcom", "كابكوم", "resident"] },
  { brand: "ea", wordTokens: ["ea", "fifa", "battlefield"] },
  { brand: "rockstar", wordTokens: ["rockstar", "روكستار", "gta", "rdr"] },
  { brand: "epic", wordTokens: ["epic", "fortnite", "فورتنايت", "vbucks"] },
  { brand: "riot", wordTokens: ["riot", "valorant", "فالورانت"] },
  { brand: "microsoft", wordTokens: ["microsoft", "windows", "ويندوز", "مايكروسوفت", "office", "اوفيس", "xbox"] },
  { brand: "sony", wordTokens: ["sony", "سوني", "playstation", "بلايستيشن", "psn"] },
  { brand: "adobe", wordTokens: ["adobe", "ادوبي", "photoshop", "illustrator"] },
  { brand: "google", wordTokens: ["google", "قوقل", "جوجل", "gemini", "جيمناي", "youtube", "يوتيوب"] },
  { brand: "apple", wordTokens: ["apple", "ابل", "آبل", "itunes", "ايتونز", "آيتونز", "icloud"] },
  { brand: "canva", wordTokens: ["canva", "كانفا"] },
  { brand: "notion", wordTokens: ["notion", "نوشن"] },
  { brand: "duolingo", wordTokens: ["duolingo", "دولينجو"] },
  { brand: "autodesk", wordTokens: ["autodesk", "اوتوديسك", "autocad"] },
  { brand: "snapchat", wordTokens: ["snapchat", "سناب"] },
  { brand: "discord", wordTokens: ["discord", "ديسكورد", "nitro"] },
  { brand: "tod", wordTokens: ["tod", "تود", "bein"] },
  { brand: "netflix", wordTokens: ["netflix", "نتفلكس"] },
  { brand: "nord", wordTokens: ["nordvpn", "نورد"] },
  { brand: "surfshark", wordTokens: ["surfshark", "سيرفشارك", "سورفشارك"] },
  { brand: "expressvpn", wordTokens: ["expressvpn", "اكسبريس"] },
  { brand: "avast", wordTokens: ["avast", "افاست"] },
  { brand: "avg", wordTokens: ["avg"] },
];

/**
 * Extracts the primary brand or publisher for a product candidate using strict word tokens.
 */
export function extractBrand(p: RecommendationCandidate): string | null {
  const haystack = normalizeText(`${p.slug} ${p.nameEn || p.name_en || ""} ${p.nameAr || p.name_ar || ""}`);
  const tokens = new Set(tokenize(haystack));

  for (const b of KNOWN_BRANDS) {
    for (const wt of b.wordTokens) {
      const norm = normalizeText(wt);
      if (tokens.has(norm)) {
        return b.brand;
      }
    }
  }

  // Check platform if it explicitly names a standalone brand
  if (p.platform) {
    const platTokens = new Set(tokenize(p.platform));
    if (platTokens.has("steam")) return "valve";
    if (platTokens.has("rockstar")) return "rockstar";
    if (platTokens.has("xbox")) return "microsoft";
    if (platTokens.has("playstation")) return "sony";
  }

  // Heuristic: root segment of slug if length >= 4
  const slugParts = (p.slug || "").split("-");
  if (slugParts.length > 1 && slugParts[0].length >= 4) {
    return slugParts[0];
  }

  return null;
}

/**
 * Calculates token overlap between two products
 */
export function computeTokenOverlap(a: RecommendationCandidate, b: RecommendationCandidate): number {
  const tokensA = new Set([
    ...tokenize(a.nameAr || a.name_ar),
    ...tokenize(a.nameEn || a.name_en),
    ...tokenize(a.slug),
    ...tokenize(a.taglineAr || a.tagline_ar),
    ...tokenize(a.taglineEn || a.tagline_en),
    ...tokenize(a.descriptionAr || a.description_ar),
    ...tokenize(a.descriptionEn || a.description_en),
  ]);

  const tokensB = new Set([
    ...tokenize(b.nameAr || b.name_ar),
    ...tokenize(b.nameEn || b.name_en),
    ...tokenize(b.slug),
    ...tokenize(b.taglineAr || b.tagline_ar),
    ...tokenize(b.taglineEn || b.tagline_en),
    ...tokenize(b.descriptionAr || b.description_ar),
    ...tokenize(b.descriptionEn || b.description_en),
  ]);

  let matches = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) {
      matches++;
    }
  }

  return matches;
}

/**
 * Scores a candidate against the current product using the intelligent multi-factor scoring system.
 */
export function scoreCandidate(
  current: RecommendationCandidate,
  candidate: RecommendationCandidate,
): ScoredRecommendation {
  let score = 0;
  const reasons: string[] = [];

  // 1. Concept / Semantic Cluster Match (Max 800+ pts)
  const currentConcepts = extractConcepts(current);
  const candidateConcepts = extractConcepts(candidate);
  let sharedConcepts = 0;
  const matchedConcepts: string[] = [];
  for (const c of candidateConcepts) {
    if (currentConcepts.has(c)) {
      sharedConcepts++;
      matchedConcepts.push(c);
    }
  }

  if (sharedConcepts > 0) {
    const conceptBonus = 800 + (sharedConcepts - 1) * 150;
    score += conceptBonus;
    reasons.push(`Shared concept (${matchedConcepts.join(", ")}) +${conceptBonus}`);
  }

  // 2. Title word/token matches (Max 350 pts)
  const titleTokensA = new Set([
    ...tokenize(current.nameAr || current.name_ar),
    ...tokenize(current.nameEn || current.name_en),
    ...tokenize(current.slug),
  ]);
  const titleTokensB = new Set([
    ...tokenize(candidate.nameAr || candidate.name_ar),
    ...tokenize(candidate.nameEn || candidate.name_en),
    ...tokenize(candidate.slug),
  ]);
  let titleMatches = 0;
  const matchedTitleTokens: string[] = [];
  for (const t of titleTokensB) {
    if (titleTokensA.has(t)) {
      titleMatches++;
      matchedTitleTokens.push(t);
    }
  }
  if (titleMatches > 0) {
    const titleBonus = Math.min(350, titleMatches * 90);
    score += titleBonus;
    reasons.push(`Title tokens (${matchedTitleTokens.join(", ")}) +${titleBonus}`);
  }

  // 3. Description & Tagline word/token matches (Max 200 pts)
  const descTokensA = new Set([
    ...tokenize(current.descriptionAr || current.description_ar),
    ...tokenize(current.descriptionEn || current.description_en),
    ...tokenize(current.taglineAr || current.tagline_ar),
    ...tokenize(current.taglineEn || current.tagline_en),
  ]);
  const descTokensB = new Set([
    ...tokenize(candidate.descriptionAr || candidate.description_ar),
    ...tokenize(candidate.descriptionEn || candidate.description_en),
    ...tokenize(candidate.taglineAr || candidate.tagline_ar),
    ...tokenize(candidate.taglineEn || candidate.tagline_en),
  ]);
  let descMatches = 0;
  for (const t of descTokensB) {
    if (descTokensA.has(t)) {
      descMatches++;
    }
  }
  if (descMatches > 0) {
    const descBonus = Math.min(200, descMatches * 15);
    score += descBonus;
    reasons.push(`Description matches (${descMatches}) +${descBonus}`);
  }

  // 4. Franchise root match (e.g. "resident-evil" or "ea-fc" or "linkedin-career") (Max 450 pts)
  const currSlugRoot = (current.slug || "").split("-").slice(0, 2).join("-");
  const candSlugRoot = (candidate.slug || "").split("-").slice(0, 2).join("-");
  const isVariantOfSameProduct =
    (currSlugRoot && currSlugRoot === candSlugRoot && currSlugRoot.length >= 4) ||
    (current.slug && candidate.slug && (current.slug.startsWith(candidate.slug + "-") || candidate.slug.startsWith(current.slug + "-")));

  if (isVariantOfSameProduct) {
    score += 450;
    reasons.push(`Franchise / variant root match (${currSlugRoot}) +450`);
  }

  // 5. Brand / Publisher match (Max 250 pts)
  const brandA = extractBrand(current);
  const brandB = extractBrand(candidate);
  if (brandA && brandB && brandA === brandB) {
    score += 250;
    reasons.push(`Same brand/publisher (${brandA}) +250`);
  }

  // 6. Category match (Max 100 pts)
  const catA = current.categorySlug || current.category_slug;
  const catB = candidate.categorySlug || candidate.category_slug;
  if (catA && catB && catA === catB) {
    score += 100;
    reasons.push(`Same category (${catA}) +100`);
  }

  // 7. Parent category match (Max 40 pts)
  const pCatA = current.parentCategorySlug || current.parent_category_slug;
  const pCatB = candidate.parentCategorySlug || candidate.parent_category_slug;
  if (pCatA && pCatB && pCatA === pCatB) {
    score += 40;
    reasons.push(`Same parent category +40`);
  }

  // 8. Platform compatibility (Max 40 pts)
  const platA = normalizeText(current.platform);
  const platB = normalizeText(candidate.platform);
  if (platA && platB && (platA === platB || platA.includes(platB) || platB.includes(platA))) {
    score += 40;
    reasons.push(`Compatible platform +40`);
  }

  // 9. Delivery type match (Max 20 pts)
  const delA = (current.deliveryType || current.delivery_type || current.productType || current.product_type || "").toLowerCase();
  const delB = (candidate.deliveryType || candidate.delivery_type || candidate.productType || candidate.product_type || "").toLowerCase();
  if (delA && delB && delA === delB) {
    score += 20;
    reasons.push(`Same delivery type +20`);
  }

  // 10. Price proximity bonus (Max 15 pts)
  const priceA = Number(current.basePriceJod || current.base_price_jod || 0);
  const priceB = Number(candidate.basePriceJod || candidate.base_price_jod || 0);
  if (priceA > 0 && priceB > 0) {
    const diff = Math.abs(priceA - priceB);
    const priceBonus = Math.max(0, 15 - Math.min(15, diff / 2));
    score += Math.round(priceBonus);
  }

  // 11. Subtle sort order tie-breaker
  const sortOrd = candidate.sortOrder ?? candidate.sort_order ?? 999;
  score += Math.max(0, (1000 - sortOrd) * 0.001);

  // Map total score to Tier for structured reporting & test compatibility
  let tier: 1 | 2 | 3 | 4 | 5 | 6 = 6;
  if (isVariantOfSameProduct || score >= 1200) {
    tier = 1;
  } else if ((brandA && brandB && brandA === brandB) || score >= 750) {
    tier = 2;
  } else if ((delA && delB && delA === delB && platA && platB && platA === platB) || score >= 450) {
    tier = 3;
  } else if (sharedConcepts > 0 || score >= 200) {
    tier = 4;
  } else if (catA && catB && catA === catB || score >= 80) {
    tier = 5;
  } else {
    tier = 6;
  }

  const finalScore = Math.round(score);
  const reasonText = reasons.length > 0 ? reasons.join(" | ") : "Closest available catalog item";

  return {
    product: candidate,
    score: finalScore,
    reason: reasonText,
    tier,
  };
}

/**
 * Main Deterministic Recommendation Ranking Engine.
 *
 * Rules:
 * 1. Excludes current product (by slug or id).
 * 2. Excludes duplicates (unique slugs).
 * 3. Excludes inactive/unpublished items (is_active === false or isActive === false).
 * 4. Deeply scans name, description, category, and platform using multi-factor scoring.
 * 5. Sorts all eligible products descending by calculated score.
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

  // 1. Filter out current product, inactive items, and group candidates by slug to keep the best variant
  const slugCandidates = new Map<string, T[]>();

  for (const item of allCatalogProducts) {
    if (!item || !item.slug) continue;
    const itemSlug = item.slug.trim().toLowerCase();

    // Exclude current product
    if (itemSlug === currentSlug) continue;
    if (currentId && item.id && item.id === currentId) continue;

    // Exclude inactive / unpublished
    if (item.isActive === false || item.is_active === false) continue;

    if (!slugCandidates.has(itemSlug)) {
      slugCandidates.set(itemSlug, []);
    }
    slugCandidates.get(itemSlug)!.push(item);
  }

  // 2. Score every distinct candidate slug, taking the highest-scoring variant if multiple exist
  const scoredItems: Array<ScoredRecommendation<T>> = [];

  for (const [, candidates] of slugCandidates) {
    let bestScored: ScoredRecommendation<T> | null = null;

    for (const cand of candidates) {
      const scored = scoreCandidate(currentProduct, cand);
      if (!bestScored || scored.score > bestScored.score) {
        bestScored = {
          product: cand,
          score: scored.score,
          reason: scored.reason,
          tier: scored.tier,
        };
      }
    }

    if (bestScored) {
      scoredItems.push(bestScored);
    }
  }

  // 3. Sort all distinct items strictly descending by score
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-breaker: sortOrder
    const ordA = a.product.sortOrder ?? a.product.sort_order ?? 999;
    const ordB = b.product.sortOrder ?? b.product.sort_order ?? 999;
    return ordA - ordB;
  });

  // 4. Return the top `limit` distinct products
  return scoredItems.slice(0, limit).map((s) => s.product);
}
