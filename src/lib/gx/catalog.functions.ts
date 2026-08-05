/* ============================================================
   GX STORE — CATALOG READ LAYER (database-backed)
   Public, read-only server functions that expose products,
   variants, features and categories from Supabase.
   Prices come from `product_variants.price_jod`, with the admin
   live overrides (`site_settings.catalog_prices`) applied on top,
   keyed by the variant's stable `cart_id`.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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
  thumbBg: string | null;
  accentColor: string | null;
  cardGradient: string | null;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  identifierLabelAr: string | null;
  identifierLabelEn: string | null;
  identifierPlaceholder: string | null;
  deliveryMethodAr: string | null;
  deliveryMethodEn: string | null;
  deliveryDetails: DeliveryDetails | null;
  pageTemplate: string;
  deliveryType: string;
  basePriceJOD: number | null;
  region: string | null;
  isFeatured: boolean;
  badgeAr: string | null;
  badgeEn: string | null;
  labelColor: string | null;
  variants: CatalogVariant[];
  features: CatalogFeature[];
  themeGradient: string | null;
};

export type CatalogCategoryChild = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string | null;
  taglineEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  iconImage: string | null;
  bg: string | null;
  pageTemplate: string;
  /** Product slug to link to, when this sub-category has a live product. */
  productSlug: string | null;
};

export type CatalogCategory = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string | null;
  taglineEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  pageTemplate: string;
  children: CatalogCategoryChild[];
  products: CatalogProduct[];
  accentColor: string | null;
  themeGradient: string | null;
};

function publicClient() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type Overrides = Record<string, { price?: number; oldPrice?: number | null }>;

async function loadOverrides(supabase: ReturnType<typeof publicClient>): Promise<Overrides> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "catalog_prices")
      .maybeSingle();
    const v = (data as { value?: unknown } | null)?.value;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Overrides) : {};
  } catch {
    return {};
  }
}

export const getCatalogProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<CatalogProduct | null> => {
    const supabase = publicClient();
    const { data: row } = await supabase
      .from("products")
      .select(
        "id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, icon, icon_image_url, thumb_bg, accent_color, theme_gradient, card_gradient, identifier_label_ar, identifier_label_en, identifier_placeholder, delivery_method_ar, delivery_method_en, delivery_details, page_template, delivery_type, base_price_jod, region, is_active, is_featured, badge_ar, badge_en, label_color, categories:category_id (name_ar, name_en)",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return null;

    const p = row as Record<string, any>;
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

    return {
      slug: p.slug,
      nameAr: p.name_ar,
      nameEn: p.name_en || p.name_ar,
      taglineAr: p.tagline_ar ?? null,
      taglineEn: p.tagline_en ?? null,
      descriptionAr: p.description_ar ?? null,
      descriptionEn: p.description_en ?? null,
      icon: p.icon ?? null,
      iconImage: p.icon_image_url ?? null,
      thumbBg: p.thumb_bg ?? null,
      accentColor: p.accent_color ?? null,
      themeGradient: p.theme_gradient ?? null,
      cardGradient: p.card_gradient ?? null,
      categoryNameAr: cat?.name_ar ?? null,
      categoryNameEn: cat?.name_en ?? cat?.name_ar ?? null,
      identifierLabelAr: p.identifier_label_ar ?? null,
      identifierLabelEn: p.identifier_label_en ?? null,
      identifierPlaceholder: p.identifier_placeholder ?? null,
      deliveryMethodAr: p.delivery_method_ar ?? null,
      deliveryMethodEn: p.delivery_method_en ?? null,
      deliveryDetails:
        p.delivery_details && typeof p.delivery_details === "object" && !Array.isArray(p.delivery_details)
          ? (p.delivery_details as DeliveryDetails)
          : null,
      pageTemplate: p.page_template ?? "standard",
      deliveryType: p.delivery_type ?? "manual",
      basePriceJOD: p.base_price_jod ? Number(p.base_price_jod) : null,
      region: p.region ?? null,
      isFeatured: !!p.is_featured,
      badgeAr: p.badge_ar ?? null,
      badgeEn: p.badge_en ?? p.badge_ar ?? null,
      labelColor: p.label_color ?? null,
      variants: (variants ?? []).map((v: Record<string, any>) => {
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
      }),
      features: (features ?? []).map((f: Record<string, any>) => ({
        icon: f.icon ?? null,
        titleAr: f.title_ar,
        titleEn: f.title_en || f.title_ar,
        descAr: f.desc_ar ?? null,
        descEn: f.desc_en ?? f.desc_ar ?? null,
      })),
    };
  });

export const getCatalogCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data.slug) }))
  .handler(async ({ data }): Promise<CatalogCategory | null> => {
    const supabase = publicClient();
    const { data: row } = await supabase
      .from("categories")
      .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, icon, page_template, is_active, accent_color, theme_gradient")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return null;
    const c = row as Record<string, any>;

    const { data: kids } = await supabase
      .from("categories")
      .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, icon, icon_url, theme_gradient, page_template, sort_order")
      .eq("parent_id", c.id)
      .order("sort_order", { ascending: true });

    const kidIds = (kids ?? []).map((k: Record<string, any>) => k.id);
    
    // Fetch products for both children and the category itself
    const allTargetIds = [c.id, ...kidIds];
    const { data: prods, error: prodError } = await supabase
      .from("products")
      .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, icon, icon_image_url, thumb_bg, accent_color, theme_gradient, card_gradient, identifier_label_ar, identifier_label_en, identifier_placeholder, delivery_method_ar, delivery_method_en, delivery_details, page_template, delivery_type, base_price_jod, region, is_active, is_featured, badge_ar, badge_en, label_color, category_id")
      .in("category_id", allTargetIds);
    
    if (prodError) {
      console.error("Error fetching products for category:", prodError);
    }
    // Note: We removed the is_active check here because the reveal system 
    // and empty categories need to load metadata even if products are inactive.
    // However, we should filter for the UI if needed.

    const productsForThisCat: CatalogProduct[] = [];
    const productsByChild = new Map<string, any[]>();

    for (const p of (prods ?? []) as any[]) {
      if (!p.is_active) continue;

      if (p.category_id === c.id) {
        productsForThisCat.push({
          slug: p.slug,
          nameAr: p.name_ar,
          nameEn: p.name_en || p.name_ar,
          taglineAr: p.tagline_ar,
          taglineEn: p.tagline_en,
          descriptionAr: p.description_ar,
          descriptionEn: p.description_en,
          icon: p.icon,
          iconImage: p.icon_image_url,
          thumbBg: p.thumb_bg,
          accentColor: p.accent_color,
          cardGradient: p.card_gradient,
          categoryNameAr: c.name_ar,
          categoryNameEn: c.name_en,
          identifierLabelAr: p.identifier_label_ar,
          identifierLabelEn: p.identifier_label_en,
          identifierPlaceholder: p.identifier_placeholder,
          deliveryMethodAr: p.delivery_method_ar,
          deliveryMethodEn: p.delivery_method_en,
          deliveryDetails: p.delivery_details,
          pageTemplate: p.page_template || "standard",
          deliveryType: p.delivery_type,
          basePriceJOD: p.base_price_jod,
          region: p.region,
          isFeatured: p.is_featured,
          badgeAr: p.badge_ar,
          badgeEn: p.badge_en,
          labelColor: p.label_color,
          variants: [],
          features: [],
          themeGradient: p.theme_gradient
        } as any);
      } else {
        if (!productsByChild.has(p.category_id)) productsByChild.set(p.category_id, []);
        productsByChild.get(p.category_id)!.push(p);
      }
    }

    return {
      id: c.id,
      slug: c.slug,
      nameAr: c.name_ar,
      nameEn: c.name_en || c.name_ar,
      taglineAr: c.tagline_ar ?? null,
      taglineEn: c.tagline_en ?? null,
      descriptionAr: c.description_ar ?? null,
      descriptionEn: c.description_en ?? null,
      icon: c.icon ?? null,
      pageTemplate: c.page_template ?? "standard",
      accentColor: c.accent_color ?? null,
      themeGradient: c.theme_gradient ?? null,
      products: productsForThisCat,
      children: (kids ?? [])
        .map((k: Record<string, any>) => {
        const childProds = productsByChild.get(k.id) || [];
        // If it has exactly one product, we can link directly to it.
        // If it has multiple, we link to the sub-category page.
        const firstProd = childProds.length === 1 ? childProds[0] : null;
        return {
          id: k.id,
          slug: k.slug,
          nameAr: k.name_ar,
          nameEn: k.name_en || k.name_ar,
          taglineAr: k.tagline_ar ?? null,
          taglineEn: k.tagline_en ?? null,
          descriptionAr: k.description_ar ?? null,
          descriptionEn: k.description_en ?? null,
          icon: k.icon ?? firstProd?.icon ?? null,
          iconImage: k.icon_url ?? firstProd?.icon_image_url ?? null,
          bg: k.theme_gradient ?? firstProd?.thumb_bg ?? null,
          pageTemplate: k.page_template ?? "standard",
          productSlug: firstProd?.slug ?? null,
        };
      }),
    };
  });

export const getFeaturedCatalogItems = createServerFn({ method: "GET" })
  .handler(async (): Promise<CatalogProduct[]> => {
    const supabase = publicClient();
    const { data: prods } = await supabase
      .from("products")
      .select("id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en, icon, icon_image_url, thumb_bg, accent_color, theme_gradient, card_gradient, identifier_label_ar, identifier_label_en, identifier_placeholder, delivery_method_ar, delivery_method_en, delivery_details, page_template, delivery_type, base_price_jod, region, is_active, is_featured, badge_ar, badge_en, label_color, category_id, categories:category_id (name_ar, name_en)")
      .eq("is_active", true)
      .eq("is_featured", true)
      .limit(20);
    
    return (prods ?? []).map((p: any) => ({
      slug: p.slug,
      nameAr: p.name_ar,
      nameEn: p.name_en || p.name_ar,
      taglineAr: p.tagline_ar,
      taglineEn: p.tagline_en,
      descriptionAr: p.description_ar,
      descriptionEn: p.description_en,
      icon: p.icon,
      iconImage: p.icon_image_url,
      thumbBg: p.thumb_bg,
      accentColor: p.accent_color,
      cardGradient: p.card_gradient,
      categoryNameAr: p.categories?.name_ar,
      categoryNameEn: p.categories?.name_en || p.categories?.name_ar,
      identifierLabelAr: p.identifier_label_ar,
      identifierLabelEn: p.identifier_label_en,
      identifierPlaceholder: p.identifier_placeholder,
      deliveryMethodAr: p.delivery_method_ar,
      deliveryMethodEn: p.delivery_method_en,
      deliveryDetails: p.delivery_details,
      pageTemplate: p.page_template || "standard",
      deliveryType: p.delivery_type || "manual",
      basePriceJOD: p.base_price_jod,
      region: p.region,
      isFeatured: p.is_featured,
      badgeAr: p.badge_ar,
      badgeEn: p.badge_en,
      labelColor: p.label_color,
      variants: [],
      features: [],
      themeGradient: p.theme_gradient
    }));
  });
