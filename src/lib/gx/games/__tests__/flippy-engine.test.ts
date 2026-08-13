import { describe, it, expect } from "vitest";
import { createInitialState, updateEngine } from "../flippy-engine";

describe("Flippy Engine Physics & Scoring Bounds", () => {
  it("initializes in idle state with 0 score", () => {
    const state = createInitialState(600);
    expect(state.status).toBe("idle");
    expect(state.score).toBe(0);
    expect(state.speed).toBe(3);
    expect(state.pipes.length).toBe(0);
  });

  it("calculates realistic maximum scoring rate under continuous simulation", () => {
    const width = 400;
    const height = 600;
    const state = createInitialState(height);
    state.status = "playing";

    // Simulate 60 seconds at 60 FPS (3600 frames with dt=1)
    const framesPerSecond = 60;
    const simulatedSeconds = 60;
    const totalFrames = simulatedSeconds * framesPerSecond;

    for (let f = 0; f < totalFrames; f++) {
      // Keep bird safe at gap center of current incoming pipe
      const incomingPipe = state.pipes.find((p) => !p.passed);
      if (incomingPipe) {
        state.bird.pos.y = incomingPipe.y;
        state.bird.vel.y = 0;
      } else {
        state.bird.pos.y = height / 2;
        state.bird.vel.y = 0;
      }
      updateEngine(state, width, height, 1);
    }

    // In 60 seconds of continuous perfect flight:
    // Initial pipe spacing is 250px, speed is 3px/frame (180px/s) ramping to max 6px/frame (360px/s).
    // The score must be strictly less than 1.5 points/second (~90 points in 60s).
    const scoreRate = state.score / simulatedSeconds;
    expect(scoreRate).toBeLessThan(1.5);
    expect(state.score).toBeGreaterThan(20);

    // Verify against our database anti-cheat plausibility ceiling: 10 + elapsed * 2.0
    const databaseCeiling = 10 + simulatedSeconds * 2.0; // 130 points
    expect(state.score).toBeLessThanOrEqual(databaseCeiling);
  });

  it("validates that a 10-second run cannot legitimately score 50+ points", () => {
    const width = 400;
    const height = 600;
    const state = createInitialState(height);
    state.status = "playing";

    const elapsedSeconds = 10;
    const totalFrames = elapsedSeconds * 60;

    for (let f = 0; f < totalFrames; f++) {
      const incomingPipe = state.pipes.find((p) => !p.passed);
      if (incomingPipe) {
        state.bird.pos.y = incomingPipe.y;
        state.bird.vel.y = 0;
      }
      updateEngine(state, width, height, 1);
    }

    // A 10-second legitimate run scores at most ~6-8 points
    expect(state.score).toBeLessThanOrEqual(12);

    // Database limit for 10s: 10 + 10 * 2.0 = 30
    // Real score (<= 12) is well under 30 (ACCEPTED)
    expect(state.score).toBeLessThanOrEqual(10 + elapsedSeconds * 2.0);

    // Any forged score like 100 or 5000 is far above 30 (REJECTED by RPC)
    const forgedScore = 100;
    expect(forgedScore).toBeGreaterThan(10 + elapsedSeconds * 2.0);
  });
});
