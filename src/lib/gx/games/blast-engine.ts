/* ============================================================
   GX BLAST — pure game logic.
   NO React. NO DOM. NO browser APIs (except Math.random inside
   makeSeed(), which is the only entropy source and is never used
   during a run). The server runs this exact file to re-verify a
   submitted score, so every rule and every number lives here.
   ============================================================ */

/* ============================================================
   TUNABLES — everything adjustable lives in this block.
   ============================================================ */

export const BOARD_SIZE = 8;

/** points per completed line (rows + cols counted together) */
export const LINE_POINTS = 80;

/** one-shot bonus for clearing L lines in a single move */
export const MULTI_CLEAR_BONUS: Record<number, number> = {
  1: 0,
  2: 30,
  3: 60,
  4: 120,
  5: 200,
};
/** used for L >= 6 (hard cap) */
export const MULTI_CLEAR_BONUS_MAX = 300;

/** streak multiplier is capped at this value */
export const MAX_STREAK_MULT = 8;

/** awarded when the board becomes completely empty after a clear */
export const CLEAR_BOARD_BONUS = 360;

/** per-move time limit by accumulated score (ms). Evaluated top-down.
 *  SINGLE SOURCE OF TRUTH — the server verifier reads this same table. */
export const MOVE_TIME_TABLE: Array<{ minScore: number; ms: number }> = [
  { minScore: 20000, ms: 5000 },
  { minScore: 14000, ms: 6000 },
  { minScore: 9000, ms: 7000 },
  { minScore: 5000, ms: 8000 },
  { minScore: 2000, ms: 9000 },
  { minScore: 0, ms: 10000 },
];

/** absolute floor — never go below this per-move time */
export const MIN_MOVE_TIME_MS = 5000;


/** base generation weights: small shapes common, board-killers rare */
export const PIECE_WEIGHTS: Record<string, number> = {
  dot: 10,
  h2: 12, v2: 12,
  h3: 10, v3: 10,
  h4: 5, v4: 5,
  h5: 2, v5: 2,
  sq2: 9,
  sq3: 1.2,
  l2a: 8, l2b: 8, l2c: 8, l2d: 8,
  l3a: 3, l3b: 3, l3c: 3, l3d: 3,
  t1: 4, t2: 4, t3: 4, t4: 4,
  s1: 3, z1: 3,
};

/** difficulty ramp — driven by ACCUMULATED SCORE only (never wall time) */
export const DIFFICULTY = {
  /** every this many points, one ramp step is applied */
  scoreStep: 2500,
  /** ramp steps are capped here */
  maxSteps: 6,
  /** per step: multiply "hard" shape weights by (1 + hardGain) */
  hardGain: 0.35,
  /** per step: multiply "easy" shape weights by (1 - easyLoss) */
  easyLoss: 0.12,
  /** shapes considered hard / board-killing */
  hard: ["sq3", "h5", "v5", "h4", "v4", "l3a", "l3b", "l3c", "l3d", "s1", "z1", "t1", "t2", "t3", "t4"],
  /** shapes considered easy */
  easy: ["dot", "h2", "v2", "h3", "v3"],
};

/** max attempts when drawing a solvable tray */
export const MAX_TRAY_ATTEMPTS = 40;

/** tolerated client/server clock slack when verifying a run (ms) */
export const VERIFY_TIME_SLACK_MS = 4000;

/* ============================================================
   TYPES
   ============================================================ */

export type Cell = number; // 0 = empty, >0 = piece color id
export type Board = Cell[]; // length BOARD_SIZE * BOARD_SIZE, row-major

export type PieceDef = {
  id: string;
  color: number;
  cells: Array<[number, number]>; // [row, col] offsets normalized to 0,0
  w: number;
  h: number;
};

export type Move = {
  trayIndex: number;
  pieceId: string;
  row: number;
  col: number;
  clearedRows: number[];
  clearedCols: number[];
  gained: number;
  /** how long the player took for this move, in milliseconds */
  durationMs: number;
};

export type EndReason = "blocked" | "timeout" | null;

export type GameState = {
  seed: string;
  rngState: number;
  board: Board;
  tray: Array<PieceDef | null>;
  score: number;
  streak: number;
  bestStreak: number;
  moves: Move[];
  over: boolean;
  endReason: EndReason;
  /** time limit (ms) that applies to the NEXT move at the current score */
  moveLimitMs: number;
};

export type PlaceResult = {
  state: GameState;
  ok: boolean;
  gained: number;
  placementPoints: number;
  clearPoints: number;
  boardClearBonus: number;
  clearedRows: number[];
  clearedCols: number[];
  lines: number;
  combo: boolean;
  multiplier: number;
};

/* ============================================================
   PIECE CATALOG — standard shapes only, no rotation at runtime,
   so every orientation is its own entry.
   ============================================================ */

function mk(id: string, color: number, rows: string[]): PieceDef {
  const cells: Array<[number, number]> = [];
  rows.forEach((line, r) => {
    line.split("").forEach((ch, c) => {
      if (ch !== ".") cells.push([r, c]);
    });
  });
  return { id, color, cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

export const PIECES: PieceDef[] = [
  mk("dot", 1, ["x"]),
  mk("h2", 2, ["xx"]),
  mk("h3", 2, ["xxx"]),
  mk("h4", 2, ["xxxx"]),
  mk("h5", 2, ["xxxxx"]),
  mk("v2", 3, ["x", "x"]),
  mk("v3", 3, ["x", "x", "x"]),
  mk("v4", 3, ["x", "x", "x", "x"]),
  mk("v5", 3, ["x", "x", "x", "x", "x"]),
  mk("sq2", 4, ["xx", "xx"]),
  mk("sq3", 5, ["xxx", "xxx", "xxx"]),
  mk("l2a", 7, ["xx", "x."]),
  mk("l2b", 7, ["xx", ".x"]),
  mk("l2c", 7, ["x.", "xx"]),
  mk("l2d", 7, [".x", "xx"]),
  mk("l3a", 6, ["x..", "x..", "xxx"]),
  mk("l3b", 6, ["..x", "..x", "xxx"]),
  mk("l3c", 6, ["xxx", "x..", "x.."]),
  mk("l3d", 6, ["xxx", "..x", "..x"]),
  mk("t1", 8, ["xxx", ".x."]),
  mk("t2", 8, [".x.", "xxx"]),
  mk("t3", 8, ["x.", "xx", "x."]),
  mk("t4", 8, [".x", "xx", ".x"]),
  mk("s1", 9, [".xx", "xx."]),
  mk("z1", 9, ["xx.", ".xx"]),
];

export const PIECE_BY_ID: Record<string, PieceDef> = Object.fromEntries(
  PIECES.map((p) => [p.id, p]),
);

/** palette: index matches PieceDef.color */
export const PIECE_COLORS: Record<number, string> = {
  1: "#00e5ff",
  2: "#ff2d78",
  3: "#c6ff3d",
  4: "#a855f7",
  5: "#ffb020",
  6: "#3b82f6",
  7: "#22d3a7",
  8: "#f472b6",
  9: "#f97316",
};

/* ============================================================
   DIFFICULTY / TIME
   ============================================================ */

export function difficultySteps(score: number): number {
  if (!(score > 0)) return 0;
  return Math.min(DIFFICULTY.maxSteps, Math.floor(score / DIFFICULTY.scoreStep));
}

/** weight of a shape at a given accumulated score (score-driven ramp only) */
export function pieceWeight(id: string, score: number): number {
  const base = PIECE_WEIGHTS[id] ?? 1;
  const steps = difficultySteps(score);
  if (steps === 0) return base;
  if (DIFFICULTY.hard.includes(id)) return base * Math.pow(1 + DIFFICULTY.hardGain, steps);
  if (DIFFICULTY.easy.includes(id)) return base * Math.pow(1 - DIFFICULTY.easyLoss, steps);
  return base;
}

/** per-move time limit (ms) for the given accumulated score */
export function moveLimitMs(score: number): number {
  for (const row of MOVE_TIME_TABLE) {
    if (score >= row.minScore) return Math.max(MIN_MOVE_TIME_MS, row.ms);
  }
  return Math.max(MIN_MOVE_TIME_MS, MOVE_TIME_TABLE[MOVE_TIME_TABLE.length - 1].ms);
}

/* ============================================================
   SEEDED PRNG (mulberry32) — deterministic after seed creation
   ============================================================ */

export function makeSeed(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function nextRandom(state: number): [number, number] {
  const t = (state + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

function drawPiece(state: number, score: number): [PieceDef, number] {
  const [v, next] = nextRandom(state);
  let total = 0;
  for (const p of PIECES) total += pieceWeight(p.id, score);
  let target = v * total;
  for (const p of PIECES) {
    target -= pieceWeight(p.id, score);
    if (target <= 0) return [p, next];
  }
  return [PIECES[PIECES.length - 1], next];
}

/**
 * Applies a placement (including line clears) and returns the resulting board.
 * Used only by the tray solvability search — no scoring involved.
 */
function simulatePlacement(board: Board, piece: PieceDef, row: number, col: number): Board {
  const b = board.slice();
  for (const [dr, dc] of piece.cells) b[idx(row + dr, col + dc)] = piece.color;
  const { rows, cols } = fullLines(b);
  for (const r of rows) for (let c = 0; c < BOARD_SIZE; c++) b[idx(r, c)] = 0;
  for (const c of cols) for (let r = 0; r < BOARD_SIZE; r++) b[idx(r, c)] = 0;
  return b;
}

/**
 * True when the given pieces can ALL be placed in SOME order on the board,
 * taking line clears into account. This is the Block Blast rule: a tray is only
 * dealt if a full solution exists — losing must always be the player's mistake.
 */
export function canPlaceAll(board: Board, pieces: PieceDef[]): boolean {
  if (pieces.length === 0) return true;
  // cheap prune: if any single piece fits nowhere right now, no order can work
  if (pieces.length > 1 && !pieces.every((p) => hasAnyPlacement(board, p))) {
    // it may still fit after a clear, so only prune when nothing clears
    if (!pieces.some((p) => hasAnyPlacement(board, p))) return false;
  }
  const seen = new Set<string>();
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (seen.has(piece.id)) continue;
    seen.add(piece.id);
    const rest = pieces.filter((_, j) => j !== i);
    for (let r = 0; r <= BOARD_SIZE - piece.h; r++) {
      for (let c = 0; c <= BOARD_SIZE - piece.w; c++) {
        if (!canPlace(board, piece, r, c)) continue;
        if (canPlaceAll(simulatePlacement(board, piece, r, c), rest)) return true;
      }
    }
  }
  return false;
}

/* ============================================================
   INTELLIGENT (ADAPTIVE) PIECE GENERATION
   Deterministic: every random draw still comes from the seeded
   rng state, so the server replays the exact same trays.
   ============================================================ */

/** tuning for the adaptive generator */
export const GEN = {
  /** how many candidate trays are sampled per draw */
  candidates: 14,
  /** how many valid candidates are enough to stop sampling early */
  enough: 10,
  /** how many candidates are kept for the weighted pick (wide = less scripted) */
  shortlist: 9,
  /** softness of the weighted pick (lower = far from "always the best") */
  sharpness: 0.55,
  /** how much the sharpness drops per difficulty step (less help over time) */
  sharpnessDecay: 0.06,
  /** penalty for a piece that completes a line right now with no planning */
  instantClearPenalty: 26,
  /** bonus when at least two pieces are usable on the current board */
  twoOptionBonus: 45,
};


/** empty cells whose 4 neighbours are all blocked (edges count as blocked) */
function countHoles(board: Board): number {
  let holes = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[idx(r, c)] !== 0) continue;
      const up = r === 0 || board[idx(r - 1, c)] !== 0;
      const dn = r === BOARD_SIZE - 1 || board[idx(r + 1, c)] !== 0;
      const lf = c === 0 || board[idx(r, c - 1)] !== 0;
      const rt = c === BOARD_SIZE - 1 || board[idx(r, c + 1)] !== 0;
      if (up && dn && lf && rt) holes++;
    }
  }
  return holes;
}

/** free (fully empty) 3x3 windows — a good proxy for "big open space" */
function countFree3x3(board: Board): number {
  let n = 0;
  for (let r = 0; r <= BOARD_SIZE - 3; r++) {
    outer: for (let c = 0; c <= BOARD_SIZE - 3; c++) {
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++) if (board[idx(r + dr, c + dc)] !== 0) continue outer;
      n++;
    }
  }
  return n;
}

function countPlacements(board: Board, piece: PieceDef, cap = 999): number {
  let n = 0;
  for (let r = 0; r <= BOARD_SIZE - piece.h; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.w; c++) {
      if (canPlace(board, piece, r, c)) {
        n++;
        if (n >= cap) return n;
      }
    }
  }
  return n;
}

/** how much freedom of movement the board still offers (0..1-ish) */
function boardFreedom(board: Board): number {
  let total = 0;
  let weight = 0;
  for (const p of PIECES) {
    const w = PIECE_WEIGHTS[p.id] ?? 1;
    weight += w;
    total += w * Math.min(1, countPlacements(board, p, 6) / 6);
  }
  return weight === 0 ? 0 : total / weight;
}

function density(board: Board): number {
  let filled = 0;
  for (let i = 0; i < board.length; i++) if (board[i] !== 0) filled++;
  return filled / board.length;
}

/** rows/cols that only need a few cells to complete */
function nearComplete(board: Board): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    let empty = 0;
    for (let c = 0; c < BOARD_SIZE; c++) if (board[idx(r, c)] === 0) empty++;
    if (empty > 0 && empty <= 2) n++;
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let empty = 0;
    for (let r = 0; r < BOARD_SIZE; r++) if (board[idx(r, c)] === 0) empty++;
    if (empty > 0 && empty <= 2) n++;
  }
  return n;
}

/** value of a single placement: lines cleared, holes made, space kept */
function placementValue(board: Board, piece: PieceDef, row: number, col: number): number {
  const after = simulatePlacement(board, piece, row, col);
  let filledBefore = 0;
  for (let i = 0; i < board.length; i++) if (board[i] !== 0) filledBefore++;
  let filledAfter = 0;
  for (let i = 0; i < after.length; i++) if (after[i] !== 0) filledAfter++;
  const cleared = filledBefore + piece.cells.length - filledAfter; // cells removed by clears
  const holeDelta = countHoles(after) - countHoles(board);
  return cleared * 1.6 - holeDelta * 6 + countFree3x3(after) * 0.6;
}

/**
 * Greedily plays the three pieces (best-first) and returns the resulting board,
 * or null when no order works. Cheap approximation of "a reasonable path".
 */
function greedyPlay(board: Board, pieces: PieceDef[]): { board: Board; value: number } | null {
  let b = board;
  let value = 0;
  const left = pieces.slice();
  while (left.length > 0) {
    let best: { i: number; r: number; c: number; v: number } | null = null;
    for (let i = 0; i < left.length; i++) {
      const p = left[i];
      for (let r = 0; r <= BOARD_SIZE - p.h; r++) {
        for (let c = 0; c <= BOARD_SIZE - p.w; c++) {
          if (!canPlace(b, p, r, c)) continue;
          const v = placementValue(b, p, r, c);
          if (!best || v > best.v) best = { i, r, c, v };
        }
      }
    }
    if (!best) return null;
    b = simulatePlacement(b, left[best.i], best.r, best.c);
    value += best.v;
    left.splice(best.i, 1);
  }
  return { board: b, value };
}

/** true when the piece can clear a line right now, with no setup by the player */
function clearsImmediately(board: Board, piece: PieceDef): boolean {
  for (let r = 0; r <= BOARD_SIZE - piece.h; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.w; c++) {
      if (!canPlace(board, piece, r, c)) continue;
      const b = board.slice();
      for (const [dr, dc] of piece.cells) b[idx(r + dr, c + dc)] = piece.color;
      const { rows, cols } = fullLines(b);
      if (rows.length > 0 || cols.length > 0) return true;
    }
  }
  return false;
}

/** how many of the pieces are placeable on the CURRENT board */
function usableCount(board: Board, pieces: PieceDef[]): number {
  let n = 0;
  for (const p of pieces) if (hasAnyPlacement(board, p)) n++;
  return n;
}

/** quality of a full 3-piece set against the current board */
function evaluateTray(board: Board, pieces: PieceDef[], score: number): number {
  const usable = usableCount(board, pieces);
  if (usable === 0) return -1e6; // unfair: nothing can be played at all

  const played = greedyPlay(board, pieces);
  const dens = density(board);
  const steps = difficultySteps(score);
  const help = Math.max(0, 1 - steps * 0.12); // generator assistance fades with score
  const after = played ? played.board : board;
  const freedomWeight = (30 + dens * 45) * help;

  let q = 0;
  if (played) {
    q += played.value * 0.5;
    q += 8; // a fully playable tray is nice, not mandatory
  }
  q += boardFreedom(after) * freedomWeight;
  q -= countHoles(after) * 4;
  q += countFree3x3(after) * 0.8 * help;
  // near-complete lines are only a mild plus, never a handed-over solution
  q += nearComplete(after) * 0.8 * help;

  // ---- diversity of the set: at least two usable pieces in the common case
  if (usable >= 2) q += GEN.twoOptionBonus;
  if (usable >= 3) q += 10;
  if (usable === 1) q -= 55;

  // ---- discourage the "perfect piece": instant line completions are rare rewards
  let instant = 0;
  for (const p of pieces) if (clearsImmediately(board, p)) instant++;
  q -= instant * GEN.instantClearPenalty * (1 + steps * 0.15);

  // per-piece freedom on the CURRENT board (many options = planning space)
  let options = 0;
  for (const p of pieces) options += Math.min(8, countPlacements(board, p, 8));
  q += options * 0.4 * help;

  // variety of shapes
  const unique = new Set(pieces.map((p) => p.id)).size;
  q += (unique - 1) * 3;

  // difficulty ramp: bigger pieces / less comfort as the score grows
  let cells = 0;
  for (const p of pieces) cells += p.cells.length;
  q += steps * cells * 0.5;
  q -= steps * dens * 6;

  return q;
}

/**
 * Draws three pieces using board analysis + weighted candidate selection.
 * The only hard guarantee is that at least one piece is placeable somewhere
 * (no unfair loss); everything else is a soft, deliberately imperfect bias.
 * Fully deterministic given the rng state.
 */
export function drawTray(board: Board, state: number, score: number): [Array<PieceDef | null>, number] {
  let s = state;
  let fallback: PieceDef[] | null = null;
  let partial: PieceDef[] | null = null;

  const scored: Array<{ tray: PieceDef[]; q: number }> = [];
  const seenKeys = new Set<string>();

  const attempts = Math.min(MAX_TRAY_ATTEMPTS, GEN.candidates);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const tray: PieceDef[] = [];
    for (let i = 0; i < 3; i++) {
      const [p, ns] = drawPiece(s, score);
      tray.push(p);
      s = ns;
    }
    if (!fallback) fallback = tray;

    const key = tray
      .map((p) => p.id)
      .sort()
      .join("|");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    // hard rejection only for trays that trap the player instantly
    if (!tray.some((p) => hasAnyPlacement(board, p))) continue;
    if (!partial) partial = tray;

    const q = evaluateTray(board, tray, score);
    if (q <= -1e5) continue;
    scored.push({ tray, q });
    if (scored.length >= GEN.enough) break;
  }

  if (scored.length === 0) {
    return [((partial ?? fallback) as PieceDef[]).slice(), s];
  }

  // keep a WIDE shortlist and pick with a soft weighting, so mid-quality sets
  // appear often and the tray never feels like a handed-over solution
  scored.sort((a, b) => b.q - a.q);
  const shortlist = scored.slice(0, GEN.shortlist);
  const top = shortlist[0].q;
  const bottom = shortlist[shortlist.length - 1].q;
  const span = Math.max(1, top - bottom);
  const steps = difficultySteps(score);
  const sharpness = Math.max(0.25, GEN.sharpness - steps * GEN.sharpnessDecay);

  const weights = shortlist.map((c) => Math.pow((c.q - bottom) / span + 0.55, sharpness));
  const totalW = weights.reduce((a, b) => a + b, 0);

  const [v, ns] = nextRandom(s);
  s = ns;
  let target = v * totalW;
  let chosen = shortlist[0].tray;
  for (let i = 0; i < shortlist.length; i++) {
    target -= weights[i];
    if (target <= 0) {
      chosen = shortlist[i].tray;
      break;
    }
  }

  return [chosen.slice(), s];
}




/* ============================================================
   BOARD HELPERS
   ============================================================ */

export function emptyBoard(): Board {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function idx(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

/**
 * Single source of truth for placement validity.
 * Anchor = top-left cell of the piece bounding box (same anchor used by the
 * preview, the drop and the tray "dead piece" check).
 */
export function canPlace(board: Board, piece: PieceDef, row: number, col: number): boolean {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  // full bounding-box rejection (width AND height)
  if (row < 0 || col < 0) return false;
  if (row + piece.h > BOARD_SIZE || col + piece.w > BOARD_SIZE) return false;
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    // per-cell rejection: one cell outside 0..7 invalidates the whole placement
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    if (board[idx(r, c)] !== 0) return false;
  }
  return true;
}


export function hasAnyPlacement(board: Board, piece: PieceDef): boolean {
  for (let r = 0; r <= BOARD_SIZE - piece.h; r++) {
    for (let c = 0; c <= BOARD_SIZE - piece.w; c++) {
      if (canPlace(board, piece, r, c)) return true;
    }
  }
  return false;
}

/** end-of-round check: only the pieces STILL IN the tray count */
export function isGameOver(board: Board, tray: Array<PieceDef | null>): boolean {
  const remaining = tray.filter(Boolean) as PieceDef[];
  if (remaining.length === 0) return false;
  return !remaining.some((p) => hasAnyPlacement(board, p));
}

function fullLines(board: Board): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    let full = true;
    for (let c = 0; c < BOARD_SIZE; c++) if (board[idx(r, c)] === 0) { full = false; break; }
    if (full) rows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) if (board[idx(r, c)] === 0) { full = false; break; }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

/* ============================================================
   SCORING
   ============================================================ */

export function multiClearBonus(lines: number): number {
  if (lines <= 0) return 0;
  if (lines >= 6) return MULTI_CLEAR_BONUS_MAX;
  return MULTI_CLEAR_BONUS[lines] ?? 0;
}

/** streak multiplier = streak counter AFTER increment, capped */
export function streakMultiplier(streak: number): number {
  return Math.max(1, Math.min(MAX_STREAK_MULT, streak));
}

/* ============================================================
   GAME LIFECYCLE
   ============================================================ */

export function createGame(seed: string = makeSeed()): GameState {
  const rng0 = hashSeed(seed);
  const board = emptyBoard();
  const [tray, rngState] = drawTray(board, rng0, 0);
  return {
    seed,
    rngState,
    board,
    tray,
    score: 0,
    streak: 0,
    bestStreak: 0,
    moves: [],
    over: false,
    endReason: null,
    moveLimitMs: moveLimitMs(0),
  };
}

/** ends the round because the current move's timer expired */
export function timeoutGame(state: GameState): GameState {
  if (state.over) return state;
  return { ...state, over: true, endReason: "timeout" };
}

/**
 * Place tray[trayIndex] with its top-left anchor at (row, col).
 * Returns a brand-new state; the input is never mutated.
 * Order of operations follows the spec exactly.
 */
export function placePiece(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
  durationMs = 0,
): PlaceResult {
  const piece = state.tray[trayIndex];
  const fail: PlaceResult = {
    state, ok: false, gained: 0, placementPoints: 0, clearPoints: 0, boardClearBonus: 0,
    clearedRows: [], clearedCols: [], lines: 0, combo: false, multiplier: 1,
  };
  // 1. validity
  if (state.over || !piece) return fail;
  if (!canPlace(state.board, piece, row, col)) return fail;

  // 2. commit + placement points (never multiplied)
  const board = state.board.slice();
  for (const [dr, dc] of piece.cells) board[idx(row + dr, col + dc)] = piece.color;
  const placementPoints = piece.cells.length;

  // 3. detect ALL complete lines before clearing any of them
  const { rows: clearedRows, cols: clearedCols } = fullLines(board);

  // 4. clear them all at once, no gravity
  for (const r of clearedRows) for (let c = 0; c < BOARD_SIZE; c++) board[idx(r, c)] = 0;
  for (const c of clearedCols) for (let r = 0; r < BOARD_SIZE; r++) board[idx(r, c)] = 0;

  // 5-6. score + streak
  const lines = clearedRows.length + clearedCols.length;
  const streak = lines > 0 ? state.streak + 1 : 0;
  const multiplier = lines > 0 ? streakMultiplier(streak) : 1;
  const clearPoints = lines > 0 ? (lines * LINE_POINTS + multiClearBonus(lines)) * multiplier : 0;

  // 7. empty-board bonus (added after the multiplier, unaffected by it)
  const boardEmpty = lines > 0 && board.every((v) => v === 0);
  const boardClearBonus = boardEmpty ? CLEAR_BOARD_BONUS : 0;

  const gained = placementPoints + clearPoints + boardClearBonus;
  const score = state.score + gained;

  // 8. refill the tray when all three pieces have been placed
  let tray: Array<PieceDef | null> = state.tray.map((p, i) => (i === trayIndex ? null : p));
  let rngState = state.rngState;
  if (tray.every((p) => p === null)) {
    const [fresh, ns] = drawTray(board, rngState, score);
    tray = fresh;
    rngState = ns;
  }

  const move: Move = {
    trayIndex, pieceId: piece.id, row, col, clearedRows, clearedCols, gained,
    durationMs: Math.max(0, Math.round(durationMs)),
  };

  const next: GameState = {
    ...state,
    board,
    tray,
    rngState,
    score,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    moves: [...state.moves, move],
    over: false,
    endReason: null,
    moveLimitMs: moveLimitMs(score),
  };

  // 9. finally, end-of-round check
  if (isGameOver(next.board, next.tray)) {
    next.over = true;
    next.endReason = "blocked";
  }

  return {
    state: next, ok: true, gained, placementPoints, clearPoints, boardClearBonus,
    clearedRows, clearedCols, lines, combo: lines > 1, multiplier,
  };
}

/* ============================================================
   SERVER-SIDE VERIFICATION
   Replays a submitted move log from the seed and re-derives the
   score, the per-move time limits and the end condition.
   ============================================================ */

export type SubmittedMove = {
  trayIndex: number;
  pieceId: string;
  row: number;
  col: number;
  durationMs: number;
};

export type VerifyInput = {
  seed: string;
  moves: SubmittedMove[];
  claimedScore: number;
  /** server-clock timestamps, in ms */
  startedAtMs?: number;
  submittedAtMs?: number;
};

export type VerifyResult = {
  valid: boolean;
  score: number;
  endReason: EndReason;
  reason?: string;
  moveIndex?: number;
};

export function verifyRun(input: VerifyInput): VerifyResult {
  let state = createGame(input.seed);
  let elapsed = 0;
  let trayAccumMs = 0;

  for (let i = 0; i < input.moves.length; i++) {
    const m = input.moves[i];
    if (state.over) {
      return { valid: false, score: state.score, endReason: state.endReason, reason: "move-after-game-over", moveIndex: i };
    }
    // time limit is re-derived from the accumulated score, never trusted from the client
    const limit = moveLimitMs(state.score);
    const dur = Math.max(0, Math.round(m.durationMs ?? 0));
    trayAccumMs += dur;
    if (trayAccumMs > limit) {
      return { valid: false, score: state.score, endReason: "timeout", reason: "move-timeout", moveIndex: i };
    }
    elapsed += dur;


    const piece = state.tray[m.trayIndex];
    if (!piece || piece.id !== m.pieceId) {
      return { valid: false, score: state.score, endReason: state.endReason, reason: "tray-mismatch", moveIndex: i };
    }
    const res = placePiece(state, m.trayIndex, m.row, m.col, dur);
    if (!res.ok) {
      return { valid: false, score: state.score, endReason: state.endReason, reason: "illegal-placement", moveIndex: i };
    }
    const refilled = state.tray.filter(Boolean).length === 1; // if only 1 piece was left, this move (m.trayIndex) refilled it
    if (refilled) trayAccumMs = 0;
    state = res.state;
  }


  if (state.score !== input.claimedScore) {
    return { valid: false, score: state.score, endReason: state.endReason, reason: "score-mismatch" };
  }

  if (typeof input.startedAtMs === "number" && typeof input.submittedAtMs === "number") {
    const wall = input.submittedAtMs - input.startedAtMs;
    if (wall < 0 || elapsed > wall + VERIFY_TIME_SLACK_MS) {
      return { valid: false, score: state.score, endReason: state.endReason, reason: "time-inconsistent" };
    }
  }

  // the round must actually be finished: board blocked, or the client reported a timeout
  return { valid: true, score: state.score, endReason: state.endReason };
}
