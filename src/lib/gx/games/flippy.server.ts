/* ============================================================
   GX FLIPPY — SERVER-SIDE REPLAY VERIFICATION
   The browser never submits a bare score. It sends the run log
   (seed, play-area size, the step of every flap and resize, and
   how many steps the run lasted). The server replays that log
   through the exact same engine and only the recomputed score is
   saved. Saving goes through a database function that only the
   server's service role may call.
   ============================================================ */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { replayFlippyRun, FLIPPY_MAX_STEPS } from "./flippy-engine";
import { getVerifiedCaller } from "@/lib/gx/supabase-request";

const dim = z.number().int().min(200).max(4000);

const inputSchema = z.object({
  tournamentId: z.string().uuid(),
  runId: z.string().uuid(),
  log: z.object({
    seed: z.number().int().min(0).max(0xffffffff),
    initHeight: dim,
    startW: dim,
    startH: dim,
    jumps: z.array(z.number().int().min(0)).max(200_000),
    resizes: z
      .array(z.object({ f: z.number().int().min(0), w: dim, h: dim }))
      .max(500),
    steps: z.number().int().min(1).max(FLIPPY_MAX_STEPS),
  }),
  claimedScore: z.number().int().min(0).max(100_000),
});

export type SubmitFlippyRunResult = { ok: boolean; error?: string; score?: number; best_score?: number };

export const submitFlippyRun = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitFlippyRunResult> => {
    const caller = await getVerifiedCaller();
    if (!caller) return { ok: false, error: "auth_required" };

    const result = replayFlippyRun(data.log);
    if (!result.valid || result.score !== data.claimedScore) {
      console.warn("submitFlippyRun: replay verification failed", {
        userId: caller.userId,
        reason: result.valid ? "score_mismatch" : result.reason,
      });
      return { ok: false, error: "verification_failed" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rpcData, error } = await (supabaseAdmin as any).rpc("submit_tournament_score", {
      _tournament_id: data.tournamentId,
      _score: result.score,
      _run_id: data.runId,
      _user_id: caller.userId,
      _sim_frames: result.steps,
    });
    if (error) {
      console.error("submitFlippyRun: submit_tournament_score failed", error);
      return { ok: false, error: "submit_failed" };
    }
    return (rpcData as SubmitFlippyRunResult) ?? { ok: false, error: "unknown" };
  });
