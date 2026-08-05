/* ============================================================
   GX STORE — DATABASE VARIANT REGISTRY (client)
   Any product added from the admin panel lives only in the database,
   so the static catalog can't resolve its cart id. This registry keeps
   a light client-side map of every active variant so the cart, the
   "buy now" flow and the order summary work for new products with no
   code changes.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";
import { CATALOG_PRICES_CACHE, type CatalogPrices } from "./catalog-prices";
import type { ResolvedPlan } from "@/data/products";

const CACHE_KEY = "gx_db_variants_v1";

type Entry = ResolvedPlan;

let map: Record<string, Entry> = {};
let loaded = false;
let loading: Promise<void> | null = null;

function overrides(): CatalogPrices {
  try {
    const raw = localStorage.getItem(CATALOG_PRICES_CACHE);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? (v as CatalogPrices) : {};
  } catch {
    return {};
  }
}

function hydrateCache() {
  if (loaded || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) map = JSON.parse(raw) as Record<string, Entry>;
  } catch { /* noop */ }
}

export function findDbPlanByCartId(cartId: string): ResolvedPlan | null {
  hydrateCache();
  const hit = map[cartId];
  if (!hit) return null;
  const o = overrides()[cartId];
  const price = typeof o?.price === "number" && o.price >= 0 ? o.price : hit.price;
  return { ...hit, price };
}

export async function loadDbVariants(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (loading) return loading;
  if (loaded && !force) return;
  loading = (async () => {
    try {
      const { data } = await supabase
        .from("product_variants")
        .select(
          "cart_id, label_ar, label_en, price_jod, is_active, products:product_id (slug, name_ar, name_en, icon, thumb_bg, is_active)",
        )
        .eq("is_active", true)
        .limit(2000);
      const next: Record<string, Entry> = {};
      for (const row of (data ?? []) as Record<string, any>[]) {
        const p = row.products as Record<string, any> | null;
        if (!row.cart_id || !p || p.is_active === false) continue;
        next[row.cart_id] = {
          cartId: row.cart_id,
          product: p.slug,
          name: `${p.name_ar || p.name_en} — ${row.label_ar || row.label_en}`,
          icon: p.icon || "🎮",
          bg: p.thumb_bg || "linear-gradient(145deg,#1a1e2a,#0a0c12)",
          price: Number(row.price_jod) || 0,
        };
      }
      map = next;
      loaded = true;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      window.dispatchEvent(new Event("gx:db-variants-updated"));
    } catch { /* keep whatever cache we have */ }
  })();
  await loading;
  loading = null;
}
