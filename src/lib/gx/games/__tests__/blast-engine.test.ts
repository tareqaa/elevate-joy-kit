import { describe, it, expect } from "vitest";
import {
  createGame,
  placePiece,
  canPlace,
  verifyRun,
  moveLimitMs,
  emptyBoard,
  PIECE_BY_ID,
  type SubmittedMove,
} from "../blast-engine";

describe("createGame", () => {
  it("is deterministic for a given seed", () => {
    const a = createGame("test-seed-1");
    const b = createGame("test-seed-1");
    expect(a.board).toEqual(b.board);
    expect(a.tray.map((p) => p?.id)).toEqual(b.tray.map((p) => p?.id));
    expect(a.score).toBe(0);
    expect(a.over).toBe(false);
  });

  it("differs across seeds (overwhelmingly likely)", () => {
    const a = createGame("seed-a");
    const b = createGame("seed-b");
    expect(a.tray.map((p) => p?.id)).not.toEqual(b.tray.map((p) => p?.id));
  });
});

describe("canPlace", () => {
  it("rejects out-of-bounds and negative coordinates", () => {
    const board = emptyBoard();
    const dot = PIECE_BY_ID["dot"];
    expect(canPlace(board, dot, -1, 0)).toBe(false);
    expect(canPlace(board, dot, 0, -1)).toBe(false);
    expect(canPlace(board, dot, 8, 0)).toBe(false);
    expect(canPlace(board, dot, 0, 8)).toBe(false);
    expect(canPlace(board, dot, 0, 0)).toBe(true);
  });

  it("rejects placement onto an occupied cell", () => {
    const board = emptyBoard();
    board[0] = 1; // (0,0) occupied
    const dot = PIECE_BY_ID["dot"];
    expect(canPlace(board, dot, 0, 0)).toBe(false);
  });

  it("rejects non-integer coordinates", () => {
    const board = emptyBoard();
    const dot = PIECE_BY_ID["dot"];
    expect(canPlace(board, dot, 0.5, 0)).toBe(false);
  });
});

describe("placePiece", () => {
  it("clears a full row and awards line points", () => {
    let state = createGame("line-clear-seed");
    // Fill row 0 except the last cell with a synthetic board (isolated from the tray/RNG).
    const board = emptyBoard();
    for (let c = 0; c < 7; c++) board[c] = 1;
    state = { ...state, board, tray: [PIECE_BY_ID["dot"], null, null], score: 0 };

    const res = placePiece(state, 0, 0, 7);
    expect(res.ok).toBe(true);
    expect(res.clearedRows).toEqual([0]);
    expect(res.lines).toBe(1);
    expect(res.state.board.every((v) => v === 0)); // row fully cleared (board was otherwise empty)
    expect(res.gained).toBeGreaterThan(0);
    expect(res.state.score).toBe(res.gained);
  });

  it("refuses an illegal placement and leaves state untouched", () => {
    const state = createGame("illegal-seed");
    const piece = state.tray[0]!;
    const res = placePiece(state, 0, 20, 20, 100);
    expect(res.ok).toBe(false);
    expect(res.state).toBe(state);
    expect(piece).toBeTruthy();
  });
});

describe("verifyRun — server-side replay verification", () => {
  function playOneLegitMove(seed: string) {
    const state = createGame(seed);
    const piece = state.tray[0]!;
    const result = placePiece(state, 0, 0, 0, 100);
    expect(result.ok).toBe(true);
    const move: SubmittedMove = {
      trayIndex: 0,
      pieceId: piece.id,
      row: 0,
      col: 0,
      durationMs: 100,
    };
    return { seed, move, finalScore: result.state.score };
  }

  it("accepts a faithfully replayed run and recomputes the same score", () => {
    const { seed, move, finalScore } = playOneLegitMove("verify-happy-path");
    const res = verifyRun({ seed, moves: [move], claimedScore: finalScore });
    expect(res.valid).toBe(true);
    expect(res.score).toBe(finalScore);
  });

  it("rejects a claimed score that doesn't match the replayed score", () => {
    const { seed, move, finalScore } = playOneLegitMove("verify-score-mismatch");
    const res = verifyRun({ seed, moves: [move], claimedScore: finalScore + 999 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("score-mismatch");
  });

  it("rejects an illegal placement in the move log", () => {
    const seed = "verify-illegal-move";
    const piece = createGame(seed).tray[0]!;
    const badMove: SubmittedMove = {
      trayIndex: 0,
      pieceId: piece.id,
      row: 99,
      col: 99,
      durationMs: 100,
    };
    const res = verifyRun({ seed, moves: [badMove], claimedScore: 0 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("illegal-placement");
  });

  it("rejects a move whose claimed piece doesn't match the actual tray", () => {
    const seed = "verify-tray-mismatch";
    const state = createGame(seed);
    const realPiece = state.tray[0]!;
    const wrongId = Object.keys(PIECE_BY_ID).find((id) => id !== realPiece.id)!;
    const badMove: SubmittedMove = {
      trayIndex: 0,
      pieceId: wrongId,
      row: 0,
      col: 0,
      durationMs: 100,
    };
    const res = verifyRun({ seed, moves: [badMove], claimedScore: 0 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("tray-mismatch");
  });

  it("rejects a move that took longer than the allowed time limit", () => {
    const seed = "verify-move-timeout";
    const state = createGame(seed);
    const piece = state.tray[0]!;
    const tooSlow = moveLimitMs(0) + 100_000;
    const badMove: SubmittedMove = {
      trayIndex: 0,
      pieceId: piece.id,
      row: 0,
      col: 0,
      durationMs: tooSlow,
    };
    const res = verifyRun({ seed, moves: [badMove], claimedScore: 0 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("move-timeout");
  });
});
