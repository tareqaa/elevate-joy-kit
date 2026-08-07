/* ============================================================
   GX BLAST — SERVER-SIDE REPLAY VERIFICATION
   The client never gets to just claim a score. It submits the
   full move log it played (already tracked in GameState.moves),
   the server deterministically replays it through the exact same
   engine that drove the game, and only the recomputed score is
   ever forwarded to the database. A forged move log fails replay;
   a forged raw score is never accepted in the first place.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyRun } from "./blast-engine";
import { getVerifiedCaller, getUserScopedClient } from "@/lib/gx/supabase-request";

const submittedMoveSchema = z.object({
  trayIndex: z.number().int(),
  pieceId: z.string().min(1).max(16),
  row: z.number().int(),
  col: z.number().int(),
  durationMs: z.number().finite(),
});

const inputSchema = z.object({
  tournamentId: z.string().uuid(),
  runId: z.string().uuid(),
  seed: z.string().min(1).max(128),
  moves: z.array(submittedMoveSchema).max(5000),
  claimedScore: z.number().int().min(0).max(10_000_000),
});

export type SubmitBlastRunResult = { ok: boolean; error?: string; best?: number };

export const submitBlastRun = createServerFn({ method: "POST" })
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitBlastRunResult> => {
    const caller = await getVerifiedCaller();
    if (!caller) return { ok: false, error: "auth_required" };

    const result = verifyRun({
      seed: data.seed,
      moves: data.moves,
      claimedScore: data.claimedScore,
    });

    if (!result.valid) {
      console.warn("submitBlastRun: replay verification failed", {
        userId: caller.userId,
        reason: result.reason,
        moveIndex: result.moveIndex,
      });
      return { ok: false, error: "verification_failed" };
    }

    const supabase = getUserScopedClient(caller.token);
    const { data: rpcData, error } = await (supabase as any).rpc("submit_tournament_score", {
      _tournament_id: data.tournamentId,
      _score: result.score,
      _run_id: data.runId,
    });

    if (error) {
      console.error("submitBlastRun: submit_tournament_score RPC failed", error);
      return { ok: false, error: error.message };
    }

    return (rpcData as SubmitBlastRunResult) ?? { ok: false, error: "unknown" };
  });
