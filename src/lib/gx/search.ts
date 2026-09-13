/* ============================================================
   GX STORE — HIGH PERFORMANCE ARABIC & ENGLISH SEARCH ENGINE
   Provides robust text normalization, synonym expansion, multi-field
   weighted matching, and real-time database catalog indexing.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";
import { resolveStrictDeliveryType } from "@/lib/gx/delivery-types";
import { PRODUCTS_CATALOG } from "@/data/products";

export interface SearchableItem {
  id: string;
  slug: string;
  type: "product" | "category" | "gift_card";
  nameAr: string;
  nameEn: string;
  taglineAr?: string | null;
  taglineEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  categoryNameAr?: string | null;
  categoryNameEn?: string | null;
  categorySlug?: string | null;
  parentCategorySlug?: string | null;
  platform?: string | null;
  deliveryType?: string | null;
  badge?: string | null;
  priceJod?: number | null;
  oldPriceJod?: number | null;
  imageUrl?: string | null;
  icon?: string | null;
  iconImage?: string | null;
  thumbBg?: string | null;
  variantLabels?: string[];
  link: string;
  // Pre-computed normalized search haystacks
  normalizedHaystack?: string;
}

/**
 * Normalizes Arabic and English text for flawless search matching:
 * - Strips all Arabic diacritics / Tashkeel & Tatweel
 * - Normalizes Hamzas (أ, إ, آ, ٱ -> ا)
 * - Normalizes Yaa / Alif Maqsura (ى -> ي)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Waw with Hamza (ؤ -> و) and Yaa with Hamza (ئ -> ي)
 * - Replaces hyphens, underscores, slashes, and symbols with spaces
 * - Lowercases English text and strips excess whitespace
 */
export function normalizeSearchText(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    // Remove Arabic Tashkeel & Tatweel
    .replace(/[\u064B-\u0652\u0640]/g, "")
    // Normalize Alefs with Hamza / Madda
    .replace(/[أإآٱ]/g, "ا")
    // Normalize Alif Maqsura
    .replace(/ى/g, "ي")
    // Normalize Taa Marbuta
    .replace(/ة/g, "ه")
    // Normalize Waw / Yaa with Hamza
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // Replace punctuation & symbols with spaces
    .replace(/[-_.,/:;()!+*~&|#@\\]/g, " ")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common gaming & digital product aliases / synonyms:
 * Maps common queries, typos, and transliterations to related search terms.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Football / EA FC / FIFA
  فيفا: ["fc", "fifa", "ea fc", "fc 27", "fc 26", "fc 25", "كرة قدم"],
  fifa: ["فيفا", "fc", "ea sports", "كرة قدم"],
  fc: ["فيفا", "fifa", "ea fc", "ea sports"],

  // Fortnite & V-Bucks
  فورتنايت: ["fortnite", "فورت نايت"],
  "فورت نايت": ["fortnite", "فورتنايت"],
  fortnite: ["فورتنايت", "فورت نايت"],
  vbucks: ["v-bucks", "فيبوكس", "في بوكس", "fortnite"],
  "v-bucks": ["vbucks", "فيبوكس", "في بوكس", "fortnite"],
  "في بوكس": ["vbucks", "v-bucks", "فيبوكس", "fortnite"],
  فيبوكس: ["vbucks", "v-bucks", "في بوكس", "fortnite"],
  كرو: ["crew", "fortnite crew", "اشتراك كرو"],
  crew: ["كرو", "fortnite crew", "اشتراك كرو"],

  // PlayStation & Sony
  بلايستيشن: ["playstation", "بلاي ستيشن", "سوني", "sony", "psn", "ps5", "ps4", "بلستيشن"],
  "بلاي ستيشن": ["playstation", "بلايستيشن", "سوني", "sony", "psn", "ps5"],
  سوني: ["playstation", "بلايستيشن", "sony", "psn"],
  playstation: ["بلايستيشن", "بلاي ستيشن", "سوني", "psn", "ps5", "ps4"],
  psn: ["بلايستيشن", "playstation", "سوني"],
  ps5: ["بلايستيشن", "playstation"],
  ps4: ["بلايستيشن", "playstation"],

  // Xbox & Game Pass
  اكسبوكس: ["xbox", "اكس بوكس", "قيم باس", "جيم باس", "game pass", "ultimate", "التيمت"],
  "اكس بوكس": ["xbox", "اكسبوكس", "قيم باس", "جيم باس", "game pass"],
  xbox: ["اكسبوكس", "اكس بوكس", "game pass", "قيم باس", "جيم باس"],
  "قيم باس": ["game pass", "xbox", "اكسبوكس", "جيم باس"],
  "جيم باس": ["game pass", "xbox", "اكسبوكس", "قيم باس"],
  "game pass": ["قيم باس", "جيم باس", "xbox", "اكسبوكس"],

  // Steam & PC Games
  ستيم: ["steam", "بي سي", "pc", "العاب ستيم"],
  steam: ["ستيم", "pc", "بي سي"],
  "بي سي": ["pc", "steam", "ستيم", "كمبيوتر"],
  pc: ["بي سي", "steam", "ستيم"],

  // Snapchat
  سناب: ["snapchat", "سناب شات", "سناب بلس"],
  "سناب شات": ["snapchat", "سناب", "سناب بلس"],
  "سناب بلس": ["snapchat", "snapchat plus", "سناب", "سناب شات"],
  snapchat: ["سناب", "سناب شات", "سناب بلس"],
  snap: ["سناب", "snapchat"],

  // Social Media Followers & Likes
  متابعين: ["followers", "فولورز", "متابعين انستقرام", "متابعين فيسبوك", "متابعين تيك توك", "متابعين سناب"],
  followers: ["متابعين", "فولورز", "instagram followers", "facebook followers"],
  انستقرام: ["instagram", "انستا", "انستغرام"],
  انستا: ["instagram", "انستقرام", "انستغرام"],
  instagram: ["انستقرام", "انستا", "انستغرام"],
  فيسبوك: ["facebook", "فيس بوك"],
  facebook: ["فيسبوك", "فيس بوك"],
  تيكتوك: ["tiktok", "تيك توك"],
  "تيك توك": ["tiktok", "تيكتوك"],
  tiktok: ["تيك توك", "تيكتوك"],

  // Discord Nitro
  دسكورد: ["discord", "ديسكورد", "نيترو", "nitro"],
  ديسكورد: ["discord", "دسكورد", "نيترو", "nitro"],
  نيترو: ["nitro", "discord", "دسكورد", "ديسكورد"],
  discord: ["دسكورد", "ديسكورد", "نيترو", "nitro"],
  nitro: ["نيترو", "discord", "دسكورد"],

  // Adobe
  ادوبي: ["adobe", "أدوبي", "فوتوشوب", "photoshop", "creative cloud", "الستريتر", "تصميم"],
  أدوبي: ["adobe", "ادوبي", "فوتوشوب", "creative cloud"],
  adobe: ["ادوبي", "أدوبي", "creative cloud", "photoshop", "فوتوشوب"],
  فوتوشوب: ["photoshop", "adobe", "ادوبي"],

  // Canva
  كانفا: ["canva", "كانفا برو", "canva pro"],
  canva: ["كانفا", "canva pro"],

  // Windows & Microsoft
  ويندوز: ["windows", "ويندوز 11", "ويندوز 10", "windows 11", "windows 10", "win 10", "win 11", "win10", "win11"],
  windows: ["ويندوز", "windows 11", "windows 10", "win 10", "win 11", "win10", "win11"],
  مايكروسوفت: ["microsoft", "اوفيس", "office", "365", "microsoft 365"],
  اوفيس: ["office", "microsoft", "مايكروسوفت", "365"],
  microsoft: ["مايكروسوفت", "office", "اوفيس", "365"],
  office: ["اوفيس", "microsoft", "مايكروسوفت"],

  // GTA / Rockstar
  قراند: ["gta", "gta v", "grand theft auto", "روكستار", "rockstar"],
  "قراند 5": ["gta", "gta v", "gta 5"],
  gta: ["قراند", "قراند 5", "gta v", "rockstar"],

  // Minecraft
  ماينكرافت: ["minecraft", "ماين كرافت"],
  "ماين كرافت": ["minecraft", "ماينكرافت"],
  minecraft: ["ماينكرافت", "ماين كرافت"],

  // Google Play
  "جوجل بلاي": ["google play", "قوقل بلاي", "جوجل"],
  "قوقل بلاي": ["google play", "جوجل بلاي"],
  "google play": ["جوجل بلاي", "قوقل بلاي"],

  // Apple & iTunes
  ابل: ["apple", "itunes", "ايتونز", "آبل", "ايفون"],
  آبل: ["apple", "itunes", "ايتونز", "ابل"],
  ايتونز: ["itunes", "apple", "ابل", "آيتونز"],
  apple: ["ابل", "آبل", "itunes", "ايتونز"],
  itunes: ["ايتونز", "apple", "ابل", "آبل"],

  // General Categories
  اشتراك: ["subscriptions", "اشتراكات", "subscription"],
  اشتراكات: ["subscriptions", "اشتراك", "subscription"],
  العاب: ["games", "لعبة", "ألعاب", "game"],
  ألعاب: ["games", "العاب", "لعبة"],
  بطاقات: ["gift-cards", "بطاقة", "كروت", "شحن"],
  شحن: ["cards", "عملات", "شحن"],
};

/**
 * Builds the comprehensive search haystack for a product or category.
 */
export function buildSearchHaystack(item: SearchableItem): string {
  const parts: string[] = [
    item.nameAr,
    item.nameEn,
    item.slug,
    item.taglineAr || "",
    item.taglineEn || "",
    item.categoryNameAr || "",
    item.categoryNameEn || "",
    item.categorySlug || "",
    item.parentCategorySlug || "",
    item.platform || "",
    item.deliveryType || "",
    item.badge || "",
    ...(item.variantLabels || []),
  ];

  if (item.descriptionAr) parts.push(item.descriptionAr.slice(0, 300));
  if (item.descriptionEn) parts.push(item.descriptionEn.slice(0, 300));

  return normalizeSearchText(parts.join(" "));
}

export interface SearchMatchResult {
  item: SearchableItem;
  score: number;
}

function hasTermInHaystack(haystack: string, term: string, words: Set<string>): boolean {
  if (!term) return false;
  // For short terms (<= 3 chars, e.g. "كرو", "v", "win", "pc"), require standalone word match to avoid matching inside other words (e.g. "مايكروسوفت")
  if (term.length <= 3) {
    if (words.has(term)) return true;
    return (" " + haystack + " ").includes(" " + term + " ");
  }
  return haystack.includes(term);
}

/**
 * Searches a list of SearchableItems with high-precision ranking:
 * 1. Checks exact title match (highest score)
 * 2. Checks prefix / word-start match
 * 3. Checks multi-token query match across all fields
 * 4. Checks synonyms & transliterated aliases
 */
export function matchSearchQuery(
  items: SearchableItem[],
  query: string,
  lang: "ar" | "en" = "ar"
): SearchMatchResult[] {
  const cleanQ = normalizeSearchText(query);
  if (!cleanQ || cleanQ.length < 2) return [];

  const queryTerms = cleanQ.split(" ").filter((t) => t.length > 0);

  // Expand query with synonyms
  const expandedTerms = new Set<string>(queryTerms);
  for (const term of queryTerms) {
    const syns = SYNONYM_MAP[term];
    if (syns) {
      for (const s of syns) {
        normalizeSearchText(s)
          .split(" ")
          .forEach((t) => expandedTerms.add(t));
      }
    }
  }

  // Also check full phrase synonyms
  const fullPhraseSyns = SYNONYM_MAP[cleanQ];
  if (fullPhraseSyns) {
    for (const s of fullPhraseSyns) {
      normalizeSearchText(s)
        .split(" ")
        .forEach((t) => expandedTerms.add(t));
    }
  }

  const results: SearchMatchResult[] = [];

  for (const item of items) {
    const haystack = item.normalizedHaystack || buildSearchHaystack(item);
    const words = new Set<string>(haystack.split(/\s+/));
    const normNameAr = normalizeSearchText(item.nameAr);
    const normNameEn = normalizeSearchText(item.nameEn);
    const normSlug = normalizeSearchText(item.slug);

    let score = 0;

    // 1. Exact Match on name (Massive bonus)
    if (normNameAr === cleanQ || normNameEn === cleanQ || normSlug === cleanQ) {
      score += 500;
    }

    // 2. Starts with Query (Strong bonus)
    if (normNameAr.startsWith(cleanQ) || normNameEn.startsWith(cleanQ) || normSlug.startsWith(cleanQ)) {
      score += 250;
    }

    // 3. Name Contains full query phrase
    if (normNameAr.includes(cleanQ) || normNameEn.includes(cleanQ)) {
      score += 150;
    }

    // 4. Slug Contains full query phrase
    if (normSlug.includes(cleanQ)) {
      score += 100;
    }

    // 5. Check each term in original query
    let allOriginalTermsMatch = true;
    for (const term of queryTerms) {
      if (hasTermInHaystack(haystack, term, words)) {
        score += 30;
      } else {
        // Check if any synonym of this term matches
        const syns = SYNONYM_MAP[term];
        const synMatch = syns && syns.some((s) => hasTermInHaystack(haystack, normalizeSearchText(s), words));
        if (synMatch) {
          score += 20;
        } else {
          allOriginalTermsMatch = false;
        }
      }
    }

    // If all original terms matched somewhere, give substantial bonus
    if (allOriginalTermsMatch) {
      score += 80;
    }

    // 6. Check expanded synonyms
    for (const synTerm of expandedTerms) {
      if (hasTermInHaystack(haystack, synTerm, words)) {
        score += 10;
      }
    }

    // 7. Small bonus for active category matches
    if (item.categoryNameAr && normalizeSearchText(item.categoryNameAr).includes(cleanQ)) {
      score += 25;
    }
    if (item.categoryNameEn && normalizeSearchText(item.categoryNameEn).includes(cleanQ)) {
      score += 25;
    }

    // Only include if there is a real match
    if (score > 0 && (allOriginalTermsMatch || score >= 60)) {
      results.push({ item, score });
    }
  }

  // Sort descending by score; for variants of the same product with similar score, sort by price ascending
  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) <= 50 && a.item.slug === b.item.slug) {
      return (a.item.priceJod || 0) - (b.item.priceJod || 0);
    }
    return b.score - a.score;
  });

  // Relative quality filter: if best match has high-confidence score (>= 300), discard weak noise (< 35% of top score)
  if (results.length > 0 && results[0].score >= 300) {
    const minThreshold = results[0].score * 0.35;
    return results.filter((r) => r.score >= minThreshold);
  }

  return results;
}

/**
 * Cache for database searchable items to prevent redundant fetches.
 */
let cachedSearchIndex: SearchableItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute client cache

/**
 * Fetches and builds a unified search index directly from Supabase,
 * including all active products, categories, and variant details.
 */
export async function fetchLiveSearchIndex(): Promise<SearchableItem[]> {
  const now = Date.now();
  if (cachedSearchIndex && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSearchIndex;
  }

  try {
    const [{ data: products, error: pErr }, { data: variants }, { data: categories }] =
      await Promise.all([
        supabase
          .from("products")
          .select(`
            id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en,
            image_url, icon, icon_image_url, thumb_bg, card_gradient, accent_color, base_price_jod, badge, is_active, sort_order,
            platform, delivery_type,
            categories:category_id (id, slug, name_ar, name_en, parent_id)
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("id, product_id, price_jod, old_price_jod, label_ar, label_en, tag_ar, tag_en, region, cart_id, sort_order, delivery_type, plan_group")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("categories")
          .select("id, slug, name_ar, name_en, parent_id, icon, icon_url"),
      ]);

    if (pErr) {
      console.warn("Error fetching search products from Supabase:", pErr);
      return cachedSearchIndex || [];
    }

    // Group variants by product and resolve min price & old price
    const variantDataByProd = new Map<
      string,
      { labels: string[]; minPrice: number; oldPrice: number | null }
    >();
    const variantsByProd = new Map<string, any[]>();

    if (variants) {
      for (const v of variants) {
        if (!variantsByProd.has(v.product_id)) {
          variantsByProd.set(v.product_id, []);
        }
        variantsByProd.get(v.product_id)!.push(v);

        if (!variantDataByProd.has(v.product_id)) {
          variantDataByProd.set(v.product_id, {
            labels: [],
            minPrice: Infinity,
            oldPrice: null,
          });
        }
        const entry = variantDataByProd.get(v.product_id)!;
        if (v.label_ar) entry.labels.push(v.label_ar);
        if (v.label_en) entry.labels.push(v.label_en);
        if (v.tag_ar) entry.labels.push(v.tag_ar);
        if (v.tag_en) entry.labels.push(v.tag_en);
        if (v.region) entry.labels.push(v.region);

        const pVal = Number(v.price_jod) || 0;
        if (pVal > 0 && pVal < entry.minPrice) {
          entry.minPrice = pVal;
          if (v.old_price_jod && Number(v.old_price_jod) > pVal) {
            entry.oldPrice = Number(v.old_price_jod);
          }
        }
      }
    }

    // Build category map
    const catById = new Map<string, any>();
    if (categories) {
      for (const c of categories) {
        catById.set(c.id, c);
      }
    }

    const items: SearchableItem[] = [];

    // 1. Add Products
    if (products) {
      for (const p of products) {
        const cat = p.categories as any;
        const parentCat = cat?.parent_id ? catById.get(cat.parent_id) : null;
        const rootCategorySlug = parentCat?.slug || cat?.slug || null;
        const categorySlug = cat?.slug || null;
        const categoryNameAr = parentCat?.name_ar || cat?.name_ar || null;
        const categoryNameEn = parentCat?.name_en || cat?.name_en || null;

        const isGiftCard =
          ["playstation", "xbox", "itunes", "google-play"].includes(p.slug) ||
          rootCategorySlug === "gift-cards";

        const prodVariants = variantsByProd.get(p.id) || [];

        // --- Special Case A: Fortnite (Only show specific purchasable packs, no vague generic item) ---
        if (p.slug === "fortnite") {
          const vbucksPacks = [
            {
              id: "fn-crew",
              amount: 0,
              nameAr: "فورت نايت — اشتراك كرو (شهر واحد)",
              nameEn: "Fortnite Crew — 1 Month",
              priceJod: 4,
              oldPriceJod: 6,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
              iconImage: "/app/assets/img/fortnite-crew-logo.png",
              badge: "يشمل 1000 V-Bucks",
            },
            {
              id: "fn-crew-3",
              amount: 0,
              nameAr: "فورت نايت — اشتراك كرو (3 أشهر)",
              nameEn: "Fortnite Crew — 3 Months",
              priceJod: 9,
              oldPriceJod: 12,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/FNECO_41-30_August_Crew_Lineup_EGS_Launcher_Blade_1200x1600_1200x1600-911e7061d0aa458aa67d4e5897fcb473",
              iconImage: "/app/assets/img/fortnite-crew-logo.png",
              badge: "👑 أفضل قيمة",
            },
            {
              id: "fn-vb-800",
              amount: 800,
              nameAr: "فورت نايت — 800 وحدة V-Bucks",
              nameEn: "Fortnite — 800 V-Bucks",
              priceJod: 5,
              oldPriceJod: 7,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_800_EGS_Portrait_1200x1600_1200x1600-79529d8c20514e82ae2ebce58991b912",
              iconImage: "/app/assets/img/vbucks.png",
              badge: null,
            },
            {
              id: "fn-vb-2400",
              amount: 2400,
              nameAr: "فورت نايت — 2400 وحدة V-Bucks",
              nameEn: "Fortnite — 2400 V-Bucks",
              priceJod: 12,
              oldPriceJod: 16,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_2400_EGS_Landscape_2560x1440_2560x1440-e51d802c9d414431973ae3e2ba60528d",
              iconImage: "/app/assets/img/vbucks.png",
              badge: "الأكثر طلباً",
            },
            {
              id: "fn-vb-4500",
              amount: 4500,
              nameAr: "فورت نايت — 4500 وحدة V-Bucks",
              nameEn: "Fortnite — 4500 V-Bucks",
              priceJod: 19,
              oldPriceJod: 25,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_4500_EGS_Landscape_2560x1440_2560x1440-799cfafb76bf4ae795fece5e4c0de4a3",
              iconImage: "/app/assets/img/vbucks.png",
              badge: null,
            },
            {
              id: "fn-vb-12500",
              amount: 12500,
              nameAr: "فورت نايت — 12500 وحدة V-Bucks",
              nameEn: "Fortnite — 12500 V-Bucks",
              priceJod: 38,
              oldPriceJod: 49,
              imageUrl: "https://cdn1.epicgames.com/offer/fn/EN_FNECO_41-00_RMT_CoreV-BucksPacks_12500_EGS_Portrait_1200x1600_1200x1600-070f17d0f6a34e9180b2927c8c24c40e",
              iconImage: "/app/assets/img/vbucks.png",
              badge: "💎 أفضل قيمة",
            },
          ];

          for (const pack of vbucksPacks) {
            const dbMatch = prodVariants.find((v: any) =>
              (pack.amount > 0 && (v.label_ar?.includes(String(pack.amount)) || v.label_en?.includes(String(pack.amount)))) ||
              (pack.id === "fn-crew" && v.label_ar?.includes("شهر") && !v.label_ar?.includes("3")) ||
              (pack.id === "fn-crew-3" && (v.label_ar?.includes("3") || v.label_en?.includes("3")))
            );
            const finalPrice = dbMatch?.price_jod ? Number(dbMatch.price_jod) : pack.priceJod;
            const finalOldPrice = dbMatch?.old_price_jod ? Number(dbMatch.old_price_jod) : pack.oldPriceJod;
            const finalBadge = dbMatch?.tag_ar && dbMatch.tag_ar !== "none" ? dbMatch.tag_ar : pack.badge;

            const packItem: SearchableItem = {
              id: `${p.id}-${pack.id}`,
              slug: "fortnite",
              type: "product",
              nameAr: pack.nameAr,
              nameEn: pack.nameEn,
              taglineAr: pack.amount > 0 ? `شحن ${pack.amount} فيبوكس فوري لحسابك` : "اشتراك كرو شهري مع باتل باس و1000 فيبوكس",
              taglineEn: pack.amount > 0 ? `Instant ${pack.amount} V-Bucks top-up` : "Fortnite Crew monthly subscription with Battle Pass",
              categoryNameAr: pack.amount > 0 ? "فورت نايت / V-Bucks" : "فورت نايت / كرو",
              categoryNameEn: pack.amount > 0 ? "Fortnite / V-Bucks" : "Fortnite / Crew",
              categorySlug: "fortnite",
              parentCategorySlug: "games",
              platform: "جميع المنصات (PC / Console)",
              deliveryType: "topup", // Strictly topup as requested
              badge: finalBadge,
              priceJod: finalPrice,
              oldPriceJod: finalOldPrice,
              imageUrl: pack.imageUrl,
              icon: "🪂",
              iconImage: pack.iconImage,
              thumbBg: pack.amount > 0 ? "linear-gradient(135deg,#0d2b45,#061524)" : "linear-gradient(135deg,#2e1065,#170736)",
              variantLabels: [
                "فورتنايت",
                "فورت نايت",
                "fortnite",
                "vbucks",
                "v-bucks",
                "في بوكس",
                "فيبوكس",
                pack.amount ? String(pack.amount) : "crew",
                pack.amount ? `${pack.amount} فيبوكس` : "كرو",
              ],
              link: `/product/fortnite#${pack.id}`,
            };
            packItem.normalizedHaystack = buildSearchHaystack(packItem);
            items.push(packItem);
          }
          continue; // Skip generic container
        }

        // --- Special Case B: Windows (All products are digital keys / activation codes) ---
        if (p.slug === "windows" && prodVariants.length > 0) {
          for (const v of prodVariants) {
            const variantItem: SearchableItem = {
              id: `${p.id}-${v.cart_id || v.id}`,
              slug: "windows",
              type: "product",
              nameAr: `تفعيل ويندوز — ${v.label_ar}`,
              nameEn: `Windows Activation — ${v.label_en || v.label_ar}`,
              taglineAr: "مفتاح تفعيل رقمي أصلي 100% مدى الحياة",
              taglineEn: "Official digital activation key 100% lifetime",
              categoryNameAr: categoryNameAr || "برامج وأنظمة",
              categoryNameEn: categoryNameEn || "Software",
              categorySlug,
              parentCategorySlug: rootCategorySlug,
              platform: "Microsoft Windows",
              deliveryType: "code", // Strictly key / code
              badge: v.tag_ar && v.tag_ar !== "none" ? v.tag_ar : null,
              priceJod: Number(v.price_jod),
              oldPriceJod: v.old_price_jod ? Number(v.old_price_jod) : null,
              imageUrl: p.image_url,
              icon: "🪟",
              iconImage: p.icon_image_url || p.image_url,
              thumbBg: p.thumb_bg || "linear-gradient(145deg,#0a2540,#04101c)",
              variantLabels: ["windows", "ويندوز", "تفعيل ويندوز", "مفتاح", "key", "pro", "home", v.label_ar, v.label_en || ""],
              link: `/product/windows#${v.cart_id || v.id}`,
            };
            variantItem.normalizedHaystack = buildSearchHaystack(variantItem);
            items.push(variantItem);
          }
          continue; // Skip generic container
        }

        // --- Special Case C: Multi-variant services (Snapchat+, Followers, etc.) ---
        if (prodVariants.length > 1 && !isGiftCard) {
          for (const v of prodVariants) {
            const strictDelivery = resolveStrictDeliveryType({
              slug: p.slug,
              cartId: v.cart_id,
              name: `${p.name_ar} ${v.label_ar}`,
              nameAr: `${p.name_ar} ${v.label_ar}`,
              productType: v.delivery_type || p.delivery_type,
            });

            const isSnap = p.slug === "snapchat";
            const variantNameAr = isSnap ? `سناب بلس — اشتراك ${v.label_ar}` : `${p.name_ar} — ${v.label_ar}`;
            const variantNameEn = isSnap ? `Snapchat+ — ${v.label_en || v.label_ar}` : `${p.name_en || p.name_ar} — ${v.label_en || v.label_ar}`;

            const variantItem: SearchableItem = {
              id: `${p.id}-${v.cart_id || v.id}`,
              slug: p.slug,
              type: "product",
              nameAr: variantNameAr,
              nameEn: variantNameEn,
              taglineAr: p.tagline_ar,
              taglineEn: p.tagline_en,
              descriptionAr: p.description_ar,
              descriptionEn: p.description_en,
              categoryNameAr,
              categoryNameEn,
              categorySlug,
              parentCategorySlug: rootCategorySlug,
              platform: p.platform,
              deliveryType: strictDelivery,
              badge: v.tag_ar && v.tag_ar !== "none" ? v.tag_ar : (isSnap && v.cart_id === "snap-6" ? "الأكثر طلباً" : null),
              priceJod: Number(v.price_jod),
              oldPriceJod: v.old_price_jod ? Number(v.old_price_jod) : null,
              imageUrl: p.image_url,
              icon: p.icon,
              iconImage: p.icon_image_url || p.image_url,
              thumbBg: p.thumb_bg || p.card_gradient,
              variantLabels: [p.name_ar, p.name_en || "", v.label_ar, v.label_en || ""],
              link: `/product/${p.slug}#${v.cart_id || v.id}`,
            };
            variantItem.normalizedHaystack = buildSearchHaystack(variantItem);
            items.push(variantItem);
          }
          continue; // Skip generic container
        }

        // --- Single-variant product or Gift Card master ---
        const vData = variantDataByProd.get(p.id);
        const resolvedPrice =
          vData && vData.minPrice !== Infinity
            ? vData.minPrice
            : typeof p.base_price_jod === "number"
            ? p.base_price_jod
            : null;
        const resolvedOldPrice = vData?.oldPrice ?? null;

        const item: SearchableItem = {
          id: p.id,
          slug: p.slug,
          type: isGiftCard ? "gift_card" : "product",
          nameAr: p.name_ar,
          nameEn: p.name_en || p.name_ar,
          taglineAr: p.tagline_ar,
          taglineEn: p.tagline_en,
          descriptionAr: p.description_ar,
          descriptionEn: p.description_en,
          categoryNameAr,
          categoryNameEn,
          categorySlug,
          parentCategorySlug: rootCategorySlug,
          platform: p.platform,
          deliveryType: resolveStrictDeliveryType({
            slug: p.slug,
            name: p.name_ar,
            nameAr: p.name_ar,
            productType: p.delivery_type,
            isGiftCardMaster: isGiftCard,
          }),
          badge: p.badge,
          priceJod: resolvedPrice,
          oldPriceJod: resolvedOldPrice,
          imageUrl: p.image_url,
          icon: p.icon,
          iconImage: p.icon_image_url || p.image_url,
          thumbBg: p.thumb_bg || p.card_gradient,
          variantLabels: vData?.labels || [],
          link: `/product/${p.slug}`,
        };

        item.normalizedHaystack = buildSearchHaystack(item);
        items.push(item);
      }
    }

    // Note: Categories are excluded from search index as requested by user (only products)

    cachedSearchIndex = items;
    lastFetchTime = now;
    return items;
  } catch (err) {
    console.error("Unexpected error in fetchLiveSearchIndex:", err);
    return cachedSearchIndex || [];
  }
}

/**
 * Invalidates the search cache so the next search pulls fresh products.
 */
export function invalidateSearchCache(): void {
  cachedSearchIndex = null;
  lastFetchTime = 0;
}

/* ============================================================
   RECENT & POPULAR SEARCHES HELPERS (Eneba / G2A Style)
   ============================================================ */

const RECENT_KEY = "gx_recent_searches";

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string): void {
  if (typeof window === "undefined" || !term || !term.trim()) return;
  try {
    const clean = term.trim();
    if (clean.length < 2) return;
    const existing = getRecentSearches().filter((s) => s.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...existing].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // noop
  }
}

export function removeRecentSearch(term: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const clean = term.trim().toLowerCase();
    const existing = getRecentSearches().filter((s) => s.toLowerCase() !== clean);
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // noop
  }
}

export interface PopularSearchTerm {
  labelAr: string;
  labelEn: string;
  query: string;
}

export const POPULAR_SEARCHES: PopularSearchTerm[] = [
  { labelAr: "ماينكرافت (Minecraft)", labelEn: "Minecraft", query: "minecraft" },
  { labelAr: "فورت نايت (Fortnite)", labelEn: "Fortnite", query: "fortnite" },
  { labelAr: "روبلوكس (Roblox)", labelEn: "Roblox", query: "roblox" },
  { labelAr: "اشتراك جيم باس (Xbox Game Pass)", labelEn: "Xbox Game Pass", query: "game pass" },
  { labelAr: "قراند 5 (GTA V)", labelEn: "GTA V", query: "gta" },
  { labelAr: "شحن روبوكس (Robux)", labelEn: "Robux", query: "robux" },
  { labelAr: "فيفا / EA Sports FC 25", labelEn: "EA Sports FC 25", query: "fc" },
  { labelAr: "كول اوف ديوتي (Call of Duty)", labelEn: "Call of Duty", query: "call of duty" },
  { labelAr: "إكسبوكس (Xbox)", labelEn: "Xbox", query: "xbox" },
  { labelAr: "سناب بلس (Snapchat+)", labelEn: "Snapchat+", query: "snapchat" },
  { labelAr: "بطاقات بلايستيشن (PlayStation)", labelEn: "PlayStation PSN", query: "playstation" },
];

/**
 * Extracts top search query suggestions based on product titles and categories.
 */
export function getQuerySuggestions(
  items: SearchableItem[],
  rawQuery: string,
  lang: "ar" | "en" = "ar",
  limit = 4
): string[] {
  const cleanQ = normalizeSearchText(rawQuery);
  if (cleanQ.length < 3) return [];

  const seen = new Set<string>();
  const suggestions: string[] = [];

  const trimmed = rawQuery.trim();
  if (trimmed.length >= 3) {
    seen.add(cleanQ);
    suggestions.push(trimmed);
  }

  for (const item of items) {
    const primaryName = lang === "en" ? item.nameEn : item.nameAr;
    const secondaryName = lang === "en" ? item.nameAr : item.nameEn;

    for (const name of [primaryName, secondaryName]) {
      if (!name) continue;
      const cleanName = normalizeSearchText(name);

      if (cleanName.includes(cleanQ)) {
        // Strip subtitle or platform suffix for clean suggestion
        const cleanPhrase = name
          .split(/[|:()]/)[0]
          .replace(/\s+/g, " ")
          .trim();

        const normPhrase = normalizeSearchText(cleanPhrase);
        if (cleanPhrase && !seen.has(normPhrase) && cleanPhrase.length >= 3) {
          seen.add(normPhrase);
          suggestions.push(cleanPhrase);
        }
      }

      if (suggestions.length >= limit) break;
    }

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

