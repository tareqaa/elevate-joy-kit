/* ============================================================
   MINI GAMES — admin-manageable catalog of standalone casual games.
   Completely separate from the tournament system: this just lists
   which games show up in the Mini Games section and how they're
   labeled. No tournament data lives here.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { getPublicClient } from "@/lib/gx/supabase-request";

export type MiniGameRow = {
  id: string;
  slug: string;
  gameSlug: string;
  path: string;
  icon: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
};

export const listMiniGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<MiniGameRow[]> => {
    const supabase = getPublicClient();
    // `mini_games` isn't in the generated Database types yet (new table) —
    // same (supabase as any) pattern already used elsewhere for this reason
    // (see admin/wheel.tsx's wheel_bonus_spins query).
    const { data, error } = await (supabase as any)
      .from("mini_games")
      .select("id, slug, game_slug, path, icon, name_ar, name_en, desc_ar, desc_en")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("listMiniGames: failed to load mini_games", error);
      return [];
    }

    const result = (data ?? []).map((row: Record<string, any>) => ({
      id: row.id,
      slug: row.slug,
      gameSlug: row.game_slug,
      path: row.path,
      icon: row.icon,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      descAr: row.desc_ar,
      descEn: row.desc_en,
    }));

    if (!result.some((g: MiniGameRow) => g.slug === "gx-flux")) {
      result.push({
        id: "gx-flux-default",
        slug: "gx-flux",
        gameSlug: "gx-flux",
        path: "/games/flux",
        icon: "⚡",
        nameAr: "GX Flux 3D",
        nameEn: "GX Flux 3D",
        descAr: "طابق ألوان بوابات النيون ثلاثية الأبعاد بسرعة فائقة!",
        descEn: "Match 3D neon gate colors at hyper speed!",
      });
    }

    return result;
  },
);
