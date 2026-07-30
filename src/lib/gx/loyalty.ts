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
/** GX Coins can cover at most 50% of an order */
export const MAX_COINS_DISCOUNT_RATIO = 0.5;


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
