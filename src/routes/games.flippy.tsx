import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { FlippyCanvas } from "@/components/gx/games/FlippyCanvas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { flippyAudio } from "@/lib/gx/games/flippy-audio";
import { useLang } from "@/lib/gx/i18n";
import { toast } from "sonner";
import { resolveActiveTournamentId, startTournamentRun, readTournamentStanding } from "@/lib/gx/games/use-tournament-run";

export const Route = createFileRoute("/games/flippy")({
  validateSearch: (s: Record<string, unknown>): { t?: string; practice?: boolean } => {
    const out: { t?: string; practice?: boolean } = {};
    if (typeof s.t === "string" && s.t) out.t = s.t;
    // Casual/practice mode: guaranteed no tournament attachment, regardless
    // of whether a tournament happens to be live. Separate from the ?t=
    // tournament flow, which is left completely untouched.
    if (s.practice === "1" || s.practice === true || s.practice === "true") out.practice = true;
    return out;
  },
  head: () => ({
    meta: [
      { title: "GX Flippy Bird — حلّق في العوالم السحرية" },
      { name: "description", content: "تحدى أصدقائك في أطول رحلة طيران واكتشف عوالم جديدة." },
      { property: "og:title", content: "GX Flippy Bird" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: FlippyPage,
});

const BEST_KEY = "gx_flippy_best";

function FlippyPage() {
  const queryClient = useQueryClient();
  const { t: tournamentId, practice } = Route.useSearch();
  const [isMuted, setIsMuted] = useState(() => flippyAudio.isMuted());
  const [bestScore, setBestScore] = useState(0);
  useEffect(() => {
    try {
      setBestScore(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      /* ignore */
    }
  }, []);
  const [arenaRank, setArenaRank] = useState<{ rank: number | null; total: number | null; delta: number | null } | null>(null);
  const { dir, lang } = useLang();
  
  const runIdPromiseRef = useRef<Promise<string | null> | null>(null);
  // Track current score for immediate UI update during same session
  const scoreRef = useRef<number>(0);
  
  // Find active tournament for gx-flippy — skipped entirely in practice mode
  // (?practice=1), so activeTid stays null no matter what's live and no
  // tournament RPC below is ever reachable.
  // Tournament lookups must never refetch while a run is in progress: any
  // network/JSON work on the main thread lands as a visible hitch inside the
  // RAF loop. Practice mode had none of these queries at all, which is
  // exactly why it felt smoother than the tournament flow.
  const activeTidQ = useQuery({
    queryKey: ["active-tournament", "gx-flippy", tournamentId, practice],
    queryFn: () => resolveActiveTournamentId(tournamentId ?? null, ["gx-flippy", "flippy"]),
    enabled: !practice,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const activeTid = practice ? null : (activeTidQ.data ?? null);

  const myStandingQ = useQuery({
    queryKey: ["my-tournament-standing", activeTid],
    queryFn: () => (activeTid ? readTournamentStanding(activeTid) : Promise.resolve(null)),
    enabled: !!activeTid,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const tournamentBestScore = myStandingQ.data?.score || 0;
  const displayBestScore = activeTid ? Math.max(tournamentBestScore, scoreRef.current || 0) : bestScore;

  const handleGameStart = useCallback(() => {
    if (!activeTid) {
      runIdPromiseRef.current = Promise.resolve(null);
      return;
    }

    // Opening the run is a network call fired from inside the animation
    // loop's status transition — issuing it on that exact frame stalls the
    // very first frames of the flight. Defer it off the frame; the run id is
    // only awaited at game over, so nothing depends on it earlier.
    runIdPromiseRef.current = new Promise<string | null>((resolve) => {
      setTimeout(() => { void startTournamentRun(activeTid).then(resolve).catch(() => resolve(null)); }, 400);
    });
  }, [activeTid]);

  
  const handleGameOver = useCallback(async (score: number) => {
    scoreRef.current = score;
    setBestScore((prev) => {
      const newBest = Math.max(prev, score);
      try { localStorage.setItem(BEST_KEY, String(newBest)); } catch { /* ignore */ }
      return newBest;
    });

    if (!activeTid) return;

    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      toast.info(
        lang === "ar" 
          ? "💡 سجل دخولك إلى حسابتك لتسجيل نقاطك في ليدر بورد البطولة!" 
          : "💡 Sign in to record your scores in the tournament leaderboard!"
      );
      return;
    }

    // Read previous standing
    const prevData = await readTournamentStanding(activeTid);
    const prevRank = prevData?.rank ?? null;

    const runId = runIdPromiseRef.current ? await runIdPromiseRef.current : null;
    if (!runId) {
      console.error("No run_id available for score submission.");
      return;
    }

    // Step 2: Submit the score with the run_id
    const { data: subData, error: subErr } = await supabase.rpc("submit_tournament_score", { 
      _tournament_id: activeTid, 
      _score: score,
      _run_id: runId
    });
    const subResult = subData as { ok?: boolean; error?: string; best?: number } | null;
    
    if (subErr || !subResult?.ok) {
      const reason = subResult?.error ?? subErr?.message ?? "unknown";
      console.error("submit_tournament_score failed:", reason, subErr);
      if (reason === "run_too_short") {
        // Game was too short — silently ignore (user played less than 5s)
        return;
      }

      // Fallback: If database constraint error or RPC issue occurs, save via server function
      try {
        const { submitTournamentScoreServer } = await import("@/lib/gx/tournaments.server");
        const fallbackRes = await submitTournamentScoreServer({
          data: { tournamentId: activeTid, runId, score }
        });
        if (!fallbackRes.ok) {
          toast.error(lang === "ar" ? `خطأ في السكور: ${reason}` : `Score error: ${reason}`);
          return;
        }
      } catch (fbErr) {
        console.error("Fallback score submission failed:", fbErr);
        toast.error(lang === "ar" ? `خطأ في السكور: ${reason}` : `Score error: ${reason}`);
        return;
      }
    }

    // Invalidate query caches to refresh leaderboard in UI immediately
    queryClient.invalidateQueries({ queryKey: ["flippy-current-leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["flippy-alltime-leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["my-tournament-standing"] });

    // Read new standing
    const afterData = await readTournamentStanding(activeTid);
    const newRank = afterData?.rank ?? null;

    setArenaRank({
      rank: newRank,
      total: afterData?.total ?? null,
      delta: prevRank && newRank ? prevRank - newRank : null,
    });
  }, [activeTid, lang, queryClient]);

  const toggleSound = () => {
    const muted = flippyAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <StoreShell bare>
      <main dir={dir} className="h-[100dvh] w-full bg-[#050608] relative flex flex-col justify-between overflow-hidden p-0 items-center">
        
        {/* Glow ambient background effect — painted as a radial-gradient
            rather than a solid disc behind a `blur-[120px]` filter. A blur
            that large forces the browser to allocate a big offscreen buffer
            and run a multi-pass blur for it, which is real memory and raster
            cost on a phone, for a glow that the opaque game canvas covers
            almost entirely anyway. The gradient is visually equivalent and
            free. */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[800px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(147,51,234,0.10), rgba(147,51,234,0))" }}
        />
        
        {/* Main Canvas Container */}
        <div className="relative z-10 w-full h-full max-w-[600px] flex flex-col items-center justify-center p-0 mx-auto">
          <div className="relative w-full h-full rounded-none border-0 bg-black flex items-center justify-center overflow-hidden">
            <FlippyCanvas 
              onGameStart={handleGameStart}
              onGameOver={handleGameOver} 
              bestScore={displayBestScore}
              arenaRank={arenaRank}
              activeTid={activeTid}
            />
          </div>
        </div>

      </main>
    </StoreShell>
  );
}

