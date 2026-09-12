/* ============================================================
   GX STORE — CATALOG READ LAYER (database-backed)
   Public, read-only server functions that expose products,
   variants, features and categories from Supabase.
   Prices come from `product_variants.price_jod`, with the admin
   live overrides (`site_settings.catalog_prices`) applied on top,
   keyed by the variant's stable `cart_id`.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { getPublicClient } from "@/lib/gx/supabase-request";

export type CatalogVariant = {
  cartId: string;
  labelAr: string;
  labelEn: string;
  price: number;
  oldPrice: number | null;
  tagAr: string | null;
  tagEn: string | null;
  planGroup: string | null;
  /** "ar|en|flag" as stored on gift-card variants. */
  region: string | null;
  deliveryType: string | null;
};

export type DeliveryBlockCopy = {
  intro?: string;
  requirements?: string[];
  safety?: string[];
  platformNotes?: string[];
};

export type DeliveryDetails = { ar?: DeliveryBlockCopy; en?: DeliveryBlockCopy };

export type CatalogFeature = {
  icon: string | null;
  titleAr: string;
  titleEn: string;
  descAr: string | null;
  descEn: string | null;
};

export type CatalogProduct = {
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string | null;
  taglineEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  iconImage: string | null;
  imageUrl: string | null;
  thumbBg: string | null;
  accentColor: string | null;
  cardGradient: string | null;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  identifierLabelAr: string | null;
  identifierLabelEn: string | null;
  identifierPlaceholder: string | null;
  requiresPlayerId?: boolean | null;
  deliveryMethodAr: string | null;
  deliveryMethodEn: string | null;
  deliveryDetails: DeliveryDetails | null;
  deliveryInstructionsAr?: string | null;
  importantNotes?: string[] | null;
  pageTemplate: string;
  deliveryType: string;
  region: string | null;
  basePriceJod: number | null;
  oldPriceJod?: number | null;
  variants: CatalogVariant[];
  features: CatalogFeature[];
};

export type CatalogCategoryChild = {
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  iconImage: string | null;
  bg: string | null;
  /** Product slug to link to, when this sub-category has a live product. */
  productSlug: string | null;
};

export type CatalogCategoryProductItem = {
  id: string;
  slug: string;
  cartId?: string;
  nameAr: string;
  nameEn: string;
  taglineAr?: string | null;
  taglineEn?: string | null;
  imageUrl: string | null;
  icon: string | null;
  iconImage: string | null;
  thumbBg: string | null;
  basePriceJod: number | null;
  badge: string | null;
};

export type CatalogCategory = {
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string | null;
  taglineEn: string | null;
  icon: string | null;
  iconImage: string | null;
  children: CatalogCategoryChild[];
  products: CatalogCategoryProductItem[];
  parent?: {
    slug: string;
    nameAr: string;
    nameEn: string;
  } | null;
  siblings?: CatalogCategoryChild[];
};

type Overrides = Record<string, { price?: number; oldPrice?: number | null }>;

type CacheEntry<T> = { data: T; expiresAt: number };
const productCache = new Map<string, CacheEntry<CatalogProduct | null>>();
const categoryCache = new Map<string, CacheEntry<CatalogCategory | null>>();
let overridesCache: CacheEntry<Overrides> = { data: {}, expiresAt: 0 };
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes server-side cache to absorb traffic and prevent database egress

/** Invalidate server catalog cache (e.g. on admin catalog updates) */
export function invalidateCatalogCache(slug?: string) {
  if (slug) {
    productCache.delete(slug);
    categoryCache.delete(slug);
  } else {
    productCache.clear();
    categoryCache.clear();
  }
  overridesCache = { data: {}, expiresAt: 0 };
}

export const purgeCatalogCacheFn = createServerFn({ method: "POST" })
  .inputValidator((data?: { slug?: string }) => ({ slug: data?.slug ? String(data.slug) : undefined }))
  .handler(async ({ data }) => {
    invalidateCatalogCache(data?.slug);
    return { ok: true };
  });

async function loadOverrides(supabase: ReturnType<typeof getPublicClient>): Promise<Overrides> {
  const now = Date.now();
  if (now < overridesCache.expiresAt) {
    return overridesCache.data;
  }
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "catalog_prices")
    .maybeSingle();
  if (error) {
    console.error("loadOverrides: failed to read catalog_prices", error);
    return overridesCache.data || {};
  }
  const v = (data as { value?: unknown } | null)?.value;
  const res = v && typeof v === "object" && !Array.isArray(v) ? (v as Overrides) : {};
  overridesCache = { data: res, expiresAt: now + CACHE_TTL_MS };
  return res;
}

export const getCatalogProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; bypassCache?: boolean }) => ({
    slug: String(data.slug),
    bypassCache: Boolean(data.bypassCache),
  }))
  .handler(async ({ data }): Promise<CatalogProduct | null> => {
    const now = Date.now();
    if (!data.bypassCache) {
      const cached = productCache.get(data.slug);
      if (cached && now < cached.expiresAt) {
        return cached.data;
      }
    }

    const supabase = getPublicClient();
    const { data: row } = await supabase
      .from("products")
      .select(
        "id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, base_price_jod, image_url, icon, icon_image_url, thumb_bg, accent_color, card_gradient, identifier_label_ar, identifier_label_en, identifier_placeholder, requires_player_id, delivery_method_ar, delivery_method_en, delivery_details, delivery_instructions_ar, delivery_instructions_en, page_template, delivery_type, region, is_active, categories:category_id (name_ar, name_en)",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) {
      productCache.set(data.slug, { data: null, expiresAt: now + 5_000 }); // Cache missing for 5s to stop 404 spam
      return null;
    }

    const p = row as Record<string, any>;
    const rawBasePrice = p.base_price_jod != null ? Number(p.base_price_jod) : null;
    const rawOldPrice = rawBasePrice != null && rawBasePrice > 0 ? Number((rawBasePrice * 1.25).toFixed(2)) : null;

    const [{ data: variants }, { data: features }, overrides] = await Promise.all([
      supabase
        .from("product_variants")
        .select(
          "cart_id, label_ar, label_en, price_jod, old_price_jod, tag_ar, tag_en, plan_group, region, delivery_type, sort_order",
        )
        .eq("product_id", p.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_features")
        .select("icon, title_ar, title_en, desc_ar, desc_en, sort_order")
        .eq("product_id", p.id)
        .order("sort_order", { ascending: true }),
      loadOverrides(supabase),
    ]);

    const cat = (p.categories ?? null) as { name_ar?: string; name_en?: string } | null;

    const resolvedVariants: CatalogVariant[] =
      variants && variants.length > 0
        ? variants.map((v: Record<string, any>) => {
          const o = v.cart_id ? overrides[v.cart_id] : undefined;
          const price =
            typeof o?.price === "number" && o.price >= 0 ? o.price : Number(v.price_jod) || 0;
          const rawOld = o && "oldPrice" in o ? o.oldPrice : v.old_price_jod;
          return {
            cartId: v.cart_id ?? "",
            labelAr: v.label_ar,
            labelEn: v.label_en || v.label_ar,
            price,
            oldPrice: typeof rawOld === "number" && rawOld > 0 ? Number(rawOld) : null,
            tagAr: v.tag_ar ?? null,
            tagEn: v.tag_en ?? v.tag_ar ?? null,
            planGroup: v.plan_group ?? null,
            region: v.region ?? null,
            deliveryType: v.delivery_type ?? null,
          };
        })
        : rawBasePrice != null && rawBasePrice > 0
          ? [
            {
              cartId: p.slug,
              labelAr: p.name_ar,
              labelEn: p.name_en || p.name_ar,
              price: rawBasePrice,
              oldPrice:
                rawOldPrice != null && rawOldPrice > 0
                  ? rawOldPrice
                  : Number((rawBasePrice * 1.25).toFixed(2)),
              tagAr: null,
              tagEn: null,
              planGroup: null,
              region: p.region ?? "GLOBAL",
              deliveryType: p.delivery_type ?? "code",
            },
          ]
          : [];

    const product: CatalogProduct = {
      slug: p.slug,
      nameAr: p.name_ar,
      nameEn: p.name_en || p.name_ar,
      taglineAr: p.tagline_ar ?? null,
      taglineEn: p.tagline_en ?? null,
      descriptionAr: p.description_ar ?? null,
      descriptionEn: p.description_en ?? null,
      basePriceJod: rawBasePrice,
      oldPriceJod: rawOldPrice,
      icon: p.icon ?? null,
      iconImage: p.icon_image_url ?? p.image_url ?? null,
      imageUrl: p.image_url ?? p.icon_image_url ?? null,
      thumbBg: p.thumb_bg ?? null,
      accentColor: p.accent_color ?? null,
      cardGradient: p.card_gradient ?? null,
      categoryNameAr: cat?.name_ar ?? null,
      categoryNameEn: cat?.name_en ?? cat?.name_ar ?? null,
      identifierLabelAr: p.identifier_label_ar ?? null,
      identifierLabelEn: p.identifier_label_en ?? null,
      identifierPlaceholder: p.identifier_placeholder ?? null,
      requiresPlayerId: Boolean(p.requires_player_id),
      deliveryMethodAr: p.delivery_method_ar ?? null,
      deliveryMethodEn: p.delivery_method_en ?? null,
      deliveryDetails:
        p.delivery_details && typeof p.delivery_details === "object" && !Array.isArray(p.delivery_details)
          ? (p.delivery_details as DeliveryDetails)
          : null,
      deliveryInstructionsAr: p.delivery_instructions_ar ?? null,
      importantNotes: (() => {
        if (p.delivery_details && typeof p.delivery_details === "object" && Array.isArray((p.delivery_details as any).important_notes)) {
          return (p.delivery_details as any).important_notes;
        }
        if (p.delivery_instructions_en) {
          try {
            const parsed = JSON.parse(p.delivery_instructions_en);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch {
            const lines = p.delivery_instructions_en.split("\n").map((l: string) => l.trim()).filter(Boolean);
            if (lines.length > 0) return lines;
          }
        }
        return null;
      })(),
      pageTemplate: p.page_template ?? "standard",
      deliveryType: p.delivery_type ?? "manual",
      region: p.region ?? null,
      variants: resolvedVariants,
      features: (features ?? []).map((f: Record<string, any>) => ({
        icon: f.icon ?? null,
        titleAr: f.title_ar,
        titleEn: f.title_en || f.title_ar,
        descAr: f.desc_ar ?? null,
        descEn: f.desc_en ?? f.desc_ar ?? null,
      })),
    };

    productCache.set(data.slug, { data: product, expiresAt: now + CACHE_TTL_MS });
    return product;
  });

export const getCatalogCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<CatalogCategory | null> => {
    const now = Date.now();
    // Cache reset for updated category metadata
    const cached = categoryCache.get(data.slug);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    const supabase = getPublicClient();
    const { data: row } = await supabase
      .from("categories")
      .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, icon, icon_url, parent_id, is_active")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) {
      categoryCache.set(data.slug, { data: null, expiresAt: now + 5_000 });
      return null;
    }
    const c = row as Record<string, any>;

    const [{ data: kids }, { data: prods }, { data: parentRow }, { data: sibRows }] = await Promise.all([
      supabase
        .from("categories")
        .select("id, slug, name_ar, name_en, icon, icon_url, theme_gradient, sort_order")
        .eq("parent_id", c.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, image_url, icon, icon_image_url, thumb_bg, base_price_jod, badge, is_active, sort_order")
        .eq("category_id", c.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      c.parent_id
        ? supabase
          .from("categories")
          .select("slug, name_ar, name_en")
          .eq("id", c.parent_id)
          .maybeSingle()
        : Promise.resolve({ data: null }),
      c.parent_id
        ? supabase
          .from("categories")
          .select("id, slug, name_ar, name_en, icon, icon_url, theme_gradient, sort_order")
          .eq("parent_id", c.parent_id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const kidIds = (kids ?? []).map((k: Record<string, any>) => k.id);
    const { data: subProds } = kidIds.length
      ? await supabase
        .from("products")
        .select("slug, category_id, icon, icon_image_url, thumb_bg, is_active")
        .in("category_id", kidIds)
        .eq("is_active", true)
      : { data: [] as Record<string, any>[] };

    const byCat = new Map<string, Record<string, any>>();
    for (const p of (subProds ?? []) as Record<string, any>[]) {
      if (!byCat.has(p.category_id)) byCat.set(p.category_id, p);
    }

    const pRow = parentRow as Record<string, any> | null;
    const category: CatalogCategory = {
      slug: c.slug,
      nameAr: c.name_ar,
      nameEn: c.name_en || c.name_ar,
      taglineAr: c.tagline_ar ?? null,
      taglineEn: c.tagline_en ?? null,
      icon: c.icon ?? null,
      iconImage: c.icon_url ?? null,
      parent: pRow
        ? {
          slug: pRow.slug,
          nameAr: pRow.name_ar,
          nameEn: pRow.name_en || pRow.name_ar,
        }
        : null,
      siblings: (sibRows ?? []).map((s: Record<string, any>) => ({
        slug: s.slug,
        nameAr: s.name_ar,
        nameEn: s.name_en || s.name_ar,
        icon: s.icon ?? null,
        iconImage: s.icon_url ?? null,
        bg: s.theme_gradient ?? null,
        productSlug: null,
      })),
      children: (kids ?? []).map((k: Record<string, any>) => {
        const prod = byCat.get(k.id);
        return {
          slug: k.slug,
          nameAr: k.name_ar,
          nameEn: k.name_en || k.name_ar,
          icon: k.icon ?? prod?.icon ?? null,
          iconImage: k.icon_url ?? prod?.icon_image_url ?? null,
          bg: k.theme_gradient ?? prod?.thumb_bg ?? null,
          productSlug: prod?.slug ?? null,
        };
      }),
      products: (prods ?? []).map((p: Record<string, any>) => ({
        id: p.id,
        slug: p.slug,
        cartId: p.slug,
        nameAr: p.name_ar,
        nameEn: p.name_en || p.name_ar,
        taglineAr: p.tagline_ar ?? p.description_ar ?? null,
        taglineEn: p.tagline_en ?? p.description_en ?? null,
        imageUrl: p.image_url ?? p.icon_image_url ?? null,
        icon: p.icon ?? "🎮",
        iconImage: p.icon_image_url ?? p.image_url ?? null,
        thumbBg: p.thumb_bg ?? null,
        basePriceJod: Number(p.base_price_jod) || null,
        badge: p.badge ?? null,
      })),
    };

    categoryCache.set(data.slug, { data: category, expiresAt: now + CACHE_TTL_MS });
    return category;
  });

export type ProductDeliveryType = "key" | "account" | "activation" | "link" | "topup" | "giftcard" | "subscription";

export type CatalogStoreProduct = CatalogCategoryProductItem & {
  categorySlug?: string | null;
  parentCategorySlug?: string | null;
  categoryNameAr?: string | null;
  categoryNameEn?: string | null;
  oldPriceJod?: number | null;
  snapDuration?: string | null;
  region?: string | null;
  planGroup?: string | null;
  platform?: string | null;
  productType?: ProductDeliveryType | null;
  isGiftCardMaster?: boolean;
  viewOfferLink?: string | null;
  createdAt?: string | null;
  sortOrder?: number | null;
};

function parseRegionInfo(regionStr?: string | null) {
  if (!regionStr) return { ar: "", en: "", flag: "" };
  const parts = regionStr.split("|").map((s) => s.trim());
  let ar = parts[0] || "";
  let en = parts[1] || parts[0] || "";
  let flag = parts[2] || "";

  if (ar.includes("أمريكا") || en.includes("USA") || en.includes("United States")) flag = flag || "🇺🇸";
  if (ar.includes("الإمارات") || en.includes("UAE") || en.includes("Emirates")) flag = flag || "🇦🇪";
  if (ar.includes("السعودية") || en.includes("KSA") || en.includes("Saudi")) flag = flag || "🇸🇦";
  if (ar.includes("تركيا") || en.includes("Turkey") || ar.includes("TRY") || en.includes("TRY")) flag = flag || "🇹🇷";
  if (ar.includes("بريطانيا") || en.includes("GB") || en.includes("UK")) flag = flag || "🇬🇧";

  let cleanAr = ar;
  if (ar.includes("أمريكا")) cleanAr = "أمريكي";
  else if (ar.includes("الإمارات")) cleanAr = "إماراتي";
  else if (ar.includes("السعودية")) cleanAr = "سعودي";
  else if (ar.includes("تركيا")) cleanAr = "تركي";
  else if (ar.includes("بريطانيا") || ar.includes("GB")) cleanAr = "بريطاني";

  let cleanEn = en;
  if (en.includes("USA") || en.includes("United States")) cleanEn = "USA";
  else if (en.includes("UAE") || en.includes("Emirates")) cleanEn = "UAE";
  else if (en.includes("Saudi") || en.includes("KSA")) cleanEn = "KSA";
  else if (en.includes("Turkey")) cleanEn = "Turkey";
  else if (en.includes("GB") || en.includes("UK") || en.includes("بريطانيا")) cleanEn = "UK";

  return { ar: cleanAr, en: cleanEn, flag };
}

export const getAllCatalogProducts = createServerFn({ method: "GET" })
  .handler(async (): Promise<CatalogStoreProduct[]> => {
    const supabase = getPublicClient();
    const overrides = await loadOverrides(supabase);

    const [{ data: rows }, { data: allVariants }, { data: allCategories }] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en,
          image_url, icon, icon_image_url, thumb_bg, card_gradient, accent_color, base_price_jod, badge, is_active, sort_order, created_at,
          platform, delivery_type,
          categories:category_id (id, slug, name_ar, name_en, parent_id)
        `)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_variants")
        .select("id, product_id, cart_id, label_ar, label_en, price_jod, old_price_jod, tag_ar, tag_en, region, plan_group, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("categories")
        .select("id, slug, name_ar, name_en, parent_id"),
    ]);

    const catById = new Map<string, { id: string; slug: string; name_ar: string; name_en: string; parent_id: string | null }>();
    for (const c of (allCategories ?? []) as any[]) {
      catById.set(c.id, c);
    }

    const variantsByProd = new Map<string, Record<string, any>[]>();
    for (const v of (allVariants ?? []) as Record<string, any>[]) {
      if (!variantsByProd.has(v.product_id)) variantsByProd.set(v.product_id, []);
      variantsByProd.get(v.product_id)!.push(v);
    }

    const items: CatalogStoreProduct[] = [];

    for (const p of (rows ?? []) as Record<string, any>[]) {
      const cat = p.categories as { id?: string; slug?: string; name_ar?: string; name_en?: string; parent_id?: string | null } | null;
      const parentCat = cat?.parent_id ? catById.get(cat.parent_id) : null;
      const rootCategorySlug = parentCat?.slug || cat?.slug || null;
      const categorySlug = cat?.slug || null;
      const categoryNameAr = parentCat?.name_ar || cat?.name_ar || null;
      const categoryNameEn = parentCat?.name_en || cat?.name_en || null;

      const vars = variantsByProd.get(p.id) ?? [];
      const isGiftCardProduct =
        ["playstation", "xbox", "itunes", "google-play"].includes(p.slug) ||
        rootCategorySlug === "gift-cards";

      // 1. SMART GIFT CARDS CONSOLIDATION
      // Show one master card per gift card brand (PlayStation, Xbox, iTunes, Google Play)
      // with starting price ("يبدأ من") and link to the dedicated selector page (/product/[slug])
      if (isGiftCardProduct && vars.length > 0) {
        let minPrice = Infinity;
        for (const v of vars) {
          const o = v.cart_id ? overrides[v.cart_id] : undefined;
          const pVal = typeof o?.price === "number" && o.price >= 0 ? o.price : Number(v.price_jod) || 0;
          if (pVal > 0 && pVal < minPrice) minPrice = pVal;
        }
        if (minPrice === Infinity) minPrice = Number(p.base_price_jod) || 5;

        let nameAr = p.name_ar;
        let nameEn = p.name_en || p.name_ar;
        let taglineAr = p.tagline_ar ?? "رصيد رقمي معتمد للألعاب والتطبيقات بتسليم فوري للأكواد";
        let taglineEn = p.tagline_en ?? "Official digital store credit with instant code delivery";
        let thumbBg = p.thumb_bg ?? p.card_gradient ?? null;
        let iconImage = p.icon_image_url ?? p.image_url ?? null;
        let platform = p.platform || "Gift Cards";
        let badge = "كود تفعيل";
        let subCatSlug = categorySlug || "gift-cards";

        if (p.slug === "playstation") {
          nameAr = "بطاقات بلايستيشن (PSN)";
          nameEn = "PlayStation PSN Cards";
          taglineAr = "رصيد المتجر لحسابات البلايستيشن السعودية، الأمريكية، والبريطانية";
          taglineEn = "Store credit for Saudi, US, and UK PSN accounts";
          platform = "PlayStation";
          subCatSlug = "gc-playstation";
          iconImage = "/app/assets/img/playstation-logo.svg";
          thumbBg = "linear-gradient(135deg, rgba(0, 112, 209, 0.22), rgba(0, 60, 150, 0.12))";
          minPrice = 7.0;
        } else if (p.slug === "xbox") {
          nameAr = "بطاقات إكسبوكس";
          nameEn = "Xbox Gift Cards";
          taglineAr = "شحن رصيد حسابات متجر إكسبوكس لجميع المناطق لشراء الألعاب والإضافات";
          taglineEn = "Xbox store wallet balance for games and add-ons";
          platform = "Xbox";
          subCatSlug = "gc-xbox";
          iconImage = "/app/assets/img/xbox-logo.svg";
          thumbBg = "linear-gradient(135deg, rgba(16, 124, 65, 0.22), rgba(10, 80, 40, 0.12))";
          minPrice = 1.15;
        } else if (p.slug === "itunes") {
          nameAr = "بطاقات آبل وآيتونز";
          nameEn = "iTunes & Apple Gift Cards";
          taglineAr = "شحن رصيد Apple ID لشراء التطبيقات والألعاب والاشتراكات";
          taglineEn = "Apple ID balance for apps, games, and iCloud storage";
          platform = "Apple";
          subCatSlug = "gc-itunes";
          iconImage = "/app/assets/img/itunes-logo.svg";
          thumbBg = "linear-gradient(135deg, rgba(241, 7, 163, 0.22), rgba(123, 47, 247, 0.12))";
          minPrice = 2.22;
        } else if (p.slug === "google-play") {
          nameAr = "بطاقات جوجل بلاي";
          nameEn = "Google Play Cards";
          taglineAr = "شحن رصيد متجر Play للأندرويد لشراء الألعاب والخدمات";
          taglineEn = "Play Store digital balance for Android in-app purchases";
          platform = "Google Play";
          subCatSlug = "gc-google-play";
          iconImage = "/app/assets/img/googleplay-logo.png";
          thumbBg = "linear-gradient(135deg, rgba(52, 168, 83, 0.22), rgba(26, 115, 232, 0.12))";
          minPrice = 4.5;
        }

        items.push({
          id: p.id,
          slug: p.slug,
          cartId: p.slug,
          nameAr,
          nameEn,
          taglineAr,
          taglineEn,
          imageUrl: p.image_url ?? p.icon_image_url ?? null,
          icon: p.icon ?? "🎁",
          iconImage,
          thumbBg,
          basePriceJod: minPrice,
          oldPriceJod: null,
          badge,
          categorySlug: subCatSlug,
          parentCategorySlug: "gift-cards",
          categoryNameAr: parentCat?.name_ar || cat?.name_ar || "بطاقات الهدايا",
          categoryNameEn: parentCat?.name_en || cat?.name_en || "Gift Cards",
          platform,
          productType: "giftcard",
          region: "Global",
          isGiftCardMaster: true,
          viewOfferLink: `/product/${p.slug}`,
          createdAt: p.created_at || null,
          sortOrder: p.sort_order ?? 9999,
        });
        continue;
      }

      // 2. Standalone products with no variants
      if (vars.length === 0) {
        const platform = p.platform || (rootCategorySlug === "games" ? "Steam" : "GX Store");
        items.push({
          id: p.id,
          slug: p.slug,
          cartId: p.slug,
          nameAr: p.name_ar,
          nameEn: p.name_en || p.name_ar,
          taglineAr: p.tagline_ar ?? p.description_ar ?? null,
          taglineEn: p.tagline_en ?? p.description_en ?? null,
          imageUrl: p.image_url ?? p.icon_image_url ?? null,
          icon: p.icon ?? "🎮",
          iconImage: p.icon_image_url ?? p.image_url ?? null,
          thumbBg: p.thumb_bg ?? p.card_gradient ?? null,
          basePriceJod: Number(p.base_price_jod) || null,
          oldPriceJod: null,
          badge: p.badge ?? null,
          categorySlug,
          parentCategorySlug: rootCategorySlug,
          categoryNameAr,
          categoryNameEn,
          platform,
          productType: (p.delivery_type as ProductDeliveryType) || "key",
          region: p.region || "Global",
          createdAt: p.created_at || null,
          sortOrder: p.sort_order ?? 9999,
        });
        continue;
      }

      // 3. PRODUCTS WITH INDIVIDUAL EDITIONS/VARIANTS
      // (Windows Pro OEM/Account, Fortnite Crew/V-Bucks, Snapchat, Microsoft 365, Adobe, etc.)
      for (const v of vars) {
        const o = v.cart_id ? overrides[v.cart_id] : undefined;
        const price = typeof o?.price === "number" && o.price >= 0 ? o.price : Number(v.price_jod) || 0;
        const rawOld = o && "oldPrice" in o ? o.oldPrice : v.old_price_jod;
        const oldPrice = typeof rawOld === "number" && rawOld > 0 ? Number(rawOld) : null;

        let nameAr = p.name_ar;
        let nameEn = p.name_en || p.name_ar;
        let taglineAr = p.tagline_ar ?? p.description_ar ?? null;
        let taglineEn = p.tagline_en ?? p.description_en ?? null;
        let badge = v.tag_ar ?? p.badge ?? null;
        let snapDuration: string | null = null;
        let thumbBg = p.thumb_bg ?? p.card_gradient ?? null;
        let iconImage = p.icon_image_url ?? p.image_url ?? null;
        let platform = p.platform || "GX Store";
        let productType: ProductDeliveryType = "activation";

        if (p.slug === "windows") {
          platform = "Microsoft";
          const cid = (v.cart_id || "").toLowerCase();
          if (cid === "win-pro-oem") {
            nameAr = "Windows 10/11 Pro — OEM";
            nameEn = "Windows 10/11 Pro — OEM";
            taglineAr = "تفعيل رسمي أصلي يرتبط بالمذربورد مدى الحياة";
            taglineEn = "Official OEM license tied to motherboard";
            badge = v.tag_ar || "OEM • مذربورد";
            productType = "key";
          } else if (cid === "win-pro-acct") {
            nameAr = "Windows 10/11 Pro — Account";
            nameEn = "Windows 10/11 Pro — Account";
            taglineAr = "تفعيل رسمي أصلي يرتبط بحساب مايكروسوفت الخاص بك";
            taglineEn = "Official license linked to Microsoft account";
            badge = v.tag_ar || "Account • حساب";
            productType = "account";
          } else if (cid === "win-home-oem") {
            nameAr = "Windows 10/11 Home — OEM";
            nameEn = "Windows 10/11 Home — OEM";
            taglineAr = "تفعيل أصلي لنسخة هوم يرتبط بالمذربورد";
            taglineEn = "Official Home OEM license tied to motherboard";
            badge = v.tag_ar || "Home OEM";
            productType = "key";
          } else if (cid === "win-home-acct") {
            nameAr = "Windows 10/11 Home — Account";
            nameEn = "Windows 10/11 Home — Account";
            taglineAr = "تفعيل أصلي لنسخة هوم يرتبط بحساب مايكروسوفت";
            taglineEn = "Official Home license linked to Microsoft account";
            badge = v.tag_ar || "Home Account";
            productType = "account";
          } else {
            nameAr = `Windows — ${v.label_ar}`;
            nameEn = `Windows — ${v.label_en || v.label_ar}`;
            productType = "key";
          }
        } else if (p.slug === "snapchat") {
          platform = "Snapchat";
          productType = "topup";
          nameAr = `سناب بلس — ${v.label_ar}`;
          nameEn = `Snapchat+ — ${v.label_en || v.label_ar}`;
          taglineAr = "تفعيل رسمي عبر يوزر السناب بدون كلمة مرور";
          taglineEn = "Official gift delivery via username, no password";
          snapDuration = v.label_ar;
          badge = v.tag_ar || (v.cart_id === "snap-6" ? "الأكثر طلبًا" : null);
        } else if (p.slug === "fortnite") {
          platform = "Epic Games";
          const cid = (v.cart_id || "").toLowerCase();
          if (cid.startsWith("fn-crew")) {
            const dur = cid === "fn-crew-3" ? "3 أشهر" : "شهر واحد";
            const durEn = cid === "fn-crew-3" ? "3 Months" : "1 Month";
            nameAr = `Fortnite Crew — ${dur}`;
            nameEn = `Fortnite Crew — ${durEn}`;
            taglineAr = "يشمل 1000 V-Bucks + Battle Pass + طقم Crew الحصري";
            taglineEn = "Includes 1000 V-Bucks + Battle Pass + Crew Pack";
            badge = cid === "fn-crew-3" ? "👑 الأفضل قيمة" : "⭐ اشتراك شهر";
            productType = "subscription";
          } else if (cid.startsWith("fn-vb")) {
            nameAr = `فورت نايت — ${v.label_ar}`;
            nameEn = `Fortnite — ${v.label_en || v.label_ar}`;
            taglineAr = "شحن رصيد رسمي 100% على حساب Epic Games";
            taglineEn = "Official V-Bucks top-up to Epic Games account";
            badge = v.tag_ar || (cid === "fn-vb-2400" ? "الأكثر طلبًا" : null);
            productType = "topup";
          } else {
            nameAr = `فورت نايت — ${v.label_ar}`;
            nameEn = `Fortnite — ${v.label_en || v.label_ar}`;
            productType = "topup";
          }
        } else if (p.slug === "microsoft365") {
          platform = "Microsoft";
          nameAr = `Microsoft 365 — ${v.label_ar}`;
          nameEn = `Microsoft 365 — ${v.label_en || v.label_ar}`;
          taglineAr = "تطبيقات أوفيس كاملة مع مساحة سحابية 1TB";
          taglineEn = "Full Office apps suite with 1TB cloud storage";
          badge = v.tag_ar || "Microsoft";
          if (v.cart_id?.includes("acct")) productType = "account";
          else if (v.cart_id?.includes("key")) productType = "key";
          else productType = "subscription";
        } else if (p.slug === "adobe") {
          platform = "Adobe";
          productType = "activation";
          nameAr = `Adobe Creative Cloud — ${v.label_ar}`;
          nameEn = `Adobe Creative Cloud — ${v.label_en || v.label_ar}`;
          taglineAr = "فوتوشوب، إليستريتور، بريمير وجميع تطبيقات أدوبي";
          taglineEn = "Photoshop, Illustrator, Premiere and all Adobe apps";
          badge = v.tag_ar || (v.cart_id === "adobe-4" ? "الأكثر طلبًا" : null);
        } else if (p.slug === "canva") {
          platform = "Canva Pro";
          productType = "link";
          nameAr = `Canva Pro — ${v.label_ar}`;
          nameEn = `Canva Pro — ${v.label_en || v.label_ar}`;
        } else if (p.slug === "linkedin") {
          platform = "LinkedIn";
          productType = "activation";
          nameAr = `LinkedIn Premium — ${v.label_ar}`;
          nameEn = `LinkedIn Premium — ${v.label_en || v.label_ar}`;
        } else if (p.slug === "autodesk") {
          platform = "Autodesk";
          productType = "activation";
          nameAr = `Autodesk All Apps — ${v.label_ar}`;
          nameEn = `Autodesk All Apps — ${v.label_en || v.label_ar}`;
        } else if (p.slug === "gemini") {
          platform = "Google AI";
          productType = "activation";
          nameAr = `Gemini Pro — ${v.label_ar}`;
          nameEn = `Gemini Pro — ${v.label_en || v.label_ar}`;
        } else if (p.slug === "fc-27") {
          platform = "Steam";
          productType = "key";
          nameAr = "EA Sports FC 27";
          nameEn = "EA Sports FC 27";
        } else if (p.slug === "xbox-game-pass-ultimate") {
          platform = "Xbox / PC";
          productType = v.cart_id?.includes("acct") ? "account" : "topup";
          nameAr = `Game Pass Ultimate — ${v.label_ar}`;
          nameEn = `Game Pass Ultimate — ${v.label_en || v.label_ar}`;
          taglineAr = v.cart_id?.includes("acct") ? "حساب خاص بك مفعل بالكامل" : "شحن وتجديد مباشر على حسابك الشخصي";
          taglineEn = v.cart_id?.includes("acct") ? "Pre-activated private account" : "Direct account top-up";
          badge = v.tag_ar ?? (v.cart_id === "gpu-35m-topup" ? "الأكثر طلبًا" : null);
        } else if (p.slug === "pc-game-pass") {
          platform = "PC";
          productType = "topup";
          nameAr = `PC Game Pass — ${v.label_ar}`;
          nameEn = `PC Game Pass — ${v.label_en || v.label_ar}`;
          taglineAr = "شحن وتجديد مباشر على حساب مايكروسوفت";
          taglineEn = "Direct Microsoft account top-up";
          badge = v.tag_ar ?? (v.cart_id === "pcgp-3m-topup" ? "الأكثر طلبًا" : null);
        } else {
          platform = p.platform || "GX Store";
          const labelAr = v.label_ar || "";
          const labelEn = v.label_en || labelAr;
          // Strip pipe suffix from base name so variant duration isn't pushed out
          const cleanBaseAr = p.name_ar.includes("|") ? p.name_ar.split("|")[0].trim() : p.name_ar;
          const cleanBaseEn = (p.name_en || p.name_ar).includes("|") ? (p.name_en || p.name_ar).split("|")[0].trim() : (p.name_en || p.name_ar);

          if (labelAr && !labelAr.includes(cleanBaseAr)) {
            nameAr = `${cleanBaseAr} — ${labelAr}`;
            nameEn = `${cleanBaseEn} — ${labelEn}`;
          } else {
            nameAr = labelAr || cleanBaseAr;
            nameEn = labelEn || cleanBaseEn;
          }
          taglineAr = p.tagline_ar ?? p.description_ar ?? null;
          taglineEn = p.tagline_en ?? p.description_en ?? null;
          badge = v.tag_ar ?? p.badge ?? null;
          productType = (p.delivery_type as ProductDeliveryType) || "activation";
        }

        items.push({
          id: `${p.id}-${v.id}`,
          slug: p.slug,
          cartId: v.cart_id,
          nameAr,
          nameEn,
          taglineAr,
          taglineEn,
          imageUrl: p.image_url ?? p.icon_image_url ?? null,
          icon: p.icon ?? "🎮",
          iconImage,
          thumbBg,
          basePriceJod: price,
          oldPriceJod: oldPrice,
          badge,
          categorySlug,
          parentCategorySlug: rootCategorySlug,
          categoryNameAr,
          categoryNameEn,
          snapDuration,
          region: v.region || p.region || "Global",
          planGroup: v.plan_group ?? null,
          platform,
          productType,
          isGiftCardMaster: false,
          createdAt: p.created_at || null,
          sortOrder: v.sort_order ?? p.sort_order ?? 9999,
        });
      }
    }

    return items;
  });

