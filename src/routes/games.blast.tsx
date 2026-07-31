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
  resolveDrop,
  streakMultiplier,
  type BoardMetrics,
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
  1: "#22e8ff", // cyan
  2: "#ff3d8b", // pink
  3: "#c6ff3d", // lime
  4: "#b45cff", // violet
  5: "#ffc422", // yellow
  6: "#3b8cff", // blue
  7: "#25f2b0", // mint
  8: "#ff7ac2", // rose
  9: "#ff8a1f", // orange
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
  gx: number;
  gy: number;
  lift: number;
};

type Popup = { id: number; text: string; top: number; left: number; size: number };
type ClearCell = { order: number; color: number };

function BlastPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [game, setGame] = useState<GameState>(() => createGame(makeSeed()));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [metrics, setMetrics] = useState<BoardMetrics | null>(null);
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

  const boardRef = useRef<HTMLDivElement | null>(null);
  const popupId = useRef(1);
  const prevStreak = useRef(0);
  const prevTrayCount = useRef(3);

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
    const dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setFinalScore(Math.round(game.score * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [game.over, game.score]);

  /* ----- measure real board geometry from the DOM (direction-agnostic) ----- */
  const readMetrics = useCallback((): BoardMetrics | null => {
    const el = boardRef.current;
    if (!el) return null;
    const c0 = el.children[0] as HTMLElement | undefined;
    const c1 = el.children[1] as HTMLElement | undefined;
    const cDown = el.children[BOARD_SIZE] as HTMLElement | undefined;
    if (!c0 || !c1 || !cDown) return null;
    const r0 = c0.getBoundingClientRect();
    const r1 = c1.getBoundingClientRect();
    const rd = cDown.getBoundingClientRect();
    return {
      cell0Left: r0.left,
      cell0Top: r0.top,
      cellW: r0.width,
      cellH: r0.height,
      stepX: Math.abs(r1.left - r0.left) || r0.width,
      stepY: Math.abs(rd.top - r0.top) || r0.height,
    };
  }, []);

  const measure = useCallback(() => {
    const m = readMetrics();
    if (m) setMetrics(m);
  }, [readMetrics]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const cell = metrics?.cellW ?? 40;
  const stepX = metrics?.stepX ?? 44;
  const stepY = metrics?.stepY ?? 44;

  /* ----- ghost position: anchored on the piece's TOP-LEFT cell ----- */
  const ghost = useMemo(() => {
    if (!drag) return null;
    const left = drag.x - drag.gx * drag.piece.w * stepX;
    const top = drag.y - drag.gy * drag.piece.h * stepY - drag.lift;
    return { left, top };
  }, [drag, stepX, stepY]);

  const target = useMemo(() => {
    if (!drag || !ghost || !metrics) return null;
    return resolveDrop(
      game.board,
      drag.piece,
      metrics,
      ghost.left + metrics.cellW / 2,
      ghost.top + metrics.cellH / 2,
    );
  }, [drag, ghost, metrics, game.board]);

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

  /* ----- which tray pieces are stuck (visual hint only) ----- */
  const deadTray = useMemo(
    () => game.tray.map((p) => (p ? !hasAnyPlacement(game.board, p) : false)),
    [game.tray, game.board],
  );

  const fillRatio = useMemo(
    () => game.board.reduce((n, v) => n + (v ? 1 : 0), 0) / (BOARD_SIZE * BOARD_SIZE),
    [game.board],
  );

  /* ----- pointer handlers ----- */
  const onPieceDown = (e: React.PointerEvent, trayIndex: number, piece: PieceDef) => {
    if (game.over) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      trayIndex,
      piece,
      x: e.clientX,
      y: e.clientY,
      gx: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      gy: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      lift: touch ? 70 : 0,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };

  const spawnPopup = (text: string, row: number, col: number, size: number) => {
    const el = boardRef.current;
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const b = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const id = popupId.current++;
    setPopups((p) => [
      ...p,
      { id, text, size, top: b.top - w.top + (row + 0.5) * cell, left: b.left - w.left + (col + 0.5) * cell },
    ]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 950);
  };

  const finishDrag = () => {
    if (!drag) return;
    const d = drag;
    const t = target;
    setDrag(null);
    if (!t || !t.ok) return;

    const res = placePiece(game, d.trayIndex, t.row, t.col);
    if (!res.ok) return;

    // placement pulse
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
      setTimeout(() => setClearing(new Map()), 460);

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
    setBestAtStart(best);
    setGame(createGame(makeSeed()));
  };

  const mult = streakMultiplier(game.streak);
  const streakHot = mult > 1;
  const heat = Math.min(8, game.streak);
  const isRecord = game.over && game.score > 0 && game.score >= best && game.score > bestAtStart;
  const diff = game.score - bestAtStart;

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
              <b>{streakHot ? `🔥 ×${mult.toFixed(1).replace(/\.0$/, "")}` : "—"}</b>
            </div>
          </div>

          <div className="blast-wrap">
            <div
              ref={boardRef}
              dir="ltr"
              className={"blast-board" + (fillRatio > 0.75 ? " danger" : "")}
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
            >
              {game.board.map((v, i) => {
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
                >
                  {p && (
                    <div
                      key={`${trayGen}-${p.id}`}
                      className="bt-piece enter"
                      dir="ltr"
                      onPointerDown={(e) => onPieceDown(e, i, p)}
                      style={{
                        ["--i" as string]: i,
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
                  gridTemplateColumns: `repeat(${drag.piece.w}, ${stepX}px)`,
                  gridTemplateRows: `repeat(${drag.piece.h}, ${stepY}px)`,
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
                      style={{ width: cell, height: cell, ...(on ? faceStyle(drag.piece.color) : null) }}
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
                  <div className="bo-ic">💥</div>
                  <h2>{ar ? "انتهت اللعبة" : "Game Over"}</h2>
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
              ? "اسحب أي قطعة وأفلتها على اللوح. أكمل صفًا أو عمودًا كاملًا لمسحه. لا يوجد تدوير للقطع."
              : "Drag a piece onto the board. Fill a full row or column to clear it. No rotation."}
          </p>
        </section>
      </main>
    </StoreShell>
  );
}

void canPlace;
