/* ============================================================
   TOURNAMENT SCORE SUBMISSION — server-side retry path
   Used only when the browser's direct `submit_tournament_score`
   RPC call fails for transport reasons (network/CORS). Identity
   is never taken from the client — it's derived from the caller's
   verified Supabase access token — and this is a thin authenticated
   proxy to the same RPC everyone else uses: every protection it
   enforces (run ownership, elapsed-time/plausibility bounds,
   tournament window, max_players) still applies here too.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVerifiedCaller, getUserScopedClient } from "@/lib/gx/supabase-request";

const inputSchema = z.object({
  tournamentId: z.string().uuid(),
  runId: z.string().uuid(),
  score: z.number().int().min(0).max(10_000_000),
});

export type SubmitTournamentScoreResult = { ok: boolean; error?: string; best?: number };

export const submitTournamentScoreServer = createServerFn({ method: "POST" })
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitTournamentScoreResult> => {
    const caller = await getVerifiedCaller();
    if (!caller) return { ok: false, error: "auth_required" };

    const supabase = getUserScopedClient(caller.token);
    const { data: rpcData, error } = await (supabase as any).rpc("submit_tournament_score", {
      _tournament_id: data.tournamentId,
      _score: data.score,
      _run_id: data.runId,
    });

    if (error) {
      console.error("submitTournamentScoreServer: RPC failed", error);
      return { ok: false, error: error.message };
    }

    return (rpcData as SubmitTournamentScoreResult) ?? { ok: false, error: "unknown" };
  });
