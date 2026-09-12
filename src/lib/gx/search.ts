/* ============================================================
   GX STORE — HIGH PERFORMANCE ARABIC & ENGLISH SEARCH ENGINE
   Provides robust text normalization, synonym expansion, multi-field
   weighted matching, and real-time database catalog indexing.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";

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

  // Fortnite
  فورتنايت: ["fortnite", "فورت نايت", "vbucks", "في بوكس", "كرو", "crew"],
  "فورت نايت": ["fortnite", "فورتنايت", "vbucks", "في بوكس"],
  fortnite: ["فورتنايت", "فورت نايت", "vbucks", "v bucks", "في بوكس"],
  vbucks: ["fortnite", "فورت نايت", "في بوكس"],
  "في بوكس": ["vbucks", "fortnite", "فورت نايت"],

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
  سناب: ["snapchat", "سناب شات", "سناب بلس", "بلس", "plus"],
  "سناب شات": ["snapchat", "سناب", "سناب بلس"],
  "سناب بلس": ["snapchat", "snapchat plus", "سناب"],
  snapchat: ["سناب", "سناب شات", "سناب بلس"],
  snap: ["سناب", "snapchat"],

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
  كانفا: ["canva", "كانفا برو", "canva pro", "تصميم"],
  canva: ["كانفا", "canva pro", "برو"],

  // Windows & Microsoft
  ويندوز: ["windows", "ويندوز 11", "ويندوز 10", "مفتاح", "تفعيل", "كود"],
  windows: ["ويندوز", "windows 11", "windows 10", "key"],
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

/**
 * Searches a list of SearchableItems with high-precision ranking:
 * 1. Checks exact title match (highest score)
 * 2. Checks prefix / word-start match
 * 3. Checks multi-token query match across all fields
 * 4. Checks synonyms & transliterated aliases
 */
export function matchSearchQuery(
  items: SearchableItem[],
  rawQuery: string,
  lang: "ar" | "en" = "ar"
): SearchMatchResult[] {
  const cleanQ = normalizeSearchText(rawQuery);
  if (!cleanQ) return [];

  const queryTerms = cleanQ.split(" ").filter(Boolean);
  if (queryTerms.length === 0) return [];

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
      if (haystack.includes(term)) {
        score += 30;
      } else {
        // Check if any synonym of this term matches
        const syns = SYNONYM_MAP[term];
        const synMatch = syns && syns.some((s) => haystack.includes(normalizeSearchText(s)));
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
      if (haystack.includes(synTerm)) {
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

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

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
          .select("product_id, label_ar, label_en, tag_ar, tag_en, region")
          .eq("is_active", true),
        supabase
          .from("categories")
          .select("id, slug, name_ar, name_en, parent_id, icon, icon_image_url"),
      ]);

    if (pErr) {
      console.warn("Error fetching search products from Supabase:", pErr);
      return cachedSearchIndex || [];
    }

    // Group variants by product
    const variantsByProd = new Map<string, string[]>();
    if (variants) {
      for (const v of variants) {
        if (!variantsByProd.has(v.product_id)) {
          variantsByProd.set(v.product_id, []);
        }
        const list = variantsByProd.get(v.product_id)!;
        if (v.label_ar) list.push(v.label_ar);
        if (v.label_en) list.push(v.label_en);
        if (v.tag_ar) list.push(v.tag_ar);
        if (v.tag_en) list.push(v.tag_en);
        if (v.region) list.push(v.region);
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
          deliveryType: p.delivery_type,
          badge: p.badge,
          priceJod: p.base_price_jod,
          imageUrl: p.image_url,
          icon: p.icon,
          iconImage: p.icon_image_url || p.image_url,
          thumbBg: p.thumb_bg || p.card_gradient,
          variantLabels: variantsByProd.get(p.id) || [],
          link: `/product/${p.slug}`,
        };

        item.normalizedHaystack = buildSearchHaystack(item);
        items.push(item);
      }
    }

    // 2. Add Top Categories as Searchable Items
    if (categories) {
      for (const c of categories) {
        // Only include primary/meaningful categories
        const item: SearchableItem = {
          id: `cat-${c.id}`,
          slug: c.slug,
          type: "category",
          nameAr: c.name_ar,
          nameEn: c.name_en || c.name_ar,
          categoryNameAr: "قسم",
          categoryNameEn: "Category",
          categorySlug: c.slug,
          icon: c.icon || "📁",
          iconImage: c.icon_image_url,
          link: `/category/${c.slug}`,
        };
        item.normalizedHaystack = buildSearchHaystack(item);
        items.push(item);
      }
    }

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
