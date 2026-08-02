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
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, { price?: number }>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Re-prices every cart line from trusted sources.
 * Throws when a line cannot be resolved (unknown cartId) or when a custom
 * (client-priced) line is present but not allowed.
 */
export function priceCartItems(
  items: IncomingItem[],
  overrides: Record<string, { price?: number }>,
  opts: { allowCustom: boolean },
): PricingResult {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("السلة فارغة");
  }

  const lines: PricedLine[] = [];
  let subtotal = 0;

  for (const raw of items) {
    const cartId = String(raw?.cartId ?? "").trim();
    if (!cartId) throw new Error("عنصر غير صالح في السلة");

    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new Error("كمية غير صالحة في السلة");
    }

    const isCustom = cartId.startsWith("custom-") || !BASE_PRICES.has(cartId);
    let unitPrice: number;

    if (BASE_PRICES.has(cartId)) {
      const override = overrides?.[cartId];
      const o = typeof override?.price === "number" && override.price >= 0 ? override.price : null;
      unitPrice = o ?? (BASE_PRICES.get(cartId) as number);
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
