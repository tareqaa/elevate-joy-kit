import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Pause, Play, Zap, Sparkles, Info, LogOut, MousePointerClick } from "lucide-react";
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
  // Explicit Performance/Quality choice from the top-corner toggle — ref so
  // the persistent RAF-loop closure can read the latest value without
  // restructuring its effect's dependencies (same pattern as
  // onGameOverRef), state so the toggle UI can show the current pick.
  // Defaults to "performance": most reports of lag are from weaker
  // devices, so the safe default is maximum smoothness, with Quality as an
  // opt-in for anyone who wants sharper visuals and has the headroom.
  const [qualityMode, setQualityMode] = useState<"performance" | "quality">("performance");
  const qualityModeRef = useRef<"performance" | "quality">("performance");
  // Brief dismissible notice shown when switching to Quality mode, warning
  // it may cost smoothness — auto-hides itself; see toggleQualityMode().
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const qualityWarningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(() => flippyAudio.isMuted());
  // Pause is purely a presentational/RAF-loop concern — engine state stays
  // "playing" the whole time, the loop just stops calling updateEngine/
  // render while paused (see the loop below), so nothing about the physics
  // or collision code needs to know pausing exists.
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
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
        rendererRef.current.setQualityMode(qualityModeRef.current);
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
    // Render-rate cap: the canvas draw is CPU work (dozens of gradient
    // allocations and shadowBlur calls per frame — canvas 2D isn't
    // GPU-accelerated the way WebGL/real games are), and requestAnimationFrame
    // fires once per display refresh with no built-in cap. On a 60Hz screen
    // that's already ~60 redraws/sec; on a 120/144/240Hz gaming monitor
    // (exactly what tends to pair with a strong GPU) it's 2-4x that many
    // redraws per second for a scene that looks identical either way — pure
    // wasted CPU work that reads as lag regardless of GPU strength. Capping
    // the redraw itself to ~60fps is a no-op on any normal 60Hz display
    // (frames never arrive faster than the target interval to begin with)
    // and only skips the redundant extra redraws on faster screens; physics
    // (dt) stays exactly as accurate since skipped frames' elapsed time
    // just carries over into the next actual update.
    const TARGET_FRAME_MS = 1000 / 60;
    let lastRenderTime = performance.now();
    // Adaptive render quality: a fixed DPR cap can't be both sharp and
    // smooth on every device — weaker ones just can't push as many pixels.
    // Sampling *dt* (the gap between frames) was the wrong signal: rAF is
    // capped by the display, so dt reads ~16.7ms on a device that is only
    // barely keeping up as well as on one with tons of headroom, and the
    // check almost never tripped — which is why phones still felt heavy.
    // Instead, measure how long the update+draw itself actually takes. A
    // frame has ~16.7ms of budget; if the draw alone routinely eats most of
    // it, the device has no slack for the browser's own compositing and the
    // result reads as stutter, so drop to the cheap render path.
    let qualityChecked = false;
    const workMsSamples: number[] = [];


    const loop = (now: number) => {
      // Paused: skip physics and drawing entirely (the last rendered frame
      // just stays on screen under the pause overlay) — but keep updating
      // the clocks every tick so a long pause doesn't show up as one huge
      // dt/render-gap jump the moment play resumes.
      if (isPausedRef.current) {
        lastTime = now;
        lastRenderTime = now;
        animId = requestAnimationFrame(loop);
        return;
      }

      // 90% tolerance avoids a naive-throttle trap: on a native 60Hz screen
      // rAF intervals jitter slightly below the exact 16.667ms target, and
      // a strict >= check would drop every other frame (effectively 30fps)
      // chasing timer precision that doesn't exist. This still comfortably
      // skips extra frames on 120Hz+ displays.
      if (now - lastRenderTime < TARGET_FRAME_MS * 0.9) {
        animId = requestAnimationFrame(loop);
        return;
      }
      lastRenderTime = now;

      const state = stateRef.current;
      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
      const dt = Math.min(3, Math.max(0, (now - lastTime) / (1000 / 60)));
      lastTime = now;

      const workStart = performance.now();
      updateEngine(state, w, h, dt);
      rendererRef.current?.render(state, dt);

      if (!qualityChecked && state.status === "playing") {
        workMsSamples.push(performance.now() - workStart);
        if (workMsSamples.length >= 60) {
          qualityChecked = true;
          const sorted = [...workMsSamples].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          // >11ms of the 16.7ms budget spent drawing = no slack left.
          if (median > 11) rendererRef.current?.downgradeQuality();
        }
      }


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
      stateRef.current = createInitialState(sizeRef.current.height);
      setScore(0);
      setStatus("idle");
      isPausedRef.current = false;
      setIsPaused(false);
      return;
    }

    jump(stateRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => handleInput(e);
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleInput]);

  const pauseGame = useCallback(() => {
    if (stateRef.current.status !== "playing" || isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  // Switching tabs mid-run now pauses instead of ending the run — same
  // mechanism as the manual pause button. Note: this reopens the "pause to
  // dodge a mistake" concern a previous version closed by ending the run
  // on tab-hide instead; that tradeoff was made deliberately here in favor
  // of not punishing accidental tab switches. Only pausing (never
  // resuming) on visibility change, so coming back always lands on the
  // pause screen rather than instantly resuming physics.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pauseGame();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pauseGame]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = flippyAudio.toggleMute();
    setIsMuted(muted);
  };

  // Single toggle rather than a two-way picker — tapping always switches to
  // the other mode, which is what a compact top-corner control needs.
  const toggleQualityMode = () => {
    const next = qualityModeRef.current === "performance" ? "quality" : "performance";
    qualityModeRef.current = next;
    setQualityMode(next);
    rendererRef.current?.setQualityMode(next);

    clearTimeout(qualityWarningTimerRef.current);
    if (next === "quality") {
      setShowQualityWarning(true);
      qualityWarningTimerRef.current = setTimeout(() => setShowQualityWarning(false), 4500);
    } else {
      setShowQualityWarning(false);
    }
  };

  useEffect(() => () => clearTimeout(qualityWarningTimerRef.current), []);

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
      
      {/* ─── TOP BAR HUD — always present, not just when idle. The
          Sound and the Performance/Quality toggle are only offered before
          the round starts (idle/game-over) — not reachable mid-run. ─── */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-auto z-20">
        {/* Sound + quality toggle group */}
        {status !== "playing" && (
          <div
            className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg text-white"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={toggleSound}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 active:scale-90 transition-all"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <div className="w-px h-5 bg-white/15" aria-hidden />
            <button
              onClick={toggleQualityMode}
              className={`flex items-center justify-center w-8 h-8 rounded-lg active:scale-90 transition-all ${
                qualityMode === "quality" ? "text-fuchsia-300" : "text-cyan-300"
              } hover:bg-white/10`}
              title={
                qualityMode === "performance"
                  ? (lang === "ar" ? "وضع الأداء (اضغط للتبديل لجودة أعلى)" : "Performance mode (tap for higher quality)")
                  : (lang === "ar" ? "وضع الجودة (اضغط للعودة للأداء)" : "Quality mode (tap to go back to performance)")
              }
            >
              {qualityMode === "performance" ? <Zap size={16} /> : <Sparkles size={16} />}
            </button>
          </div>
        )}

        {status === "playing" ? (
          /* Pause button — replaces the best-score badge while playing.
             Deliberately the one HUD chip WITHOUT backdrop-blur: it is the
             only one on screen while the canvas is repainting every frame,
             and a backdrop-filter over continuously-changing content forces
             the compositor to re-blur that region every single frame. On
             phones that cost showed up as a constant loss of smoothness
             that no amount of canvas-side optimization could recover. The
             other chips (idle/game-over only) sit over a still canvas, so
             they keep the blur. A more opaque solid fill reads the same. */
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              flippyAudio.playClick();
              pauseGame();
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-950/75 border border-white/10 shadow-lg text-white hover:bg-white/10 active:scale-90 transition-all"
            title={lang === "ar" ? "إيقاف مؤقت" : "Pause"}
          >
            <Pause size={17} fill="currentColor" />
          </button>
        ) : (
          /* Tournament High Score */
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
        )}
      </div>

      {/* ─── Quality-switch warning — brief, dismissible, auto-hides ─── */}
      {showQualityWarning && (
        <div className="absolute top-16 left-3 right-3 flex justify-center pointer-events-none z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2 bg-fuchsia-950/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-fuchsia-400/30 shadow-lg max-w-[280px] pointer-events-auto">
            <Info size={15} className="text-fuchsia-300 shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-fuchsia-100 leading-snug">
              {lang === "ar"
                ? "الجودة الأعلى ممكن تأثر على السلاسة. إذا حسّيت فيه لاق، ارجع لوضع الأداء ⚡"
                : "Higher quality may cost some smoothness. If you notice lag, switch back to Performance ⚡"}
            </p>
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

      {/* ─── START SCREEN ─── */}
      {status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none z-20 py-16">
          <div aria-hidden />

          {/* Tap hint */}
          <div className="flex flex-col items-center gap-2.5">
            <MousePointerClick size={26} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] animate-bounce" />
            <span className="text-white font-black text-sm bg-black/60 px-5 py-2 rounded-full border border-white/20 tracking-wide">
              {lang === "ar" ? "اضغط للطيران" : "TAP TO FLY"}
            </span>
          </div>

          {/* Tournament banner — only when there's an actual live tournament
              to point at, never a fabricated CTA */}
          <div className="h-8 flex items-center">
            {activeTid && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-300/40 shadow-lg">
                <span className="text-sm" aria-hidden>🏆</span>
                <span className="text-slate-950 font-black text-xs tracking-wide">
                  {lang === "ar" ? "بطولة مباشرة الآن" : "TOURNAMENT LIVE NOW"}
                </span>
              </div>
            )}
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

      {/* ─── PAUSE OVERLAY ───
          Shown whenever isPaused is true — either the manual pause button
          or a tab-visibility change mid-run (see the effect above). Same
          stopPropagation pattern as the Game Over card so taps on it never
          reach the container's jump handler underneath. */}
      {isPaused && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 z-30"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-w-sm bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.85)] text-center animate-in fade-in zoom-in-90 duration-300"
            dir={dir}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_4px_20px_rgba(34,211,238,0.35)]">
                <Pause size={26} fill="currentColor" className="text-slate-950" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase mt-1">
                {lang === "ar" ? "إيقاف مؤقت" : "PAUSED"}
              </h2>
              <span className="text-slate-400 font-bold text-sm">
                {lang === "ar" ? "نتيجتك الحالية:" : "Current score:"}{" "}
                <span className="text-amber-400 font-black">{score}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  flippyAudio.playClick();
                  resumeGame();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm rounded-xl shadow-[0_4px_20px_rgba(34,211,238,0.35)] border border-cyan-400/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
                <span>{lang === "ar" ? "متابعة" : "RESUME"}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  flippyAudio.playClick();
                  if (activeTid) navigate({ to: "/games/t/$id", params: { id: activeTid } });
                  else navigate({ to: "/games" });
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full py-3 bg-slate-950/60 hover:bg-slate-800 text-slate-200 font-extrabold text-sm rounded-xl border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                <span>{lang === "ar" ? "خروج" : "QUIT"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

