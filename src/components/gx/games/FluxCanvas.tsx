import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Sparkles, Zap, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import {
  createInitialFluxState,
  updateFluxEngine,
  shiftLane,
  setDirectLane,
  calculatePhase,
} from "@/lib/gx/games/flux-engine";
import { FluxRenderer } from "@/lib/gx/games/flux-renderer";
import { fluxAudio } from "@/lib/gx/games/flux-audio";
import { FLUX_COLORS, type FluxState, type FluxColor } from "@/lib/gx/games/flux-types";
import { useLang } from "@/lib/gx/i18n";

interface FluxCanvasProps {
  onGameOver: (score: number) => void;
  onGameStart?: () => void;
  bestScore: number;
  arenaRank?: { rank: number | null; total: number | null } | null;
  activeTid?: string | null;
}

export function FluxCanvas({
  onGameOver,
  onGameStart,
  bestScore,
  arenaRank,
  activeTid,
}: FluxCanvasProps) {
  const { lang, dir } = useLang();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<FluxRenderer | null>(null);
  const stateRef = useRef<FluxState>(createInitialFluxState());

  // Fast direct DOM refs for HUD elements (prevents React component re-rendering during 60/120fps flight!)
  const scoreTextRef = useRef<HTMLSpanElement>(null);
  const comboTextRef = useRef<HTMLSpanElement>(null);
  const comboBadgeRef = useRef<HTMLDivElement>(null);
  const colorBadgeRef = useRef<HTMLDivElement>(null);
  const colorNameRef = useRef<HTMLSpanElement>(null);

  const [status, setStatus] = useState<FluxState["status"]>("idle");
  const [score, setScore] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isMuted, setIsMuted] = useState(() => fluxAudio.isMuted());
  const [showGameOverCard, setShowGameOverCard] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<Array<{ id: string; text: string; color: string }>>([]);

  const onGameOverRef = useRef(onGameOver);
  const onGameStartRef = useRef(onGameStart);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onGameStartRef.current = onGameStart;
  }, [onGameOver, onGameStart]);

  // Touch Swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const restartGame = useCallback(() => {
    stateRef.current = createInitialFluxState();
    setScore(0);
    setMaxCombo(0);
    setStatus("idle");
    setShowGameOverCard(false);
    setFloatingTexts([]);

    if (scoreTextRef.current) scoreTextRef.current.textContent = "0";
    if (comboTextRef.current) comboTextRef.current.textContent = "0x";
    if (comboBadgeRef.current) comboBadgeRef.current.style.opacity = "0";
    if (colorBadgeRef.current) {
      colorBadgeRef.current.style.borderColor = FLUX_COLORS.cyan.hex;
      colorBadgeRef.current.style.boxShadow = `0 0 20px ${FLUX_COLORS.cyan.glowHex}`;
    }
    if (colorNameRef.current) {
      colorNameRef.current.textContent = lang === "ar" ? FLUX_COLORS.cyan.nameAr : FLUX_COLORS.cyan.nameEn;
    }
  }, [lang]);

  const handleShift = useCallback((dir: -1 | 1) => {
    const state = stateRef.current;
    if (state.status === "idle") {
      state.status = "playing";
      setStatus("playing");
      onGameStartRef.current?.();
    }
    if (state.status === "playing") {
      const shifted = shiftLane(state, dir);
      if (shifted) {
        fluxAudio.playLaneShift(dir);
      }
    }
  }, []);

  // Mount 3D Three.js Renderer & Game Loop
  useEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width) || window.innerWidth;
    const height = Math.floor(rect.height) || window.innerHeight;

    const renderer = new FluxRenderer(containerRef.current, width, height);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      rendererRef.current.resize(Math.floor(r.width), Math.floor(r.height));
    };

    window.addEventListener("resize", handleResize);

    let animId = 0;
    let lastTime = performance.now();
    let lastStatus: FluxState["status"] = "idle";
    let lastScore = 0;
    let lastCombo = 0;
    let lastColor: FluxColor = "cyan";

    const loop = (now: number) => {
      const elapsedMs = now - lastTime;
      lastTime = now;

      // Normalization: 1.0 = 16.667ms (60 FPS base)
      const dt = Math.min(0.06, Math.max(0.001, elapsedMs / 1000));
      const state = stateRef.current;

      // 1. Advance engine physics
      const { events } = updateFluxEngine(state, dt);

      // 2. Process audio & particle events
      events.forEach((ev) => {
        if (ev.type === "pass") {
          if (ev.perfect) {
            fluxAudio.playPerfectPass(ev.combo);
            rendererRef.current?.triggerPassSparks(state.playerLane * 3.4, state.playerColor, true);
          } else {
            fluxAudio.playGatePass(ev.combo);
            rendererRef.current?.triggerPassSparks(state.playerLane * 3.4, state.playerColor, false);
          }
        } else if (ev.type === "color_change") {
          fluxAudio.playColorShift();
        } else if (ev.type === "crash") {
          fluxAudio.playCrash();
          rendererRef.current?.triggerCrashExplosion(ev.position, state.playerColor);
        }
      });

      // 3. Render 3D Scene
      rendererRef.current?.render(state, dt);

      // 4. Zero-overhead direct DOM HUD updates
      if (state.score !== lastScore) {
        lastScore = state.score;
        if (scoreTextRef.current) {
          scoreTextRef.current.textContent = String(state.score);
        }
      }

      if (state.combo !== lastCombo) {
        lastCombo = state.combo;
        if (comboTextRef.current) {
          comboTextRef.current.textContent = `${state.combo}x`;
        }
        if (comboBadgeRef.current) {
          comboBadgeRef.current.style.opacity = state.combo > 1 ? "1" : "0";
          comboBadgeRef.current.style.transform = state.combo > 5 ? "scale(1.1)" : "scale(1)";
        }
      }

      if (state.playerColor !== lastColor) {
        lastColor = state.playerColor;
        const colorDef = FLUX_COLORS[state.playerColor];
        if (colorBadgeRef.current) {
          colorBadgeRef.current.style.borderColor = colorDef.hex;
          colorBadgeRef.current.style.boxShadow = `0 0 24px ${colorDef.glowHex}`;
        }
        if (colorNameRef.current) {
          colorNameRef.current.textContent = lang === "ar" ? colorDef.nameAr : colorDef.nameEn;
        }
      }

      // 5. Sync floating texts
      if (state.feedbacks.length > 0) {
        setFloatingTexts(
          state.feedbacks.map((f) => ({
            id: f.id,
            text: f.text,
            color: f.color,
          }))
        );
      } else {
        setFloatingTexts([]);
      }

      // 6. Handle Game Status Change
      if (state.status !== lastStatus) {
        lastStatus = state.status;
        setStatus(state.status);
        if (state.status === "gameover") {
          setScore(state.score);
          setMaxCombo(state.maxCombo);
          setTimeout(() => setShowGameOverCard(true), 350);
          onGameOverRef.current?.(state.score);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.dispose();
    };
  }, [lang]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        handleShift(-1);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        handleShift(1);
      } else if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (stateRef.current.status === "idle") {
          handleShift(0 as any);
        } else if (stateRef.current.status === "gameover") {
          restartGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShift, restartGame]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartXRef.current;
    const dy = t.clientY - touchStartYRef.current;

    // Minimum swipe threshold
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleShift(-1); // Swipe Left
      } else {
        handleShift(1); // Swipe Right
      }
    } else {
      // Tap on left or right half of the screen
      const screenW = window.innerWidth;
      if (t.clientX < screenW * 0.42) {
        handleShift(-1);
      } else if (t.clientX > screenW * 0.58) {
        handleShift(1);
      } else {
        // Tap center -> start game if idle
        if (stateRef.current.status === "idle") {
          stateRef.current.status = "playing";
          setStatus("playing");
          onGameStartRef.current?.();
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(fluxAudio.toggleMute());
  };

  return (
    <div
      className="relative w-full h-full min-h-[560px] bg-slate-950 select-none overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (stateRef.current.status === "idle") {
          stateRef.current.status = "playing";
          setStatus("playing");
          onGameStartRef.current?.();
        }
      }}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* ─── TOP ARCADE HUD ─── */}
      <div className="absolute top-4 inset-x-4 flex items-start justify-between pointer-events-none z-20">
        {/* Left: Active Color Requirement */}
        <div
          ref={colorBadgeRef}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-current animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {lang === "ar" ? "اللون المطلوب" : "MATCH COLOR"}
            </span>
            <span ref={colorNameRef} className="text-sm font-black text-white tracking-wider">
              {lang === "ar" ? FLUX_COLORS.cyan.nameAr : FLUX_COLORS.cyan.nameEn}
            </span>
          </div>
        </div>

        {/* Center: Live Score & Combo */}
        <div className="flex flex-col items-center">
          <span
            ref={scoreTextRef}
            className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] font-mono"
          >
            0
          </span>
          <div
            ref={comboBadgeRef}
            className="opacity-0 transition-opacity duration-200 mt-0.5 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full shadow-lg"
          >
            <Zap size={13} className="fill-current" />
            <span ref={comboTextRef}>0x</span>
          </div>
        </div>

        {/* Right: Best Score & Mute Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-sm border border-slate-800 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {lang === "ar" ? "أفضل نتيجة" : "BEST"}
            </span>
            <span className="text-sm font-black text-amber-400 font-mono">{bestScore}</span>
          </div>
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-transform active:scale-90"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* ─── FLOATING PERFECT FEEDBACKS ─── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {floatingTexts.map((f) => (
          <div
            key={f.id}
            className="animate-in fade-in zoom-in-75 duration-200 text-3xl sm:text-4xl font-black tracking-wider uppercase drop-shadow-[0_0_15px_currentColor]"
            style={{ color: f.color }}
          >
            {f.text}
          </div>
        ))}
      </div>

      {/* ─── TOUCH TAP CONTROL HINTS (Mobile) ─── */}
      {status === "playing" && (
        <div className="absolute inset-x-0 bottom-4 flex justify-between px-6 pointer-events-none sm:hidden z-10 opacity-40">
          <div className="flex items-center gap-1 text-slate-400 font-bold text-xs bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-700">
            <ChevronLeft size={16} /> {lang === "ar" ? "يسار" : "LEFT"}
          </div>
          <div className="flex items-center gap-1 text-slate-400 font-bold text-xs bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-700">
            {lang === "ar" ? "يمين" : "RIGHT"} <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* ─── IDLE START OVERLAY ─── */}
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 p-6">
          <div className="flex flex-col items-center gap-3 bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 p-8 rounded-3xl shadow-[0_0_60px_rgba(0,240,255,0.25)] text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)] animate-bounce">
              <Sparkles size={26} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 tracking-wider">
              GX FLUX
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
              {lang === "ar"
                ? "طابق لون مكعبك مع بوابة المسار الصحيح للمرور والنجاة!"
                : "Match your cube's color to the correct lane gate to pass through!"}
            </p>
            <div className="mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm tracking-wide shadow-lg animate-pulse">
              {lang === "ar" ? "اضغط أو اسحب للبدء" : "TAP OR SWIPE TO PLAY"}
            </div>
          </div>
        </div>
      )}

      {/* ─── GAME OVER MODAL ─── */}
      {showGameOverCard && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 pointer-events-auto z-40 animate-in fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-sm bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-[0_0_70px_rgba(0,0,0,0.9)] text-center animate-in zoom-in-95 duration-200"
            dir={dir}
          >
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 tracking-widest uppercase">
              {lang === "ar" ? "تحطّم المكعب!" : "CRASHED!"}
            </h2>

            {/* Score Showcase */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                {lang === "ar" ? "النتيجة النهائية" : "FINAL SCORE"}
              </span>
              <span className="block text-5xl font-black text-amber-400 font-mono mt-1 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                {score}
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">
                  {lang === "ar" ? "أعلى كومبو" : "MAX COMBO"}
                </span>
                <span className="block text-xl font-black text-sky-300 font-mono">{maxCombo}x</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">
                  {lang === "ar" ? "أفضل سكور" : "BEST SCORE"}
                </span>
                <span className="block text-xl font-black text-emerald-300 font-mono">
                  {Math.max(score, bestScore)}
                </span>
              </div>
            </div>

            {/* Play Again Button */}
            <button
              onClick={restartGame}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-cyan-500/25 transition-transform active:scale-95"
            >
              <RotateCcw size={18} />
              {lang === "ar" ? "العب مرة أخرى" : "PLAY AGAIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
