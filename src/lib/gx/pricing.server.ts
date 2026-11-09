/* ============================================================
   GX STORE — SERVER-SIDE PRICE VERIFICATION
   The server NEVER trusts a money value coming from the browser.
   Every cart line is re-priced from the database: the variant row is
   resolved by its stable `cart_id` in `product_variants`, then the live
   admin overrides stored in `site_settings.catalog_prices` are applied
   on top — the exact same resolution the product pages use.
   ============================================================ */

import type { SupabaseClient } from "@supabase/supabase-js";


export type PricedLine = {
  cartId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  custom: boolean;
};

export type PricingResult = {
  lines: PricedLine[];
  subtotal: number;
};

type IncomingItem = {
  cartId: string;
  qty: number;
  price?: number;
  [k: string]: unknown;
};

/** JOD carries three decimals — every money rounding in the app uses *1000. */
const roundJod = (n: number) => Math.round(n * 1000) / 1000;


export const AUTHORITATIVE_STATIC_PRICES: Record<string, number> = {
  "ms365-acct-12": 5,
  "win-11-pro-retail": 7,
  "win-11-pro-oem": 5,
  "windows-11-pro-retail": 7,
  "windows-11-pro-oem": 5,
  "notion-biz-3m": 6,
  "notion-business": 6,
  "gemini-plus-6m": 4,
  "gemini-plus-3m": 4,
  "gemini": 4,
  // PlayStation Saudi Store (SAR)
  "psn-sa-50": 11.5,
  "psn-sa-100": 23,
  "psn-sa-150": 34.5,
  "psn-sa-200": 46,
  "psn-sa-300": 69,
  "psn-sa-400": 92,
  "psn-sa-500": 115,
};

/** Reads the live price overrides from the database. */
export async function loadCatalogPriceOverrides(
  supabase: SupabaseClient<any, any, any>,
): Promise<Record<string, { price?: number }>> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "catalog_prices")
      .maybeSingle();
    const v = (data as { value?: unknown } | null)?.value;
    const base = v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, { price?: number }>)
      : {};
    return {
      ...base,
      "ms365-acct-12": { price: 5 },
      "win-11-pro-retail": { price: 7 },
      "win-11-pro-oem": { price: 5 },
      "windows-11-pro-retail": { price: 7 },
      "windows-11-pro-oem": { price: 5 },
      "notion-biz-3m": { price: 6 },
      "notion-business": { price: 6 },
      "gemini-plus-6m": { price: 4 },
      "gemini-plus-3m": { price: 4 },
      "gemini": { price: 4 },
      "psn-sa-50": { price: 11.5 },
      "psn-sa-100": { price: 23 },
      "psn-sa-150": { price: 34.5 },
      "psn-sa-200": { price: 46 },
      "psn-sa-300": { price: 69 },
      "psn-sa-400": { price: 92 },
      "psn-sa-500": { price: 115 },
    };
  } catch {
    return {
      "ms365-acct-12": { price: 5 },
      "win-11-pro-retail": { price: 7 },
      "win-11-pro-oem": { price: 5 },
      "windows-11-pro-retail": { price: 7 },
      "windows-11-pro-oem": { price: 5 },
      "notion-biz-3m": { price: 6 },
      "notion-business": { price: 6 },
      "gemini-plus-6m": { price: 4 },
      "gemini-plus-3m": { price: 4 },
      "gemini": { price: 4 },
      "psn-sa-50": { price: 11.5 },
      "psn-sa-100": { price: 23 },
      "psn-sa-150": { price: 34.5 },
      "psn-sa-200": { price: 46 },
      "psn-sa-300": { price: 69 },
      "psn-sa-400": { price: 92 },
      "psn-sa-500": { price: 115 },
    };
  }
}

/** Reads product stock limits from site_settings. */
export async function loadStockLimits(
  supabase: SupabaseClient<any, any, any>,
): Promise<Record<string, number | null>> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "product_stock_limits")
      .maybeSingle();
    const v = (data as { value?: unknown } | null)?.value;
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, number | null>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Validates that no items in the cart are sold out or forbidden.
 */
export function verifyCartStockLimits(
  items: IncomingItem[],
  stockLimits: Record<string, number | null>,
): void {
  for (const it of items) {
    const cartId = String(it?.cartId ?? "").trim().toLowerCase();
    const slug = String(it?.product_slug ?? "").trim().toLowerCase();
    const name = String(it?.name ?? "").trim().toLowerCase();

    // 1. Social media products are permanently sold out
    if (
      cartId.startsWith("fb-fol") ||
      cartId.startsWith("fb-lik") ||
      cartId.startsWith("ig-fol") ||
      cartId.startsWith("ig-lik") ||
      cartId.startsWith("tiktok-") ||
      cartId.startsWith("tt-") ||
      cartId.startsWith("tw-") ||
      cartId.startsWith("twitter-") ||
      slug === "social-media" ||
      slug.startsWith("social-media") ||
      slug.startsWith("instagram-") ||
      slug.startsWith("facebook-") ||
      slug.startsWith("tiktok-") ||
      slug.startsWith("twitter-") ||
      name.includes("متابعين") ||
      name.includes("لايكات") ||
      name.includes("social")
    ) {
      throw new Error(`عذراً، المنتج (${it.name || cartId}) غير متوفر حالياً`);
    }

    // 2. Check product_stock_limits
    if (stockLimits && typeof stockLimits === "object") {
      const keys: string[] = [];
      if (cartId) {
        keys.push(cartId);
        const dashIdx = cartId.lastIndexOf("-");
        if (dashIdx > 0) keys.push(cartId.substring(0, dashIdx));
      }
      if (slug && !keys.includes(slug)) keys.push(slug);

      for (const k of keys) {
        const v = stockLimits[k];
        if (v !== undefined && v !== null && Number(v) <= 0) {
          throw new Error(`عذراً، المنتج (${it.name || cartId}) نفد من المخزون حالياً`);
        }
      }
    }
  }
}

/**
 * Loads the authoritative base prices for the given cart ids straight from
 * `product_variants` (active variants of active products only).
 */
export async function loadDbBasePrices(
  supabase: SupabaseClient<any, any, any>,
  cartIds: string[],
): Promise<Map<string, number>> {
  const ids = Array.from(new Set(cartIds.filter(Boolean)));
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const { data, error } = await supabase
    .from("product_variants")
    .select("cart_id, price_jod, is_active, products!inner(is_active)")
    .in("cart_id", ids)
    .eq("is_active", true);
  if (error) throw new Error("تعذّر التحقق من الأسعار، حاول مرة أخرى");
  for (const row of (data ?? []) as Record<string, any>[]) {
    if (row.products?.is_active === false) continue;
    if (row.cart_id) out.set(String(row.cart_id), Number(row.price_jod) || 0);
  }

  // Secondary fallback: check products table by slug for direct products
  const missingIds = ids.filter((id) => !out.has(id));
  if (missingIds.length > 0) {
    const { data: prodData } = await supabase
      .from("products")
      .select("slug, base_price_jod, is_active")
      .in("slug", missingIds)
      .eq("is_active", true);
    for (const prod of (prodData ?? []) as Record<string, any>[]) {
      if (prod.slug && prod.base_price_jod != null) {
        out.set(String(prod.slug), Number(prod.base_price_jod) || 0);
      }
    }
  }

  // Ensure authoritative static prices for M365 and separated Windows products are always populated
  for (const [k, p] of Object.entries(AUTHORITATIVE_STATIC_PRICES)) {
    if (ids.includes(k)) {
      out.set(k, p);
    }
  }

  return out;
}

/**
 * Re-prices every cart line from trusted sources (database prices + admin
 * overrides). Throws when a line cannot be resolved (unknown cartId) or when
 * a custom (client-priced) line is present but not allowed.
 */
export function priceCartItems(
  items: IncomingItem[],
  overrides: Record<string, { price?: number }>,
  opts: { allowCustom: boolean; basePrices: Map<string, number> },
): PricingResult {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("السلة فارغة");
  }

  const basePrices = opts.basePrices;
  const lines: PricedLine[] = [];
  let subtotal = 0;

  for (const raw of items) {
    const cartId = String(raw?.cartId ?? "").trim();
    if (!cartId) throw new Error("عنصر غير صالح في السلة");

    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error("كمية غير صالحة في السلة");
    }

    const isCustom = cartId.startsWith("custom-") || !basePrices.has(cartId);
    let unitPrice: number;

    if (basePrices.has(cartId)) {
      const override = overrides?.[cartId];
      const o = typeof override?.price === "number" && override.price >= 0 ? override.price : null;
      unitPrice = o ?? (basePrices.get(cartId) as number);
    } else {
      // Unknown cartId — only an admin may push a hand-priced (custom) line.
      if (!opts.allowCustom) {
        throw new Error("تغيّر السعر، أعد تحميل الصفحة");
      }
      const p = Number(raw?.price);
      if (!Number.isFinite(p) || p < 0 || p > 100000) throw new Error("سعر غير صالح");
      unitPrice = p;
    }

    unitPrice = roundJod(unitPrice);
    const lineTotal = roundJod(unitPrice * qty);
    subtotal = roundJod(subtotal + lineTotal);
    lines.push({ cartId, qty, unitPrice, lineTotal, custom: isCustom });
  }

  return { lines, subtotal: roundJod(subtotal) };
}


/** True when the given user has the admin role. */
export async function isAdminUser(
  supabase: SupabaseClient<any, any, any>,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return data === true;
  } catch {
    return false;
  }
}
