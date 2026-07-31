import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import {
  BOARD_SIZE,
  canPlace,
  createGame,
  hasAnyPlacement,
  idx,
  makeSeed,
  placePiece,
  streakMultiplier,
  timeoutGame,
  type GameState,
  type PieceDef,
} from "@/lib/gx/games/blast-engine";

export const Route = createFileRoute("/games/blast")({
  head: () => ({
    meta: [
      { title: "GX Blast — لعبة البلوكات داخل GX Store" },
      { name: "description", content: "العب GX Blast: ضع القطع على لوح 8×8، امسح الصفوف والأعمدة، واجمع كومبو وستريك لأعلى سكور." },
      { property: "og:title", content: "GX Blast — GX Store" },
      { property: "og:description", content: "لعبة بلوكات 8×8 داخل ساحة اللعب في GX Store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: STORE_HEAD_LINKS,
  }),
  component: BlastPage,
});

const BEST_KEY = "gx_blast_best";

/* --- VISUAL-ONLY palette override (engine colour ids -> vivid hex) --- */
const VIVID: Record<number, string> = {
  1: "#22e8ff",
  2: "#ff3d8b",
  3: "#c6ff3d",
  4: "#b45cff",
  5: "#ffc422",
  6: "#3b8cff",
  7: "#25f2b0",
  8: "#ff7ac2",
  9: "#ff8a1f",
};

function faceStyle(colorId: number): React.CSSProperties {
  const c = VIVID[colorId] ?? "#22e8ff";
  return {
    backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${c} 72%, #ffffff) 0%, ${c} 46%, color-mix(in oklab, ${c} 82%, #000000) 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.55), inset 0 0 0 1px color-mix(in oklab, ${c} 60%, #ffffff)`,
  };
}

type DragState = {
  trayIndex: number;
  piece: PieceDef;
  x: number;
  y: number;
  lift: number;
};

type Target = { row: number; col: number; ok: boolean } | null;
type Popup = { id: number; text: string; top: number; left: number; size: number };
type ClearCell = { order: number; color: number };

/**
 * Row/col come STRICTLY from hit-testing the DOM: no board width, no cell size,
 * no gap math. Works with any layout, direction or zoom level.
 */
function cellUnderPoint(x: number, y: number): { row: number; col: number } | null {
  if (typeof document === "undefined") return null;
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const hit = el?.closest?.("[data-row][data-col]") as HTMLElement | null;
  if (!hit) return null;
  const row = Number(hit.dataset.row);
  const col = Number(hit.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

function BlastPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [game, setGame] = useState<GameState>(() => createGame(makeSeed()));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [cellSize, setCellSize] = useState(40);
  const [clearing, setClearing] = useState<Map<number, ClearCell>>(new Map());
  const [placed, setPlaced] = useState<number[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [shownScore, setShownScore] = useState(0);
  const [best, setBest] = useState(0);
  const [bestAtStart, setBestAtStart] = useState(0);
  const [streakBreak, setStreakBreak] = useState(0);
  const [trayGen, setTrayGen] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [remainMs, setRemainMs] = useState(game.moveLimitMs);
  const [paused, setPaused] = useState(false);
  const [speedNote, setSpeedNote] = useState<{ id: number; text: string } | null>(null);


  const boardRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const popupId = useRef(1);
  const prevStreak = useRef(0);
  const prevTrayCount = useRef(3);
  const prevLimit = useRef(0);
  const moveStart = useRef<number>(0);


  /* ----- best score (local only) ----- */
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(BEST_KEY) || 0);
      if (Number.isFinite(v)) { setBest(v); setBestAtStart(v); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (game.score > best) {
      setBest(game.score);
      try { localStorage.setItem(BEST_KEY, String(game.score)); } catch { /* ignore */ }
    }
  }, [game.score, best]);

  /* ----- streak break flash ----- */
  useEffect(() => {
    if (prevStreak.current >= 3 && game.streak === 0) setStreakBreak((n) => n + 1);
    prevStreak.current = game.streak;
  }, [game.streak]);

  /* ----- speed-up notice when the move limit tier drops ----- */
  useEffect(() => {
    const lim = game.moveLimitMs;
    if (prevLimit.current && lim < prevLimit.current) {
      const secs = Math.round(lim / 1000);
      const id = Date.now();
      setSpeedNote({
        id,
        text: ar ? `تسارعت اللعبة — ${secs} ثوانٍ للحركة` : `Speeding up — ${secs}s per move`,
      });
      setTimeout(() => setSpeedNote((s) => (s && s.id === id ? null : s)), 1600);
    }
    prevLimit.current = lim;
  }, [game.moveLimitMs, ar]);


  /* ----- new tray => staggered entrance ----- */
  useEffect(() => {
    const count = game.tray.filter(Boolean).length;
    if (count > prevTrayCount.current) setTrayGen((n) => n + 1);
    prevTrayCount.current = count;
  }, [game.tray]);

  /* ----- animated score count-up ----- */
  useEffect(() => {
    if (shownScore === game.score) return;
    let raf = 0;
    const start = shownScore;
    const diff = game.score - start;
    const t0 = performance.now();
    const dur = Math.min(500, 120 + Math.abs(diff) * 1.2);
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShownScore(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.score]);

  /* ----- game over: big count-up ----- */
  useEffect(() => {
    if (!game.over) { setFinalScore(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setFinalScore(Math.round(game.score * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [game.over, game.score]);

  /* ----- move timer: runs only while pieces are actually playable ----- */
  const timerActive = !game.over && !paused;

  useEffect(() => {
    if (!timerActive) return;
    moveStart.current = performance.now();
    setRemainMs(game.moveLimitMs);
    let raf = 0;
    const tick = () => {
      const left = game.moveLimitMs - (performance.now() - moveStart.current);
      setRemainMs(Math.max(0, left));
      if (left <= 0) { setGame((g) => timeoutGame(g)); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timerActive, game.moves.length, game.moveLimitMs]);

  /* ----- visual cell size for the drag ghost (rendering only) ----- */
  const measure = useCallback(() => {
    const c0 = boardRef.current?.querySelector("[data-row]") as HTMLElement | null;
    if (c0) setCellSize(c0.getBoundingClientRect().width);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /* ----- ghost geometry: piece is centred on the pointer, lifted on touch ----- */
  const ghost = useMemo(() => {
    if (!drag) return null;
    return {
      left: drag.x - (drag.piece.w * cellSize) / 2,
      top: drag.y - (drag.piece.h * cellSize) / 2 - drag.lift,
    };
  }, [drag, cellSize]);

  /** identical resolution for preview and for the final commit */
  const resolveTarget = useCallback(
    (d: DragState): Target => {
      const left = d.x - (d.piece.w * cellSize) / 2;
      const top = d.y - (d.piece.h * cellSize) / 2 - d.lift;
      const hit = cellUnderPoint(left + cellSize / 2, top + cellSize / 2);
      if (!hit) return null;
      return { row: hit.row, col: hit.col, ok: canPlace(game.board, d.piece, hit.row, hit.col) };
    },
    [cellSize, game.board],
  );

  const previewCells = useMemo(() => {
    const map = new Map<number, boolean>();
    if (!drag || !target) return map;
    for (const [dr, dc] of drag.piece.cells) {
      const r = target.row + dr;
      const c = target.col + dc;
      if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
      map.set(idx(r, c), target.ok);
    }
    return map;
  }, [drag, target]);

  const deadTray = useMemo(
    () => game.tray.map((p) => (p ? !hasAnyPlacement(game.board, p) : false)),
    [game.tray, game.board],
  );

  const fillRatio = useMemo(
    () => game.board.reduce((n, v) => n + (v ? 1 : 0), 0) / (BOARD_SIZE * BOARD_SIZE),
    [game.board],
  );

  /* ----- pointer handlers (whole card is the grab surface) ----- */
  const onPieceDown = (e: React.PointerEvent, trayIndex: number, piece: PieceDef) => {
    if (game.over) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const touch = e.pointerType !== "mouse";
    const d: DragState = {
      trayIndex,
      piece,
      x: e.clientX,
      y: e.clientY,
      lift: touch ? cellSize : 0,
    };
    setDrag(d);
    setTarget(resolveTarget(d));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    const d = { ...drag, x: e.clientX, y: e.clientY };
    setDrag(d);
    setTarget(resolveTarget(d));
  };

  const spawnPopup = (text: string, row: number, col: number, size: number) => {
    const el = boardRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const b = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const id = popupId.current++;
    setPopups((p) => [
      ...p,
      { id, text, size, top: b.top - w.top + (row + 0.5) * cellSize, left: b.left - w.left + (col + 0.5) * cellSize },
    ]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 950);
  };

  const finishDrag = (e?: React.PointerEvent) => {
    if (!drag) return;
    const d = e ? { ...drag, x: e.clientX, y: e.clientY } : drag;
    const t = e ? resolveTarget(d) : target;
    setDrag(null);
    setTarget(null);
    if (!t || !t.ok) return;

    const durationMs = performance.now() - moveStart.current;
    const res = placePiece(game, d.trayIndex, t.row, t.col, durationMs);
    if (!res.ok) return;

    const justPlaced = d.piece.cells.map(([dr, dc]) => idx(t.row + dr, t.col + dc));
    setPlaced(justPlaced);
    setTimeout(() => setPlaced([]), 240);

    if (res.lines > 0) {
      const map = new Map<number, ClearCell>();
      for (const r of res.clearedRows) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const i = idx(r, c);
          map.set(i, { order: c, color: game.board[i] || d.piece.color });
        }
      }
      for (const c of res.clearedCols) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          const i = idx(r, c);
          if (!map.has(i)) map.set(i, { order: r, color: game.board[i] || d.piece.color });
        }
      }
      for (const [dr, dc] of d.piece.cells) {
        const i = idx(t.row + dr, t.col + dc);
        const cur = map.get(i);
        if (cur) map.set(i, { ...cur, color: d.piece.color });
      }
      setClearing(map);
      // timer stays frozen while the clear effect plays
      setPaused(true);
      setTimeout(() => { setClearing(new Map()); setPaused(false); }, 460);

      if (res.lines > 1) {
        const names = ar
          ? ["", "", "مسح مزدوج", "مسح ثلاثي", "مسح رباعي", "مسح خماسي"]
          : ["", "", "DOUBLE CLEAR", "TRIPLE CLEAR", "QUAD CLEAR", "PENTA CLEAR"];
        const text = names[Math.min(res.lines, 5)] || (ar ? "مسح هائل" : "MEGA CLEAR");
        const id = popupId.current++;
        setBanner({ id, text });
        setTimeout(() => setBanner((b) => (b && b.id === id ? null : b)), 900);
      }

      const size = res.gained >= 600 ? 3 : res.gained >= 300 ? 2 : 1;
      spawnPopup(`+${res.gained}`, t.row, t.col, size);
    }

    setGame(res.state);
  };

  const restart = () => {
    setClearing(new Map());
    setPopups([]);
    setBanner(null);
    setPlaced([]);
    setShownScore(0);
    setPaused(false);
    setBestAtStart(best);
    setGame(createGame(makeSeed()));
  };

  const mult = streakMultiplier(game.streak);
  const streakHot = game.streak > 0;
  const heat = Math.min(8, game.streak);
  const isRecord = game.over && game.score > 0 && game.score >= best && game.score > bestAtStart;
  const diff = game.score - bestAtStart;
  const timePct = Math.max(0, Math.min(1, remainMs / Math.max(1, game.moveLimitMs)));
  const timedOut = game.endReason === "timeout";

  return (
    <StoreShell>
      <main dir={dir} className="blast-page">
        <section className="container blast-topbar">
          <Link to="/games" className="blast-back">{ar ? "‹ ساحة اللعب" : "‹ Play Arena"}</Link>
        </section>

        <section className="container blast-stage">
          <div className="blast-hud">
            <div className="hud-side">
              <span>{ar ? "الأفضل" : "Best"}</span>
              <b>{best.toLocaleString("en-US")}</b>
            </div>

            <div className="hud-main">
              <span className="hud-lbl">{ar ? "النقاط" : "Score"}</span>
              <span className="hud-val">{shownScore.toLocaleString("en-US")}</span>
            </div>

            <div
              key={streakBreak}
              className={
                "hud-side hud-streak" +
                (streakHot ? " hot heat-" + heat : "") +
                (streakBreak > 0 && !streakHot ? " broke" : "")
              }
            >
              <span>{ar ? "ستريك" : "Streak"}</span>
              <b>{streakHot ? `🔥 ×${mult}` : "—"}</b>
            </div>
          </div>

          <div
            className={
              "blast-timer" + (timePct < 0.34 ? " low" : "") + (remainMs <= 3000 && !game.over ? " urgent" : "")
            }
            dir="ltr"
          >
            <i style={{ transform: `scaleX(${timePct})` }} />
            <b>{(remainMs / 1000).toFixed(1)}s</b>
          </div>

          <div className="blast-wrap" ref={wrapRef}>
            <div
              ref={boardRef}
              dir="ltr"
              className={"blast-board" + (fillRatio > 0.75 ? " danger" : "")}
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
            >
              {game.board.map((v, i) => {
                const row = Math.floor(i / BOARD_SIZE);
                const col = i % BOARD_SIZE;
                const pv = previewCells.get(i);
                const cl = clearing.get(i);
                const colorId = cl ? cl.color : v;
                const cls =
                  "bb-cell" +
                  (colorId ? " filled" : "") +
                  (cl ? " clearing" : "") +
                  (placed.includes(i) ? " popped" : "") +
                  (pv === true ? " pv-ok" : pv === false ? " pv-bad" : "");
                return (
                  <div
                    key={i}
                    data-row={row}
                    data-col={col}
                    className={cls}
                    style={
                      colorId
                        ? { ...faceStyle(colorId), ...(cl ? { animationDelay: `${cl.order * 20}ms` } : null) }
                        : undefined
                    }
                  />
                );
              })}

              {banner && <span key={banner.id} className="bb-banner">{banner.text}</span>}
              {speedNote && <span key={speedNote.id} className="bb-speed">{speedNote.text}</span>}
            </div>

            {popups.map((p) => (
              <span key={p.id} className={"bb-pop s" + p.size} style={{ top: p.top, left: p.left }}>
                {p.text}
              </span>
            ))}

            <div className="blast-tray" dir="ltr" onPointerMove={onPointerMove} onPointerUp={finishDrag}>
              {game.tray.map((p, i) => (
                <div
                  key={i}
                  className={
                    "bt-slot" +
                    (drag?.trayIndex === i ? " dragging" : "") +
                    (deadTray[i] ? " dead" : "")
                  }
                  style={{ touchAction: "none" }}
                  onPointerDown={p ? (e) => onPieceDown(e, i, p) : undefined}
                >
                  {p && (
                    <div
                      key={`${trayGen}-${p.id}`}
                      className="bt-piece enter"
                      dir="ltr"
                      style={{
                        ["--i" as string]: i,
                        pointerEvents: "none",
                        gridTemplateColumns: `repeat(${p.w}, var(--tc))`,
                        gridTemplateRows: `repeat(${p.h}, var(--tc))`,
                      }}
                    >
                      {Array.from({ length: p.w * p.h }).map((_, k) => {
                        const r = Math.floor(k / p.w);
                        const c = k % p.w;
                        const on = p.cells.some(([cr, cc]) => cr === r && cc === c);
                        return (
                          <span
                            key={k}
                            className={"bt-cell" + (on ? " on" : "")}
                            style={on ? faceStyle(p.color) : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {drag && (
              <div
                className="bb-ghost"
                dir="ltr"
                style={{
                  left: ghost?.left ?? 0,
                  top: ghost?.top ?? 0,
                  gap: 0,
                  pointerEvents: "none",
                  gridTemplateColumns: `repeat(${drag.piece.w}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${drag.piece.h}, ${cellSize}px)`,
                }}
              >
                {Array.from({ length: drag.piece.w * drag.piece.h }).map((_, k) => {
                  const r = Math.floor(k / drag.piece.w);
                  const c = k % drag.piece.w;
                  const on = drag.piece.cells.some(([cr, cc]) => cr === r && cc === c);
                  return (
                    <span
                      key={k}
                      className={"bg-cell" + (on ? " on" : "")}
                      style={{ width: cellSize, height: cellSize, ...(on ? faceStyle(drag.piece.color) : null) }}
                    />
                  );
                })}
              </div>
            )}

            {game.over && (
              <div className="blast-over">
                <div className={"bo-card" + (isRecord ? " record" : "")}>
                  {isRecord && (
                    <div className="bo-ribbon">
                      <i>✦</i><i>✦</i><i>✦</i>
                      <span>{ar ? "رقم قياسي جديد!" : "NEW RECORD!"}</span>
                    </div>
                  )}
                  <div className="bo-ic">{timedOut ? "⏱️" : "💥"}</div>
                  <h2>{timedOut ? (ar ? "انتهى الوقت" : "Time's up") : (ar ? "انتهت اللعبة" : "Game Over")}</h2>
                  <p className="bo-why">
                    {timedOut
                      ? ar ? "نفدت مهلة الحركة" : "Move timer ran out"
                      : ar ? "لم يعد هناك مكان لأي قطعة" : "No room left for any piece"}
                  </p>
                  <div className="bo-score">
                    <span>{ar ? "النقاط النهائية" : "Final score"}</span>
                    <b>{finalScore.toLocaleString("en-US")}</b>
                  </div>
                  <p className="bo-cmp">
                    {isRecord
                      ? ar ? `تجاوزت أفضل نتيجة بـ ${Math.max(diff, 0).toLocaleString("en-US")} نقطة` : `Beat your best by ${Math.max(diff, 0).toLocaleString("en-US")}`
                      : ar ? `أفضل نتيجة: ${best.toLocaleString("en-US")} · ينقصك ${Math.max(best - game.score, 0).toLocaleString("en-US")}` : `Best: ${best.toLocaleString("en-US")} · ${Math.max(best - game.score, 0).toLocaleString("en-US")} to go`}
                  </p>
                  <button type="button" className="btn btn-primary bo-btn" onClick={restart}>
                    {ar ? "العب مرة أخرى" : "Play again"}
                  </button>
                  <Link to="/games" className="bo-link">{ar ? "رجوع لساحة اللعب" : "Back to Play Arena"}</Link>
                </div>
              </div>
            )}
          </div>

          <p className="blast-hint">
            {ar
              ? "اسحب أي قطعة وأفلتها على اللوح. أكمل صفًا أو عمودًا كاملًا لمسحه. لكل حركة مهلة زمنية."
              : "Drag a piece onto the board. Fill a full row or column to clear it. Each move is timed."}
          </p>
        </section>
      </main>
    </StoreShell>
  );
}
