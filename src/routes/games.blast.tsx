import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
const MAX_POPUPS = 4;
const BOARD_GAP_PX = 1;
const BOARD_PADDING_PX = 6;
const BOARD_BORDER_PX = 0;
const BOARD_RESIZE_DEBOUNCE_MS = 120;

type BoardLayout = { boardPx: number; cellPx: number };

function calculateBoardLayout(availableWidth: number, availableHeight: number): BoardLayout {
  const availablePx = Math.floor(Math.min(availableWidth, availableHeight));
  const fixedPx = BOARD_GAP_PX * (BOARD_SIZE - 1) + BOARD_PADDING_PX * 2 + BOARD_BORDER_PX * 2;
  const cellPx = Math.max(1, Math.floor((availablePx - fixedPx) / BOARD_SIZE));
  return {
    cellPx,
    boardPx: cellPx * BOARD_SIZE + fixedPx,
  };
}

/** bevel band thickness ~12% of the cube side, always an integer number of px */
function bevelPx(cell: number): number {
  return Math.max(2, Math.floor(cell * 0.12));
}

/* --- VISUAL-ONLY palette: classic block-puzzle, moderately saturated --- */
const VIVID: Record<number, string> = {
  1: "#5BC8E8", // سماوي
  2: "#3B6FE0", // أزرق
  3: "#52B84E", // أخضر
  4: "#F0C040", // أصفر ذهبي
  5: "#8A5BD6", // بنفسجي
  6: "#E8862E", // برتقالي
  7: "#D9483F", // أحمر
  8: "#F0C040", // أصفر ذهبي
  9: "#E8862E", // برتقالي
};

function mixHex(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (target - v) * amount),
  );
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** pre-built once: flat face + light/dark chamfer drawn with inner borders only */
const FACES: Record<number, React.CSSProperties> = Object.fromEntries(
  Object.entries(VIVID).map(([k, c]) => {
    const light = mixHex(c, 255, 0.28);
    const dark = mixHex(c, 0, 0.24);
    return [
      Number(k),
      {
        backgroundColor: c,
        borderStyle: "solid",
        borderColor: `${light} ${dark} ${dark} ${light}`,
      } as React.CSSProperties,
    ];
  }),
) as Record<number, React.CSSProperties>;


function face(colorId: number): React.CSSProperties | undefined {
  return FACES[colorId];
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

/* ============================================================
   Memoized cell — only cells whose props actually changed repaint.
   ============================================================ */
const BoardCell = memo(function BoardCell({
  row,
  col,
  colorId,
  cls,
  delay,
}: {
  row: number;
  col: number;
  colorId: number;
  cls: string;
  delay: number;
}) {
  const base = colorId ? face(colorId) : undefined;
  const style = base && delay > 0 ? { ...base, animationDelay: `${delay}ms` } : base;
  return <div data-row={row} data-col={col} className={cls} style={style} />;
});

/* ============================================================
   Move timer — fully isolated. Its ticks never re-render the
   board or the tray. Bar is written straight to the DOM.
   ============================================================ */
const MoveTimer = memo(function MoveTimer({
  limitMs,
  moveKey,
  active,
  onExpire,
}: {
  limitMs: number;
  moveKey: number;
  active: boolean;
  onExpire: () => void;
}) {
  const [remain, setRemain] = useState(limitMs);
  const barRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef(limitMs);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    leftRef.current = limitMs;
    setRemain(limitMs);
  }, [limitMs, moveKey]);

  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    const start = leftRef.current;
    let raf = 0;
    let lastQ = -1;
    let lastCls = "";
    const tick = () => {
      const left = Math.max(0, start - (performance.now() - t0));
      const pct = Math.max(0, Math.min(1, left / Math.max(1, limitMs)));
      if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
      const cls = "blast-timer" + (pct < 0.34 ? " low" : "") + (left <= 3000 ? " urgent" : "");
      if (cls !== lastCls && boxRef.current) {
        boxRef.current.className = cls;
        lastCls = cls;
      }
      // integer seconds normally, tenths only in the last 3 seconds
      const q = left <= 3000 ? Math.ceil(left / 100) : Math.ceil(left / 1000);
      if (q !== lastQ) {
        lastQ = q;
        setRemain(left);
      }
      if (left <= 0) {
        expireRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      leftRef.current = Math.max(0, start - (performance.now() - t0));
    };
  }, [active, limitMs, moveKey]);

  const secs = remain <= 3000 ? (remain / 1000).toFixed(1) : String(Math.ceil(remain / 1000));
  return (
    <div ref={boxRef} className="blast-timer" dir="ltr">
      <i ref={barRef as React.RefObject<HTMLElement>} />
      <b>{secs}s</b>
    </div>
  );
});

function BlastPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [game, setGame] = useState<GameState>(() => createGame(makeSeed()));
  const [dragInfo, setDragInfo] = useState<{ trayIndex: number; piece: PieceDef } | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [boardLayout, setBoardLayout] = useState<BoardLayout>(() => ({
    cellPx: 0,
    boardPx: 0,
  }));
  const [measured, setMeasured] = useState(false);
  const { boardPx, cellPx: cellSize } = boardLayout;
  const [clearing, setClearing] = useState<Map<number, ClearCell>>(new Map());
  const [placed, setPlaced] = useState<number[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string; size?: number; clean?: boolean; streak?: string } | null>(null);
  const [shownScore, setShownScore] = useState(0);
  const [best, setBest] = useState(0);
  const [bestAtStart, setBestAtStart] = useState(0);
  const [streakBreak, setStreakBreak] = useState(0);
  const [trayGen, setTrayGen] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speedNote, setSpeedNote] = useState<{ id: number; text: string } | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const targetRef = useRef<Target>(null);
  const rafRef = useRef(0);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const popupId = useRef(1);
  const prevStreak = useRef(0);
  const prevTrayCount = useRef(3);
  const prevLimit = useRef(0);
  const moveStart = useRef<number>(0);
  const gameRef = useRef(game);
  gameRef.current = game;
  const cellRef = useRef(cellSize);
  cellRef.current = cellSize;

  /* ----- no page scrolling at all while the game is mounted ----- */
  useEffect(() => {
    const b = document.body;
    const html = document.documentElement;
    const prev = [b.style.overflow, html.style.overflow, b.style.overscrollBehavior];
    b.style.overflow = "hidden";
    html.style.overflow = "hidden";
    b.style.overscrollBehavior = "none";
    const block = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      b.style.overflow = prev[0];
      html.style.overflow = prev[1];
      b.style.overscrollBehavior = prev[2];
      document.removeEventListener("touchmove", block);
    };
  }, []);

  /* ----- integer-pixel board layout, recalculated only after a real viewport resize ----- */
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;

    let done = false;
    const apply = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      const next = calculateBoardLayout(r.width, r.height);
      setBoardLayout((current) =>
        current.boardPx === next.boardPx && current.cellPx === next.cellPx ? current : next,
      );
      done = true;
      setMeasured(true);
    };

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, BOARD_RESIZE_DEBOUNCE_MS);
    };

    apply();
    const raf = requestAnimationFrame(apply);
    const ro = new ResizeObserver(() => {
      if (!done) apply();
    });
    ro.observe(el);
    const settle = window.setTimeout(() => ro.disconnect(), 1500);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, []);

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

  const timerActive = !game.over && !paused;
  const onExpire = useCallback(() => setGame((g) => timeoutGame(g)), []);

  useEffect(() => {
    if (timerActive) moveStart.current = performance.now();
  }, [timerActive, game.moves.length, game.moveLimitMs]);

  const previewCells = useMemo(() => {
    const map = new Map<number, boolean>();
    const d = dragInfo;
    if (!d || !target) return map;
    for (const [dr, dc] of d.piece.cells) {
      const r = target.row + dr;
      const c = target.col + dc;
      if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
      map.set(idx(r, c), target.ok);
    }
    return map;
  }, [dragInfo, target]);

  const deadTray = useMemo(
    () => game.tray.map((p) => (p ? !hasAnyPlacement(game.board, p) : false)),
    [game.tray, game.board],
  );

  const fillRatio = useMemo(
    () => game.board.reduce((n, v) => n + (v ? 1 : 0), 0) / (BOARD_SIZE * BOARD_SIZE),
    [game.board],
  );

  /* ============================================================
     DRAG — rAF throttled, ghost moved with translate3d only.
     ============================================================ */
  const applyFrame = useCallback(() => {
    rafRef.current = 0;
    const p = pendingRef.current;
    const d = dragRef.current;
    if (!p || !d) return;
    d.x = p.x;
    d.y = p.y;
    const cs = cellRef.current;
    const step = cs + BOARD_GAP_PX;
    const left = d.x - (d.piece.w * step - BOARD_GAP_PX) / 2;
    const top = d.y - (d.piece.h * step - BOARD_GAP_PX) / 2 - d.lift;
    const hit = cellUnderPoint(left + cs / 2, top + cs / 2);
    const next: Target = hit
      ? { row: hit.row, col: hit.col, ok: canPlace(gameRef.current.board, d.piece, hit.row, hit.col) }
      : null;
    if (ghostRef.current) {
      // snap onto the grid whenever the piece is over a cell, so the cubes
      // always line up with the board instead of floating between rows
      let gx = left;
      let gy = top;
      if (hit) {
        const cell = document.querySelector<HTMLElement>(
          `[data-row="${hit.row}"][data-col="${hit.col}"]`,
        );
        if (cell) {
          const r = cell.getBoundingClientRect();
          gx = Math.round(r.left);
          gy = Math.round(r.top);
        }
      }
      ghostRef.current.style.transform = `translate3d(${Math.round(gx)}px, ${Math.round(gy)}px, 0)`;
    }
    const cur = targetRef.current;
    const same =
      (!cur && !next) ||
      (!!cur && !!next && cur.row === next.row && cur.col === next.col && cur.ok === next.ok);
    if (!same) {
      targetRef.current = next;
      setTarget(next);
    }
  }, []);


  const queueFrame = useCallback((x: number, y: number) => {
    pendingRef.current = { x, y };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(applyFrame);
  }, [applyFrame]);

  const spawnPopup = useCallback((text: string, row: number, col: number, size: number) => {
    const el = boardRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const b = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const cs = cellRef.current;
    const id = popupId.current++;
    setPopups((p) => [
      ...p.slice(-(MAX_POPUPS - 1)),
      { id, text, size, top: b.top - w.top + (row + 0.5) * cs, left: b.left - w.left + (col + 0.5) * cs },
    ]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 950);
  }, []);

  const commitDrop = useCallback(() => {
    const d = dragRef.current;
    const t = targetRef.current;
    dragRef.current = null;
    targetRef.current = null;
    pendingRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    setDragInfo(null);
    setTarget(null);
    if (!d || !t || !t.ok) return;

    const g = gameRef.current;
    const durationMs = performance.now() - moveStart.current;
    const res = placePiece(g, d.trayIndex, t.row, t.col, durationMs);
    if (!res.ok) return;

    const justPlaced = d.piece.cells.map(([dr, dc]) => idx(t.row + dr, t.col + dc));
    setPlaced(justPlaced);
    setTimeout(() => setPlaced([]), 240);

    if (res.lines > 0) {
      {
        const map = new Map<number, ClearCell>();
        for (const r of res.clearedRows) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            const i = idx(r, c);
            map.set(i, { order: c, color: g.board[i] || d.piece.color });
          }
        }
        for (const c of res.clearedCols) {
          for (let r = 0; r < BOARD_SIZE; r++) {
            const i = idx(r, c);
            if (!map.has(i)) map.set(i, { order: r, color: g.board[i] || d.piece.color });
          }
        }
        for (const [dr, dc] of d.piece.cells) {
          const i = idx(t.row + dr, t.col + dc);
          const cur = map.get(i);
          if (cur) map.set(i, { ...cur, color: d.piece.color });
        }
        setClearing(map);
        setPaused(true);
        setTimeout(() => { setClearing(new Map()); setPaused(false); }, 460);
      }

      if (res.lines > 1 || res.boardClearBonus > 0) {
        const names = ar
          ? ["", "", "مسح مزدوج", "مسح ثلاثي", "مسح رباعي"]
          : ["", "", "DOUBLE CLEAR", "TRIPLE CLEAR", "QUAD CLEAR"];
        const text =
          res.lines > 1
            ? names[Math.min(res.lines, 4)] || (ar ? "مسح خارق" : "SUPER CLEAR")
            : ar ? "لوح نظيف!" : "CLEAN BOARD!";
        const id = popupId.current++;
        setBanner({
          id,
          text,
          size: Math.min(4, Math.max(1, res.lines - 1)),
          clean: res.boardClearBonus > 0,
          streak: res.multiplier > 1 ? (ar ? `×${res.multiplier} متتالية` : `×${res.multiplier} STREAK`) : "",
        });
        setTimeout(() => setBanner((b) => (b && b.id === id ? null : b)), 1000);
      }


      {
        const size = res.gained >= 600 ? 3 : res.gained >= 300 ? 2 : 1;
        spawnPopup(`+${res.gained}`, t.row, t.col, size);
      }
    }

    setGame(res.state);
  }, [ar, spawnPopup]);

  /* window-level listeners: the pointer may leave the board mid-drag */
  useEffect(() => {
    if (!dragInfo) return;
    const move = (e: PointerEvent) => { e.preventDefault(); queueFrame(e.clientX, e.clientY); };
    const up = (e: PointerEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      applyFrame();
      commitDrop();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragInfo, queueFrame, applyFrame, commitDrop]);

  const onPieceDown = (e: React.PointerEvent, trayIndex: number, piece: PieceDef) => {
    if (game.over) return;
    e.preventDefault();
    const touch = e.pointerType !== "mouse";
    dragRef.current = {
      trayIndex,
      piece,
      x: e.clientX,
      y: e.clientY,
      lift: touch ? cellRef.current : 0,
    };
    targetRef.current = null;
    setDragInfo({ trayIndex, piece });
    setTarget(null);
    pendingRef.current = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(applyFrame);
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
  const timedOut = game.endReason === "timeout";
  const trayCell = Math.max(12, Math.round((boardPx || 320) / 8 * 0.52));

  const hud = (
    <>
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

      <MoveTimer
        limitMs={game.moveLimitMs}
        moveKey={game.moves.length}
        active={timerActive}
        onExpire={onExpire}
      />
    </>
  );

  const blockStyle = boardPx ? ({ width: boardPx } as React.CSSProperties) : undefined;

  return (
    <StoreShell bare>
      <main dir={dir} className="blast-page blast-fs">
        <header className="blast-bar">
          <Link to="/games" className="blast-back">{ar ? "‹ ساحة اللعب" : "‹ Play Arena"}</Link>
        </header>

        <section className={"blast-stage" + (measured ? "" : " measuring")}>
          <div className="blast-play">
            <div className="blast-column" style={blockStyle}>
              {hud}
            </div>

            <div className="blast-area" ref={areaRef}>
              <div
                className="blast-wrap"
                ref={wrapRef}
                style={boardPx ? { width: boardPx, height: boardPx } : undefined}
              >
                <div
                  ref={boardRef}
                  dir="ltr"
                  className={"blast-board" + (fillRatio > 0.75 ? " danger" : "")}
                  style={{
                    ["--board-cell" as string]: `${cellSize}px`,
                    ["--board-gap" as string]: `${BOARD_GAP_PX}px`,
                    ["--board-pad" as string]: `${BOARD_PADDING_PX}px`,
                    ["--board-border" as string]: `${BOARD_BORDER_PX}px`,
                    ["--bevel" as string]: `${bevelPx(cellSize)}px`,
                  }}

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
                      <BoardCell
                        key={i}
                        row={row}
                        col={col}
                        colorId={colorId}
                        cls={cls}
                        delay={0}
                      />
                    );
                  })}

                  {banner && (
                    <span key={banner.id} className={"bb-banner b" + (banner.size || 1) + (banner.clean ? " clean" : "")}>
                      {banner.text}
                      {banner.streak ? <i>{banner.streak}</i> : null}
                    </span>
                  )}

                  {speedNote && <span key={speedNote.id} className="bb-speed">{speedNote.text}</span>}
                </div>

                {popups.map((p) => (
                  <span key={p.id} className={"bb-pop s" + p.size} style={{ top: p.top, left: p.left }}>
                    {p.text}
                  </span>
                ))}

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
            </div>

            <div
              className="blast-tray"
              dir="ltr"
              style={{ ["--tc" as string]: `${trayCell}px`, ["--bevel" as string]: `${bevelPx(trayCell)}px`, ...(blockStyle || {}) }}
            >
              {game.tray.map((p, i) => (
                <div
                  key={i}
                  className={
                    "bt-slot" +
                    (dragInfo?.trayIndex === i ? " dragging" : "") +
                    (deadTray[i] ? " dead" : "")
                  }
                  style={{ touchAction: "none" }}
                  onPointerDown={p ? (e) => onPieceDown(e, i, p) : undefined}
                >
                  {p && (
                    <div
                      key={`${trayGen}-${p.id}`}
                      className="bt-piece"
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
                            style={on ? face(p.color) : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {dragInfo && (
          <div
            ref={ghostRef}
            className="bb-ghost"
            dir="ltr"
            style={{
              gap: BOARD_GAP_PX,
              pointerEvents: "none",
              ["--bevel" as string]: `${bevelPx(cellSize)}px`,

              gridTemplateColumns: `repeat(${dragInfo.piece.w}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${dragInfo.piece.h}, ${cellSize}px)`,
            }}
          >

            {Array.from({ length: dragInfo.piece.w * dragInfo.piece.h }).map((_, k) => {
              const r = Math.floor(k / dragInfo.piece.w);
              const c = k % dragInfo.piece.w;
              const on = dragInfo.piece.cells.some(([cr, cc]) => cr === r && cc === c);
              return (
                <span
                  key={k}
                  className={"bg-cell" + (on ? " on" : "")}
                  style={{ width: cellSize, height: cellSize, ...(on ? face(dragInfo.piece.color) : null) }}
                />
              );
            })}
          </div>
        )}
      </main>
    </StoreShell>
  );
}
