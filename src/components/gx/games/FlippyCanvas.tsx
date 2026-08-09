import { useEffect, useRef, useState, useCallback } from "react";
import { createInitialState, updateEngine, jump, type FlippyState, type FlippyEventType } from "@/lib/gx/games/flippy-engine";
import { FlippyRenderer } from "@/lib/gx/games/flippy-renderer";
import { flippyAudio } from "@/lib/gx/games/flippy-audio";
import { useNavigate } from "@tanstack/react-router";
import { useLang } from "@/lib/gx/i18n";

// Visual identity for each event — used for both the pop-in announcement
// and the small persistent HUD chip while the event is active.
const EVENT_META: Record<FlippyEventType, {
  icon: string;
  label: string;
  labelAr: string;
  chipLabel: string;
  chipLabelAr: string;
  gradient: string;
  ring: string;
  glow: string;
}> = {
  storm: {
    icon: "⚡",
    label: "STORM",
    labelAr: "عاصفة",
    chipLabel: "Storm",
    chipLabelAr: "عاصفة",
    gradient: "from-slate-700 via-indigo-800 to-slate-900",
    ring: "border-indigo-400/50",
    glow: "shadow-[0_0_24px_rgba(129,140,248,0.45)]",
  },
  speedup: {
    icon: "🚀",
    label: "SPEED UP",
    labelAr: "تسارع",
    chipLabel: "Speed Up",
    chipLabelAr: "تسارع",
    gradient: "from-sky-500 via-cyan-500 to-blue-600",
    ring: "border-cyan-300/60",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.5)]",
  },
  turbulence: {
    icon: "🌀",
    label: "TURBULENCE",
    labelAr: "اضطراب",
    chipLabel: "Turbulence",
    chipLabelAr: "اضطراب",
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    ring: "border-slate-300/50",
    glow: "shadow-[0_0_20px_rgba(203,213,225,0.4)]",
  },
  portal: {
    icon: "🌌",
    label: "PORTAL",
    labelAr: "بوابة",
    chipLabel: "Portal",
    chipLabelAr: "بوابة",
    gradient: "from-fuchsia-600 via-purple-600 to-cyan-500",
    ring: "border-fuchsia-300/60",
    glow: "shadow-[0_0_28px_rgba(217,70,239,0.55)]",
  },
};

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

  // Mirrors state.activeEvent — drives the small persistent HUD chip.
  const [activeEvent, setActiveEvent] = useState<FlippyEventType | null>(null);
  const activeEventRef = useRef<FlippyEventType | null>(null);
  // Which event the pop-in announcement is currently showing/animating, and
  // which phase it's in ("in" while popping in and holding, "out" while
  // fading away). Separate from activeEvent so the announcement can finish
  // its own short lifetime independently of how long the event itself runs.
  const [announcedEvent, setAnnouncedEvent] = useState<FlippyEventType | null>(null);
  const [announcePhase, setAnnouncePhase] = useState<"in" | "out">("in");
  const lastEventSeqRef = useRef(0);
  const announceTimersRef = useRef<{ out?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({});
  const [isMuted, setIsMuted] = useState(() => flippyAudio.isMuted());
  // The Game Over card mounts a beat after death so the fall/spin on the
  // canvas underneath has room to play out first (see the status-watching
  // effect below) — purely a presentation delay, doesn't touch onGameOver.
  const [showOverCard, setShowOverCard] = useState(false);

  const stateRef = useRef<FlippyState>(createInitialState(600));
  // Logical (CSS-pixel) canvas size — see the comment in updateSize().
  const sizeRef = useRef({ width: 400, height: 600 });

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

      // Logical (CSS-pixel) game-space size, tracked separately from the
      // canvas element's own width/height attributes — the renderer now
      // sizes those to the display's devicePixelRatio for a sharp image,
      // so they no longer match the coordinate space physics/drawing use.
      sizeRef.current = { width, height };

      if (!rendererRef.current) {
        rendererRef.current = new FlippyRenderer(canvasRef.current, width, height);
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
      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
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

      if (state.activeEvent !== activeEventRef.current) {
        activeEventRef.current = state.activeEvent;
        setActiveEvent(state.activeEvent);
      }

      // eventSeq only bumps when a genuinely NEW event is chosen (even a
      // repeat of the same type), so this reliably re-fires the
      // announcement every time instead of only on activeEvent identity
      // changes.
      if (state.eventSeq !== lastEventSeqRef.current) {
        lastEventSeqRef.current = state.eventSeq;
        if (state.activeEvent) {
          clearTimeout(announceTimersRef.current.out);
          clearTimeout(announceTimersRef.current.hide);
          setAnnouncedEvent(state.activeEvent);
          setAnnouncePhase("in");
          announceTimersRef.current.out = setTimeout(() => setAnnouncePhase("out"), 1500);
          announceTimersRef.current.hide = setTimeout(() => setAnnouncedEvent(null), 1500 + 320);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", updateSize);
      clearTimeout(announceTimersRef.current.out);
      clearTimeout(announceTimersRef.current.hide);
    };
  }, []);

  const handleInput = useCallback((e?: React.SyntheticEvent | KeyboardEvent) => {
    if (e) {
      if (e.type === "keydown" && (e as KeyboardEvent).code !== "Space") return;
      e.preventDefault();
    }
    
    if (stateRef.current.status === "gameover") {
      stateRef.current = createInitialState(sizeRef.current.height);
      setScore(0);
      setStatus("idle");
      activeEventRef.current = null;
      setActiveEvent(null);
      lastEventSeqRef.current = 0;
      clearTimeout(announceTimersRef.current.out);
      clearTimeout(announceTimersRef.current.hide);
      setAnnouncedEvent(null);
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
          <div
            className="flex items-center bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg text-white"
            onPointerDown={(e) => e.stopPropagation()}
          >
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
            className="text-6xl font-black text-white tracking-wider"
            style={{
              // A faux stroke + drop shadow built entirely from text-shadow,
              // not `-webkit-text-stroke` + `filter: drop-shadow(...)`.
              // Safari renders that combination as a solid black box behind
              // the digits instead of an outline — most visible right after
              // a tab-visibility change forces a repaint — because the
              // stroke and the filter fight over the same compositing
              // layer. text-shadow alone doesn't trigger it and looks the
              // same everywhere.
              textShadow:
                "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 8px rgba(0,0,0,0.8)",
            }}
          >
            {score}
          </span>
        </div>
      )}

      {/* ─── EVENT ANNOUNCEMENT (phase 1) ───
          Pops in with icon + label when a new event starts, holds briefly,
          then fades out on its own — never blocks input (pointer-events-none)
          and sits below the score so it never covers the pipes. */}
      {announcedEvent && status === "playing" && (
        <div className="absolute top-36 w-full flex justify-center pointer-events-none z-20">
          <div
            key={lastEventSeqRef.current}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border backdrop-blur-md bg-gradient-to-r ${EVENT_META[announcedEvent].gradient} ${EVENT_META[announcedEvent].ring} ${EVENT_META[announcedEvent].glow} ${
              announcePhase === "in"
                ? "animate-in fade-in zoom-in-75 slide-in-from-top-3 duration-300"
                : "animate-out fade-out zoom-out-90 slide-out-to-top-3 duration-300"
            }`}
          >
            <span className="text-2xl leading-none drop-shadow" aria-hidden>
              {EVENT_META[announcedEvent].icon}
            </span>
            <span className="text-white font-black tracking-widest text-base drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              {lang === "ar" ? EVENT_META[announcedEvent].labelAr : EVENT_META[announcedEvent].label}
            </span>
          </div>
        </div>
      )}

      {/* ─── EVENT INDICATOR (phase 2) ───
          Small persistent chip while the event is active — integrated into
          the same corner language as the idle-state HUD chips, but visible
          during play instead. */}
      {activeEvent && status === "playing" && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md bg-black/50 shadow-lg ${EVENT_META[activeEvent].ring}`}>
            <span className="text-sm leading-none" aria-hidden>{EVENT_META[activeEvent].icon}</span>
            <span className="text-[10px] font-extrabold text-white tracking-wide uppercase">
              {lang === "ar" ? EVENT_META[activeEvent].chipLabelAr : EVENT_META[activeEvent].chipLabel}
            </span>
          </div>
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

