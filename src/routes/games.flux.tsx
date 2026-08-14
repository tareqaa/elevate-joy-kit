import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { FluxCanvas } from "@/components/gx/games/FluxCanvas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/gx/i18n";
import { toast } from "sonner";
import { resolveActiveTournamentId, startTournamentRun, readTournamentStanding } from "@/lib/gx/games/use-tournament-run";

export const Route = createFileRoute("/games/flux")({
  validateSearch: (s: Record<string, unknown>): { t?: string; practice?: boolean } => {
    const out: { t?: string; practice?: boolean } = {};
    if (typeof s.t === "string" && s.t) out.t = s.t;
    if (s.practice === "1" || s.practice === true || s.practice === "true") out.practice = true;
    return out;
  },
  head: () => ({
    meta: [
      { title: "GX Flux 3D — لعبة رد الفعل ثلاثية الأبعاد" },
      { name: "description", content: "اندفع بسرعة فائقة وطابق ألوان بوابات النيون في لعبة الأركيد ثلاثية الأبعاد GX Flux." },
      { property: "og:title", content: "GX Flux 3D" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: FluxPage,
});

const BEST_KEY = "gx_flux_best";

function FluxPage() {
  const queryClient = useQueryClient();
  const { t: tournamentId, practice } = Route.useSearch();
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    try {
      setBestScore(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const [arenaRank, setArenaRank] = useState<{ rank: number | null; total: number | null } | null>(null);
  const { dir, lang } = useLang();
  
  const runIdPromiseRef = useRef<Promise<string | null> | null>(null);
  const scoreRef = useRef<number>(0);
  
  const activeTidQ = useQuery({
    queryKey: ["active-tournament", "gx-flux", tournamentId, practice],
    queryFn: () => resolveActiveTournamentId(tournamentId ?? null, ["gx-flux", "flux"]),
    enabled: !practice,
  });

  const activeTid = practice ? null : (activeTidQ.data ?? null);

  const myStandingQ = useQuery({
    queryKey: ["my-tournament-standing", activeTid],
    queryFn: () => (activeTid ? readTournamentStanding(activeTid) : Promise.resolve(null)),
    enabled: !!activeTid,
  });

  const tournamentBestScore = myStandingQ.data?.score || 0;
  const displayBestScore = activeTid ? Math.max(tournamentBestScore, scoreRef.current || 0) : bestScore;

  const handleGameStart = useCallback(() => {
    if (!activeTid) {
      runIdPromiseRef.current = Promise.resolve(null);
      return;
    }
    runIdPromiseRef.current = startTournamentRun(activeTid);
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
          ? "💡 سجل دخولك لتسجيل نقاطك في ليدر بورد البطولة!" 
          : "💡 Sign in to record your score in the tournament leaderboard!"
      );
      return;
    }

    const runId = runIdPromiseRef.current ? await runIdPromiseRef.current : null;
    if (!runId) return;

    // Submit the score with the run_id
    const { data: subData, error: subErr } = await supabase.rpc("submit_tournament_score", { 
      _tournament_id: activeTid, 
      _score: score,
      _run_id: runId
    });
    const subResult = subData as { ok?: boolean; error?: string; best?: number } | null;
    
    if (subErr || !subResult?.ok) {
      const reason = subResult?.error ?? subErr?.message ?? "unknown";
      if (reason !== "run_too_short") {
        console.error("submit_tournament_score failed:", reason);
      }
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["my-tournament-standing", activeTid] });
    queryClient.invalidateQueries({ queryKey: ["tournament-leaderboard", activeTid] });

    if (subResult?.best) {
      toast.success(
        lang === "ar"
          ? `🏆 تم تسجيل سكورك الجديد: ${subResult.best}!`
          : `🏆 New best score recorded: ${subResult.best}!`
      );
    }
  }, [activeTid, lang, queryClient]);

  return (
    <StoreShell>
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4" dir={dir}>
        {/* Top Breadcrumb & Title */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Link
              to="/games"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              🎮 {lang === "ar" ? "كل الألعاب" : "All Games"}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-black text-cyan-400">GX FLUX 3D</span>
          </div>

          {practice && (
            <div className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-300">
              {lang === "ar" ? "وضع التدريب" : "PRACTICE MODE"}
            </div>
          )}
        </div>

        {/* 3D Game Canvas Area */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] max-h-[720px] rounded-3xl overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-slate-950">
          <FluxCanvas
            onGameOver={handleGameOver}
            onGameStart={handleGameStart}
            bestScore={displayBestScore}
            arenaRank={arenaRank}
            activeTid={activeTid}
          />
        </div>

        {/* Instructions footer */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>🕹️</span>
            <span>
              <strong className="text-slate-200">
                {lang === "ar" ? "طريقة اللعب:" : "How to play:"}
              </strong>{" "}
              {lang === "ar"
                ? "استخدم مفاتيح الأسهم أو A/D للتحرك بين المسارات الثلاثة، أو اسحب يميناً ويساراً على شاشة اللمس."
                : "Use Arrow Keys or A/D to shift lanes, or swipe left/right on touch screens."}
            </span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <span>✨ {lang === "ar" ? "طابق اللون وانجُ!" : "Match the color & survive!"}</span>
          </div>
        </div>
      </div>
    </StoreShell>
  );
}
