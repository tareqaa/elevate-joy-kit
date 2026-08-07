import { createServerFn } from "@tanstack/react-start";
import { getPublicClient } from "@/lib/gx/supabase-request";

export type TournamentPrize = { place: number; label_ar: string; label_en: string };

export type TournamentRow = {
  id: string;
  game_slug: string;
  game_icon: string;
  title_ar: string;
  title_en: string;
  game_path: string | null;
  starts_at: string;
  ends_at: string;
  prizes: TournamentPrize[];
  live_status: "live" | "upcoming" | "ended";
  participants: number;
  top_score: number;
};

export type TournamentsPayload = {
  serverNow: string;
  tournaments: TournamentRow[];
  /** how many tournaments the arena carousel shows (admin-controlled) */
  carouselCount: number;
};


export const listTournaments = createServerFn({ method: "GET" }).handler(
  async (): Promise<TournamentsPayload> => {
    const client = getPublicClient();

    const [{ data, error }, settingRes] = await Promise.all([
      client.rpc("list_tournaments"),
      client.from("site_settings").select("value").eq("key", "arena_carousel_count").maybeSingle(),
    ]);

    const raw = settingRes.data?.value as unknown;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    const carouselCount = Number.isFinite(parsed) && parsed > 0 ? Math.min(24, Math.round(parsed)) : 6;

    if (error) return { serverNow: new Date().toISOString(), tournaments: [], carouselCount };

    const rows = (data ?? []) as (TournamentRow & { server_now: string })[];
    const serverNow = rows[0]?.server_now ?? new Date().toISOString();
    return {
      serverNow,
      carouselCount,
      tournaments: rows.map(({ server_now: _ignored, ...t }) => ({
        ...t,
        prizes: Array.isArray(t.prizes) ? (t.prizes as TournamentPrize[]) : [],
      })),
    };

  },
);
