import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoreShell } from "@/components/gx/StoreShell";
import { STORE_HEAD_LINKS } from "@/lib/gx/store-head";
import { useLang } from "@/lib/gx/i18n";
import {
  BOARD_SIZE,
  PIECE_COLORS,
  canPlace,
  createGame,
  idx,
  makeSeed,
  placePiece,
  resolveDrop,
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

type DragState = {
  trayIndex: number;
  piece: PieceDef;
  x: number;
  y: number;
  gx: number; // grab ratio inside the piece (0..1)
  gy: number;
  lift: number;
};

type Popup = { id: number; text: string; top: number; left: number; big: boolean };

function BlastPage() {
  const { lang, dir } = useLang();
  const ar = lang === "ar";

  const [game, setGame] = useState<GameState>(() => createGame(makeSeed()));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [metrics, setMetrics] = useState<BoardMetrics | null>(null);
  const [clearing, setClearing] = useState<number[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [shownScore, setShownScore] = useState(0);
  const [best, setBest] = useState(0);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const popupId = useRef(1);

  /* ----- best score (local only) ----- */
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(BEST_KEY) || 0);
      if (Number.isFinite(v)) setBest(v);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (game.score > best) {
      setBest(game.score);
      try { localStorage.setItem(BEST_KEY, String(game.score)); } catch { /* ignore */ }
    }
  }, [game.score, best]);

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

  /* ----- drop target derived from measured geometry ----- */
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

  const spawnPopup = (text: string, row: number, col: number, big: boolean) => {
    const el = boardRef.current;
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const b = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const id = popupId.current++;
    setPopups((p) => [
      ...p,
      { id, text, big, top: b.top - w.top + (row + 0.5) * cell, left: b.left - w.left + (col + 0.5) * cell },
    ]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    const d = drag;
    const t = target;
    setDrag(null);
    if (!t || !t.ok) return;

    const res = placePiece(game, d.trayIndex, t.row, t.col);
    if (!res.ok) return;

    if (res.lines > 0) {
      const cells: number[] = [];
      for (const r of res.clearedRows) for (let c = 0; c < BOARD_SIZE; c++) cells.push(idx(r, c));
      for (const c of res.clearedCols) for (let r = 0; r < BOARD_SIZE; r++) cells.push(idx(r, c));
      setClearing(cells);
      setTimeout(() => setClearing([]), 320);
      const streakAfter = game.streak + 1;
      const label =
        res.lines > 1
          ? `+${res.gained} ${ar ? "كومبو" : "COMBO"} ×${res.lines}`
          : streakAfter > 1
            ? `+${res.gained} ${ar ? "ستريك" : "STREAK"} ×${streakAfter}`
            : `+${res.gained}`;
      spawnPopup(label, t.row, t.col, res.lines > 1 || streakAfter > 2);
    }

    setGame(res.state);
    void e;
  };

  const restart = () => {
    setClearing([]);
    setPopups([]);
    setShownScore(0);
    setGame(createGame(makeSeed()));
  };

  const mult = 1 + Math.min(game.streak, 10) * 0.1;

  return (
    <StoreShell>
      <main dir={dir} className="blast-page">
        <section className="container blast-top">
          <Link to="/games" className="blast-back">{ar ? "‹ ساحة اللعب" : "‹ Play Arena"}</Link>
          <div className="blast-stats">
            <div className="bs-score">
              <span className="bs-lbl">{ar ? "النقاط" : "Score"}</span>
              <span className="bs-val">{shownScore.toLocaleString("en-US")}</span>
            </div>
            <div className="bs-side">
              <div className="bs-chip"><span>{ar ? "الأفضل" : "Best"}</span><b>{best.toLocaleString("en-US")}</b></div>
              <div className={"bs-chip" + (game.streak > 0 ? " hot" : "")}>
                <span>{ar ? "ستريك" : "Streak"}</span><b>{game.streak} · ×{mult.toFixed(1)}</b>
              </div>
            </div>
          </div>
        </section>

        <section className="container blast-stage">
          <div className="blast-wrap">
            <div
              ref={boardRef}
              dir="ltr"
              className="blast-board"
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
            >

              {game.board.map((v, i) => {
                const pv = previewCells.get(i);
                const cls =
                  "bb-cell" +
                  (v ? " filled" : "") +
                  (clearing.includes(i) ? " clearing" : "") +
                  (pv === true ? " pv-ok" : pv === false ? " pv-bad" : "");
                return (
                  <div key={i} className={cls} style={v ? { background: PIECE_COLORS[v] } : undefined} />
                );
              })}
            </div>

            {popups.map((p) => (
              <span key={p.id} className={"bb-pop" + (p.big ? " big" : "")} style={{ top: p.top, left: p.left }}>
                {p.text}
              </span>
            ))}

            <div className="blast-tray" dir="ltr" onPointerMove={onPointerMove} onPointerUp={finishDrag}>
              {game.tray.map((p, i) => (
                <div key={i} className={"bt-slot" + (drag?.trayIndex === i ? " dragging" : "")}>
                  {p && (
                    <div
                      className="bt-piece"
                      dir="ltr"
                      onPointerDown={(e) => onPieceDown(e, i, p)}
                      style={{ gridTemplateColumns: `repeat(${p.w}, var(--tc))`, gridTemplateRows: `repeat(${p.h}, var(--tc))` }}
                    >
                      {Array.from({ length: p.w * p.h }).map((_, k) => {
                        const r = Math.floor(k / p.w);
                        const c = k % p.w;
                        const on = p.cells.some(([cr, cc]) => cr === r && cc === c);
                        return (
                          <span
                            key={k}
                            className={"bt-cell" + (on ? " on" : "")}
                            style={on ? { background: PIECE_COLORS[p.color] } : undefined}
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
                      style={{
                        width: cell,
                        height: cell,
                        background: on ? PIECE_COLORS[drag.piece.color] : undefined,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {game.over && (
              <div className="blast-over">
                <div className="bo-card">
                  <div className="bo-ic">💥</div>
                  <h2>{ar ? "انتهت اللعبة" : "Game Over"}</h2>
                  <p>{ar ? "ما في مكان لأي قطعة من الثلاث." : "None of the three pieces fits anymore."}</p>
                  <div className="bo-score">
                    <span>{ar ? "النقاط النهائية" : "Final score"}</span>
                    <b>{game.score.toLocaleString("en-US")}</b>
                  </div>
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
