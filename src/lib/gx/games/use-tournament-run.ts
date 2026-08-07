/* ============================================================
   SHARED TOURNAMENT-RUN HELPERS
   The part of the tournament flow that's genuinely identical
   between every mini-game: figuring out which tournament is
   live, opening a server-issued play session, and reading the
   caller's current standing. Score submission itself stays
   game-specific (Blast replay-verifies a move log, Flippy
   submits a plausibility-checked score) so it isn't included here.
   ============================================================ */

import { supabase } from "@/integrations/supabase/client";

export type TournamentStanding = {
  played?: boolean;
  rank?: number;
  total?: number;
  score?: number;
};

/**
 * Resolves the currently-live tournament id for a game.
 * `pinned` (e.g. from a `?t=` search param) always wins.
 * `gameSlug` restricts to tournaments tagged for this game (untagged
 * tournaments always match); omit it to accept any live tournament.
 */
export async function resolveActiveTournamentId(
  pinned: string | null,
  gameSlug?: string | string[],
): Promise<string | null> {
  if (pinned) return pinned;
  const { data } = await supabase.rpc("list_tournaments");
  const rows = (data ?? []) as { id: string; live_status: string; game_slug?: string }[];
  const slugs = gameSlug ? (Array.isArray(gameSlug) ? gameSlug : [gameSlug]) : null;
  const live = rows.find(
    (t) => t.live_status === "live" && (!slugs || !t.game_slug || slugs.includes(t.game_slug)),
  );
  return live?.id ?? null;
}

/** Starts (or reuses) a server-issued play session. Null if the tournament isn't open right now. */
export async function startTournamentRun(tournamentId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("start_tournament_run", {
    _tournament_id: tournamentId,
  });
  if (error) {
    console.error("start_tournament_run failed:", error);
    return null;
  }
  const res = data as { ok?: boolean; run_id?: string } | null;
  return res?.ok && res.run_id ? res.run_id : null;
}

export async function readTournamentStanding(
  tournamentId: string,
): Promise<TournamentStanding | null> {
  const { data } = await supabase.rpc("my_tournament_standing", { _tournament_id: tournamentId });
  return (data as TournamentStanding | null) ?? null;
}
