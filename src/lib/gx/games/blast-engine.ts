/* ============================================================
   GX BLAST — pure game logic (no React, no DOM).
   Safe to run on a server later for score verification.
   ============================================================ */

export const BOARD_SIZE = 8;

export type Cell = number; // 0 = empty, >0 = piece color id
export type Board = Cell[]; // length BOARD_SIZE * BOARD_SIZE, row-major

export type PieceDef = {
  id: string;
  color: number; // 1..N
  cells: Array<[number, number]>; // [row, col] offsets, normalized to 0,0
  w: number;
  h: number;
};

export type Move = {
  /** index (0..2) of the piece inside the tray shown at that moment */
  trayIndex: number;
  pieceId: string;
  row: number;
  col: number;
  clearedRows: number[];
  clearedCols: number[];
  gained: number;
};

export type GameState = {
  seed: string;
  /** internal PRNG cursor — advancing it is fully deterministic from the seed */
  rngState: number;
  board: Board;
  tray: Array<PieceDef | null>;
  score: number;
  streak: number;
  bestStreak: number;
  moves: Move[];
  over: boolean;
};

export type PlaceResult = {
  state: GameState;
  ok: boolean;
  gained: number;
  clearedRows: number[];
  clearedCols: number[];
  lines: number;
  combo: boolean;
};

/* ---------------- piece catalog (no rotation anywhere) ---------------- */

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
  // 1x1
  mk("dot", 1, ["x"]),
  // horizontal lines
  mk("h2", 2, ["xx"]),
  mk("h3", 2, ["xxx"]),
  mk("h4", 2, ["xxxx"]),
  mk("h5", 2, ["xxxxx"]),
  // vertical lines
  mk("v2", 3, ["x", "x"]),
  mk("v3", 3, ["x", "x", "x"]),
  mk("v4", 3, ["x", "x", "x", "x"]),
  mk("v5", 3, ["x", "x", "x", "x", "x"]),
  // squares
  mk("sq2", 4, ["xx", "xx"]),
  mk("sq3", 5, ["xxx", "xxx", "xxx"]),
  // 2x2 L (4 orientations)
  mk("l2a", 7, ["xx", "x."]),
  mk("l2b", 7, ["xx", ".x"]),
  mk("l2c", 7, ["x.", "xx"]),
  mk("l2d", 7, [".x", "xx"]),
  // 3x3 L (4 orientations)
  mk("l3a", 6, ["x..", "x..", "xxx"]),
  mk("l3b", 6, ["..x", "..x", "xxx"]),
  mk("l3c", 6, ["xxx", "x..", "x.."]),
  mk("l3d", 6, ["xxx", "..x", "..x"]),
  // T (3x2 / 2x3, 4 orientations)
  mk("t1", 8, ["xxx", ".x."]),
  mk("t2", 8, [".x.", "xxx"]),
  mk("t3", 8, ["x.", "xx", "x."]),
  mk("t4", 8, [".x", "xx", ".x"]),
  // S / Z
  mk("s1", 9, [".xx", "xx."]),
  mk("z1", 9, ["xx.", ".xx"]),
];

/** Generation weights: small/short shapes are common, big ones are rare. */
const PIECE_WEIGHTS: Record<string, number> = {
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

const WEIGHT_TOTAL = PIECES.reduce((sum, p) => sum + (PIECE_WEIGHTS[p.id] ?? 1), 0);

/** Tailwind-free palette: index matches PieceDef.color */
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

/* ---------------- seeded PRNG (mulberry32) ---------------- */

export function makeSeed(): string {
  // Seed creation is the only place randomness enters; everything after it is
  // derived deterministically from this string.
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

/** returns [value 0..1, nextState] — pure */
function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

function drawPiece(state: number): [PieceDef, number] {
  const [v, next] = nextRandom(state);
  let target = v * WEIGHT_TOTAL;
  for (const p of PIECES) {
    target -= PIECE_WEIGHTS[p.id] ?? 1;
    if (target <= 0) return [p, next];
  }
  return [PIECES[PIECES.length - 1], next];
}

const MAX_TRAY_ATTEMPTS = 40;

/**
 * Draws a set of three pieces that is guaranteed (when possible) to contain at
 * least one piece placeable on the CURRENT board. Fully deterministic given the
 * incoming rng state.
 */
export function drawTray(board: Board, state: number): [Array<PieceDef | null>, number] {
  let s = state;
  let fallback: Array<PieceDef | null> | null = null;
  for (let attempt = 0; attempt < MAX_TRAY_ATTEMPTS; attempt++) {
    const tray: Array<PieceDef | null> = [];
    for (let i = 0; i < 3; i++) {
      const [p, ns] = drawPiece(s);
      tray.push(p);
      s = ns;
    }
    if (!fallback) fallback = tray;
    if (tray.some((p) => p && hasAnyPlacement(board, p))) return [tray, s];
  }
  // Board is (practically) full — nothing fits; return the last attempt.
  return [fallback as Array<PieceDef | null>, s];
}

/* ---------------- board helpers ---------------- */

export function emptyBoard(): Board {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function idx(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

export function canPlace(board: Board, piece: PieceDef, row: number, col: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
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

/* ---------------- scoring ---------------- */

export function streakMultiplier(streak: number): number {
  // grows gradually, capped so it stays sane
  return 1 + Math.min(streak, 10) * 0.1;
}

function scoreFor(cellCount: number, lines: number, streakAfter: number): number {
  const placement = cellCount; // small points per placed cell
  const lineBase = lines > 0 ? 100 * lines : 0;
  const comboBonus = lines > 1 ? 50 * lines * (lines - 1) : 0; // big multi-line bonus
  const mult = lines > 0 ? streakMultiplier(streakAfter) : 1;
  return Math.round((placement + lineBase + comboBonus) * mult);
}

/* ---------------- game lifecycle ---------------- */

export function createGame(seed: string = makeSeed()): GameState {
  const rng0 = hashSeed(seed);
  const board = emptyBoard();
  const [tray, rngState] = drawTray(board, rng0);
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
  };
}

/**
 * Attempt to place tray[trayIndex] with its top-left anchor at (row, col).
 * Returns a brand-new state; the input state is never mutated.
 */
export function placePiece(state: GameState, trayIndex: number, row: number, col: number): PlaceResult {
  const piece = state.tray[trayIndex];
  const fail: PlaceResult = { state, ok: false, gained: 0, clearedRows: [], clearedCols: [], lines: 0, combo: false };
  if (state.over || !piece) return fail;
  if (!canPlace(state.board, piece, row, col)) return fail;

  const board = state.board.slice();
  for (const [dr, dc] of piece.cells) board[idx(row + dr, col + dc)] = piece.color;

  const { rows: clearedRows, cols: clearedCols } = fullLines(board);
  for (const r of clearedRows) for (let c = 0; c < BOARD_SIZE; c++) board[idx(r, c)] = 0;
  for (const c of clearedCols) for (let r = 0; r < BOARD_SIZE; r++) board[idx(r, c)] = 0;

  const lines = clearedRows.length + clearedCols.length;
  const streak = lines > 0 ? state.streak + 1 : 0;
  const gained = scoreFor(piece.cells.length, lines, streak);

  let tray: Array<PieceDef | null> = state.tray.map((p, i) => (i === trayIndex ? null : p));
  let rngState = state.rngState;
  if (tray.every((p) => p === null)) {
    const [fresh, ns] = drawTray(board, rngState);
    tray = fresh;
    rngState = ns;
  }

  const move: Move = { trayIndex, pieceId: piece.id, row, col, clearedRows, clearedCols, gained };

  const next: GameState = {
    ...state,
    board,
    tray,
    rngState,
    score: state.score + gained,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    moves: [...state.moves, move],
    over: false,
  };
  next.over = isGameOver(next.board, next.tray);

  return { state: next, ok: true, gained, clearedRows, clearedCols, lines, combo: lines > 1 };
}

/* ---------------- pure drop-coordinate resolution ---------------- */

export type BoardMetrics = {
  /** viewport x of the LEFT edge of the cell at (row 0, col 0) */
  cell0Left: number;
  /** viewport y of the TOP edge of the cell at (row 0, col 0) */
  cell0Top: number;
  /** measured cell width/height in px */
  cellW: number;
  cellH: number;
  /** measured distance between the left edges of two adjacent columns (cell + gap) */
  stepX: number;
  /** measured distance between the top edges of two adjacent rows */
  stepY: number;
};

/**
 * Maps a viewport point (the CENTER of the piece's top-left cell) to logical
 * board coordinates. Coordinates are always LTR/top-down regardless of the
 * page's text direction — the caller must measure a board that renders LTR.
 */
export function pointToCell(metrics: BoardMetrics, x: number, y: number): { row: number; col: number } {
  const col = Math.floor((x - metrics.cell0Left) / metrics.stepX);
  const row = Math.floor((y - metrics.cell0Top) / metrics.stepY);
  return { row, col };
}

/**
 * Full drop resolution: returns the anchor cell (top-left of the shape) plus
 * whether the placement is legal. Out-of-board placements are always invalid.
 */
export function resolveDrop(
  board: Board,
  piece: PieceDef,
  metrics: BoardMetrics,
  anchorCenterX: number,
  anchorCenterY: number,
): { row: number; col: number; ok: boolean } {
  const { row, col } = pointToCell(metrics, anchorCenterX, anchorCenterY);
  return { row, col, ok: canPlace(board, piece, row, col) };
}
