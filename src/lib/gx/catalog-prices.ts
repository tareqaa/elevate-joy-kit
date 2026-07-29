/* ============================================================
   GX STORE — LIVE CATALOG PRICES
   Prices live in the database (site_settings.catalog_prices) and are
   applied on top of the static catalog. Because the catalog objects are
   mutated in place, every surface (product pages, home, search, cart,
   orders) reads the same, always-current price.
   Each price row has a stable code (the plan / denomination id) —
   that's the same code used to scope a coupon to a product.
   ============================================================ */

import { PRODUCTS_CATALOG, GIFT_CARDS_CATALOG } from "@/data/products";

export type PriceOverride = { price?: number; oldPrice?: number | null };
export type CatalogPrices = Record<string, PriceOverride>;

export const CATALOG_PRICES_KEY = "catalog_prices";
export const CATALOG_PRICES_CACHE = "gx_catalog_prices_v1";

export type PriceRow = {
  code: string;
  productSlug: string;
  productName: string;
  productIcon: string;
  productImg: string | null;
  productKind: "plan" | "giftcard";
  group: string;
  label: string;
  basePrice: number;
  baseOldPrice: number | null;
};

type Target = { obj: { price: number; oldPrice?: number }; row: PriceRow };

const targets = new Map<string, Target>();

function register(
  code: string,
  obj: { price: number; oldPrice?: number },
  row: Omit<PriceRow, "code" | "basePrice" | "baseOldPrice">,
) {
  if (targets.has(code)) return;
  targets.set(code, {
    obj,
    row: { code, basePrice: obj.price, baseOldPrice: obj.oldPrice ?? null, ...row },
  });
}

for (const slug in PRODUCTS_CATALOG) {
  const p = PRODUCTS_CATALOG[slug];
  const groups: [string, typeof p.plans][] = [
    ["الباقات", p.plans],
    ["Crew", p.crewPlans],
    ["V-Bucks", p.vbucksPlans],
  ];
  for (const [group, list] of groups) {
    for (const plan of list ?? []) {
      register(plan.id, plan, {
        productSlug: slug,
        productName: p.name,
        productIcon: p.icon,
        productImg: p.iconImg ?? null,
        productKind: "plan",
        group,
        label: plan.label,
      });
    }
  }
}

for (const slug in GIFT_CARDS_CATALOG) {
  const gc = GIFT_CARDS_CATALOG[slug];
  for (const region of gc.regions) {
    for (const d of region.denominations) {
      register(d.id, d, {
        productSlug: slug,
        productName: gc.name,
        productIcon: gc.icon,
        productImg: gc.iconImg ?? null,
        productKind: "giftcard",
        group: `${region.flag} ${region.name}`,
        label: d.value,
      });
    }
  }
}


/** Every editable price in the store, with its stable code. */
export function listPriceRows(): PriceRow[] {
  return Array.from(targets.values()).map((t) => t.row);
}

/** Applies overrides in place; missing codes fall back to the base price. */
export function applyCatalogPrices(map: CatalogPrices | null | undefined) {
  const m = map && typeof map === "object" ? map : {};
  for (const [code, t] of targets) {
    const o = m[code];
    const price = typeof o?.price === "number" && o.price >= 0 ? o.price : t.row.basePrice;
    t.obj.price = price;
    const old = o && "oldPrice" in o ? o.oldPrice : t.row.baseOldPrice;
    if (typeof old === "number" && old > 0) t.obj.oldPrice = old;
    else delete t.obj.oldPrice;
  }
  // Let live surfaces (cart totals) recompute against the new prices.
  if (typeof window !== "undefined") window.dispatchEvent(new Event("gx:prices-updated"));
}

export function readCachedCatalogPrices(): CatalogPrices {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CATALOG_PRICES_CACHE);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? (v as CatalogPrices) : {};
  } catch {
    return {};
  }
}

export function cacheCatalogPrices(map: CatalogPrices) {
  try { localStorage.setItem(CATALOG_PRICES_CACHE, JSON.stringify(map)); } catch { /* noop */ }
}

// Apply the last known prices immediately so the first paint after a refresh
// already shows the edited price (no flash of the old number).
applyCatalogPrices(readCachedCatalogPrices());
