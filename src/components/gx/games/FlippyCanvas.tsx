import { useEffect, useRef, useState, useCallback } from "react";
import { createInitialState, updateEngine, jump, type FlippyState } from "@/lib/gx/games/flippy-engine";
import { FlippyRenderer } from "@/lib/gx/games/flippy-renderer";
import { flippyAudio } from "@/lib/gx/games/flippy-audio";
import { useNavigate } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";

interface FlippyCanvasProps {
  onGameOver: (score: number) => void;
  onGameStart?: () => void;
  bestScore: number;
  arenaRank: { rank: number | null; total: number | null; delta: number | null } | null;
  activeTid: string | null;
}

export function FlippyCanvas({ onGameOver, onGameStart, bestScore, arenaRank, activeTid }: FlippyCanvasProps) {
  const { lang, dir, t } = useLang();
  const navigate = useNavigate();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FlippyRenderer | null>(null);
  
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<FlippyState["status"]>("idle");
  const [eventMsg, setEventMsg] = useState<string | null>(null);
  // Mirrors eventMsg for the game loop below, so the active-event transition
  // can be read without putting eventMsg in the loop effect's dependencies
  // (that used to tear down and restart the whole RAF loop on every event).
  const eventMsgRef = useRef<string | null>(null);
  const [isMuted, setIsMuted] = useState(() => flippyAudio.isMuted());
  // The Game Over card mounts a beat after death so the fall/spin on the
  // canvas underneath has room to play out first (see the status-watching
  // effect below) — purely a presentation delay, doesn't touch onGameOver.
  const [showOverCard, setShowOverCard] = useState(false);

  const stateRef = useRef<FlippyState>(createInitialState(600));

  const onGameOverRef = useRef(onGameOver);
  const onGameStartRef = useRef(onGameStart);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onGameStartRef.current = onGameStart;
  }, [onGameOver, onGameStart]);

  useEffect(() => {
    if (status !== "gameover") {
      setShowOverCard(false);
      return;
    }
    const timer = setTimeout(() => setShowOverCard(true), 550);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const updateSize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width <= 0 || height <= 0) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      if (!rendererRef.current) {
        rendererRef.current = new FlippyRenderer(canvasRef.current);
        stateRef.current = createInitialState(height);
      } else {
        rendererRef.current.resize(width, height);
        stateRef.current.groundY = height - 50;
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    let animId = 0;
    let lastStatus = "idle";
    let lastScore = 0;
    // Real elapsed time drives the sim (normalized to "units of one 60fps
    // frame") instead of raw RAF-call count — otherwise the whole game runs
    // faster on higher-refresh-rate displays (120/144Hz), since more calls
    // land per real second. Clamped so resuming a backgrounded tab (RAF
    // pauses while hidden) doesn't apply one huge catch-up step.
    let lastTime = performance.now();

    const loop = (now: number) => {
      const state = stateRef.current;
      const w = canvasRef.current?.width || 400;
      const h = canvasRef.current?.height || 600;
      const dt = Math.min(3, Math.max(0, (now - lastTime) / (1000 / 60)));
      lastTime = now;

      updateEngine(state, w, h, dt);
      rendererRef.current?.render(state, dt);

      if (state.score !== lastScore) {
        lastScore = state.score;
        setScore(state.score);
      }
      
      if (state.status !== lastStatus) {
        lastStatus = state.status;
        setStatus(state.status);
        if (state.status === "playing") {
          onGameStartRef.current?.();
        }
        if (state.status === "gameover") {
          onGameOverRef.current?.(state.score);
        }
      }

      if (state.activeEvent && !eventMsgRef.current) {
        eventMsgRef.current = `EVENT: ${state.activeEvent.toUpperCase()}`;
        setEventMsg(eventMsgRef.current);
      } else if (!state.activeEvent && eventMsgRef.current) {
        eventMsgRef.current = null;
        setEventMsg(null);
      }

      animId = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleInput = useCallback((e?: React.SyntheticEvent | KeyboardEvent) => {
    if (e) {
      if (e.type === "keydown" && (e as KeyboardEvent).code !== "Space") return;
      e.preventDefault();
    }
    
    if (stateRef.current.status === "gameover") {
      const h = canvasRef.current?.height || 600;
      stateRef.current = createInitialState(h);
      setScore(0);
      setStatus("idle");
      setEventMsg(null);
      return;
    }
    
    jump(stateRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => handleInput(e);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleInput]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = flippyAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full border-0 shadow-2xl overflow-hidden cursor-pointer bg-slate-950 flex flex-col justify-between select-none"
      onPointerDown={handleInput}
      style={{ touchAction: "none" }}
      dir={dir}
    >
      <canvas 
        ref={canvasRef}
        className="block w-full h-full bg-slate-900"
      />
      
      {/* ─── TOP BAR HUD (Hidden during gameplay) ─── */}
      {status !== "playing" && (
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-auto z-20">
          {/* Sound button */}
          <div className="flex items-center bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-white">
            <button 
              onClick={toggleSound}
              className="hover:scale-110 active:scale-95 transition-transform text-lg"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>

          {/* Tournament High Score */}
          <div className="flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 shadow-lg text-center">
              <span className="block text-sm font-black text-amber-400 leading-none">{bestScore}</span>
              <span className="block text-[9px] font-extrabold text-slate-300 tracking-wider">
                {activeTid 
                  ? (lang === "ar" ? "أعلى نتيجة لك في البطولة" : "YOUR TOURNAMENT BEST") 
                  : (lang === "ar" ? "أعلى نتيجة لك" : "YOUR PERSONAL BEST")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── PLAYING SCORE HUD ─── */}
      {status === "playing" && (
        <div className="absolute top-16 w-full flex justify-center pointer-events-none z-10">
          <span 
            className="text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-wider" 
            style={{ WebkitTextStroke: "2px black" }}
          >
            {score}
          </span>
        </div>
      )}

      {/* ─── EVENT MSG ─── */}
      {eventMsg && (
        <div className="absolute top-28 w-full flex justify-center pointer-events-none animate-pulse z-10">
          <span className="px-4 py-1.5 bg-red-600/90 rounded-full text-white font-bold tracking-wider text-sm shadow-lg border border-red-400">
            {eventMsg}
          </span>
        </div>
      )}

      {/* ─── START SCREEN ─── */}
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div className="flex flex-col items-center space-y-3 animate-pulse mt-32">
            <span className="text-white font-bold text-base bg-black/60 px-6 py-2 rounded-full border border-white/20">
              {lang === "ar" ? "اضغط على الشاشة للبدء" : "TAP TO FLY"}
            </span>
          </div>
        </div>
      )}

      {/* ─── GAME OVER SCREEN ───
          Mounts on `showOverCard` (not directly on status) so the death
          fall/spin on the canvas underneath gets a clear beat to play out
          before the UI covers it — see the delayed-mount effect above. */}
      {showOverCard && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300 z-30"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-sm bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.85)] text-center animate-in fade-in zoom-in-90 duration-300"
            dir={dir}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
              {lang === "ar" ? "انتهت اللعبة" : "GAME OVER"}
            </h2>

            {/* Score — the single most prominent number on the screen */}
            <div className="mt-4">
              <span className="block text-xs font-black tracking-wider uppercase text-slate-400">
                {lang === "ar" ? "النتيجة" : "SCORE"}
              </span>
              <span className="block text-6xl font-black text-amber-400 tracking-tight drop-shadow-[0_0_16px_rgba(251,191,36,0.35)]">
                {score}
              </span>
            </div>

            {/* Tournament rank — the main focus of this screen, but only
                when there's an actual tournament to rank in (not practice
                mode, not when nothing is live). */}
            {activeTid && (
              <div className="mt-5 bg-slate-950/80 border border-cyan-500/25 rounded-2xl p-4">
                {arenaRank?.rank ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl" aria-hidden>
                        {arenaRank.rank === 1 ? "🥇" : arenaRank.rank === 2 ? "🥈" : arenaRank.rank === 3 ? "🥉" : "🏅"}
                      </span>
                      <span className="text-4xl font-black text-cyan-300 tracking-tight">#{arenaRank.rank}</span>
                    </div>
                    {arenaRank.total ? (
                      <span className="block mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {lang === "ar" ? `من ${arenaRank.total} لاعب` : `of ${arenaRank.total} players`}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="block text-sm font-bold text-slate-400">
                    {lang === "ar" ? "سجّل نقاطًا لتدخل الترتيب" : "Score points to enter the ranking"}
                  </span>
                )}
              </div>
            )}

            {/* Best score — secondary stat, only when there is one */}
            {bestScore > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm">
                <span className="text-amber-400" aria-hidden>🏆</span>
                <span className="font-bold text-slate-400">
                  {activeTid
                    ? (lang === "ar" ? "أفضل نتيجة في البطولة:" : "Tournament best:")
                    : (lang === "ar" ? "أفضل نتيجة شخصية:" : "Personal best:")}
                </span>
                <span className="font-black text-emerald-400">{bestScore}</span>
              </div>
            )}

            {/* Buttons — primary takes you back to the tournament (or the
                games hub, in practice mode / when nothing is live), secondary replays */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  flippyAudio.playClick();
                  if (activeTid) navigate({ to: "/games/t/$id", params: { id: activeTid } });
                  else navigate({ to: "/games" });
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_4px_20px_rgba(34,211,238,0.35)] border border-cyan-400/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span aria-hidden>{activeTid ? "🏆" : "🎮"}</span>
                <span>
                  {activeTid
                    ? (lang === "ar" ? "العودة للبطولة" : "BACK TO TOURNAMENT")
                    : (lang === "ar" ? "العودة للألعاب" : "BACK TO GAMES")}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  flippyAudio.playClick();
                  handleInput();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full py-3 bg-slate-950/60 hover:bg-slate-800 text-slate-200 font-extrabold text-sm rounded-xl border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span aria-hidden>🔄</span>
                <span>{lang === "ar" ? "إعادة اللعب" : "PLAY AGAIN"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

