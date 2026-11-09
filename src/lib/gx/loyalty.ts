import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LevelRow = Database["public"]["Tables"]["levels"]["Row"];

export type MyLoyalty = {
  ok: boolean;
  xp: number;
  coins: number;
  store_credit: number;
  total_spent: number;
  orders_count: number;
  rank: number;
  level: LevelRow | null;
  next_level: LevelRow | null;
};

/** 1 JOD spent = 100 XP */
export const XP_PER_JOD = 100;
/** 1 JOD actually paid = 10 GX Coins (before level bonus) */
export const COINS_PER_JOD = 10;
/** 1000 GX Coins = 1 JOD */
export const COINS_PER_JOD_REDEEM = 1000;
/** GX Coins can cover at most 25% of eligible products (Games & Digital Subscriptions) */
export const MAX_COINS_DISCOUNT_RATIO = 0.25;

/**
 * Checks if a cart item or product represents a gift card (which is excluded from GX Coins).
 */
export function isGiftCardItem(item: {
  cartId?: string | null;
  product?: string | null;
  productSlug?: string | null;
  slug?: string | null;
  categorySlug?: string | null;
  category?: string | null;
  deliveryType?: string | null;
  productType?: string | null;
  name?: string | null;
} | null | undefined): boolean {
  if (!item) return false;
  const cId = (item.cartId || "").toLowerCase();
  const prod = (item.product || item.productSlug || item.slug || "").toLowerCase();
  const cat = (item.categorySlug || item.category || "").toLowerCase();
  const deliv = (item.deliveryType || item.productType || "").toLowerCase();
  const name = (item.name || "").toLowerCase();

  // Explicit gift card delivery type or category
  if (deliv === "giftcard" || deliv === "gift-card") return true;
  if (
    cat === "gift-cards" ||
    cat.startsWith("gc-") ||
    cat.includes("giftcard") ||
    cat.includes("بطاقات الهدايا") ||
    cat.includes("بطاقات شحن")
  ) {
    return true;
  }

  // Denominations or slug prefixes
  if (
    cId.startsWith("gc-") ||
    cId.startsWith("psn-") ||
    cId.startsWith("xbox-tr-") ||
    cId.startsWith("xbox-us-") ||
    cId.startsWith("xbox-ae-") ||
    cId.startsWith("xbox-sa-") ||
    cId.startsWith("apple-") ||
    cId.startsWith("itunes-") ||
    cId.startsWith("google-") ||
    cId.startsWith("gp-") ||
    cId.startsWith("steam-") ||
    cId.startsWith("razer-")
  ) {
    return true;
  }

  if (
    prod.startsWith("gc-") ||
    prod === "gift-cards" ||
    prod === "playstation" ||
    prod === "xbox-gc" ||
    prod === "itunes" ||
    prod === "google-play"
  ) {
    return true;
  }

  if (
    name.includes("gift card") ||
    name.includes("بطاقة شحن") ||
    name.includes("بطاقات هدايا") ||
    name.includes("بطاقة هدايا") ||
    name.includes("بطاقات شحن")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a cart item is eligible for GX Coins redemption.
 * Per policy: GX Coins are ONLY valid on games and digital subscriptions. Gift cards are strictly excluded.
 */
export function isEligibleForCoins(item: {
  cartId?: string | null;
  product?: string | null;
  productSlug?: string | null;
  slug?: string | null;
  categorySlug?: string | null;
  category?: string | null;
  deliveryType?: string | null;
  productType?: string | null;
  name?: string | null;
} | null | undefined): boolean {
  if (!item) return false;
  if (isGiftCardItem(item)) return false;
  const cat = (item.categorySlug || item.category || "").toLowerCase();
  if (cat === "social-media" || cat.includes("سوشال")) return false;
  return true;
}


export function coinsToJod(coins: number): number {
  return Math.round((Math.max(0, coins) / COINS_PER_JOD_REDEEM) * 1000) / 1000;
}

export function jodToCoins(jod: number): number {
  return Math.max(0, Math.floor(jod * COINS_PER_JOD_REDEEM));
}

export function levelProgress(xp: number, current: LevelRow | null, next: LevelRow | null) {
  const min = Number(current?.min_xp ?? 0);
  const max = next ? Number(next.min_xp) : min;
  if (!next || max <= min) return { pct: 100, remaining: 0, min, max };
  const pct = Math.max(0, Math.min(100, Math.round(((xp - min) / (max - min)) * 100)));
  return { pct, remaining: Math.max(0, max - xp), min, max };
}

export async function fetchMyLoyalty(): Promise<MyLoyalty | null> {
  const { data, error } = await supabase.rpc("get_my_loyalty");
  if (error) throw error;
  const row = data as unknown as MyLoyalty | null;
  if (!row || !row.ok) return null;
  return {
    ...row,
    xp: Number(row.xp || 0),
    coins: Number(row.coins || 0),
    store_credit: Number(row.store_credit || 0),

    total_spent: Number(row.total_spent || 0),
    orders_count: Number(row.orders_count || 0),
    rank: Number(row.rank || 0),
  };
}

export async function fetchLevels(): Promise<LevelRow[]> {
  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function levelName(l: Pick<LevelRow, "name_ar" | "name_en"> | null | undefined, lang: string) {
  if (!l) return "";
  return lang === "ar" ? l.name_ar : l.name_en;
}

export async function linkMyPastOrders() {
  try {
    const { data, error } = await (supabase.rpc as any)("link_my_past_orders");
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

