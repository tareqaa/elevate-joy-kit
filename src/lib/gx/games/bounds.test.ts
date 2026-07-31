import { describe, it, expect } from "vitest";
import { canPlace, emptyBoard, BOARD_SIZE } from "@/lib/gx/games/blast-engine";
const piece = (cells:[number,number][], w:number, h:number) => ({ id:"t", color:1, cells, w, h }) as any;
const vline = (n:number) => piece(Array.from({length:n},(_,i)=>[i,0] as [number,number]),1,n);
const hline = (n:number) => piece(Array.from({length:n},(_,i)=>[0,i] as [number,number]),n,1);
const sq3 = piece([0,1,2].flatMap(r=>[0,1,2].map(c=>[r,c] as [number,number])),3,3);
describe("bounds", () => {
  const b = emptyBoard();
  it("v5 top ok, row4+ rejected", () => {
    expect(canPlace(b, vline(5), 0, 0)).toBe(true);
    expect(canPlace(b, vline(5), 3, 0)).toBe(true);
    expect(canPlace(b, vline(5), 4, 0)).toBe(false);
    expect(canPlace(b, vline(5), 5, 0)).toBe(false);
    expect(canPlace(b, vline(4), 5, 0)).toBe(false);
  });
  it("h5 edges", () => {
    expect(canPlace(b, hline(5), 0, 3)).toBe(true);
    expect(canPlace(b, hline(5), 0, 4)).toBe(false);
    expect(canPlace(b, hline(5), 0, -1)).toBe(false);
  });
  it("3x3 corners", () => {
    expect(canPlace(b, sq3, 0, 0)).toBe(true);
    expect(canPlace(b, sq3, 5, 5)).toBe(true);
    expect(canPlace(b, sq3, 6, 5)).toBe(false);
    expect(canPlace(b, sq3, 5, 6)).toBe(false);
    expect(canPlace(b, sq3, BOARD_SIZE-1, BOARD_SIZE-1)).toBe(false);
  });
});
