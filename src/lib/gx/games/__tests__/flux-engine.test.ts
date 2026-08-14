import { describe, it, expect } from "vitest";
import {
  createInitialFluxState,
  shiftLane,
  setDirectLane,
  updateFluxEngine,
  calculatePhase,
} from "../flux-engine";
import { FLUX_COLORS } from "../flux-types";

describe("GX Flux 3D Core Game Engine", () => {
  it("initializes in idle status with 0 score and cyan color", () => {
    const state = createInitialFluxState();
    expect(state.status).toBe("idle");
    expect(state.score).toBe(0);
    expect(state.combo).toBe(0);
    expect(state.playerLane).toBe(0);
    expect(state.targetLane).toBe(0);
    expect(state.playerColor).toBe("cyan");
    expect(state.gates.length).toBeGreaterThan(0);
  });

  it("handles responsive lane shifting with clamping to [-1, 0, 1]", () => {
    const state = createInitialFluxState();
    state.status = "playing";

    // Shift left from Center (0) -> Left (-1)
    expect(shiftLane(state, -1)).toBe(true);
    expect(state.targetLane).toBe(-1);

    // Shift left again -> clamped to -1 (returns false)
    expect(shiftLane(state, -1)).toBe(false);
    expect(state.targetLane).toBe(-1);

    // Shift right -> Center (0)
    expect(shiftLane(state, 1)).toBe(true);
    expect(state.targetLane).toBe(0);

    // Shift right -> Right (1)
    expect(shiftLane(state, 1)).toBe(true);
    expect(state.targetLane).toBe(1);

    // Shift right again -> clamped to 1
    expect(shiftLane(state, 1)).toBe(false);
    expect(state.targetLane).toBe(1);
  });

  it("advances forward distance and lerps player horizontal lane smoothly", () => {
    const state = createInitialFluxState();
    state.status = "playing";
    state.targetLane = 1;

    // Simulate 0.1s update
    updateFluxEngine(state, 0.1);

    expect(state.distance).toBeGreaterThan(0);
    expect(state.playerLane).toBeGreaterThan(0); // moving towards targetLane 1
    expect(state.playerLane).toBeLessThanOrEqual(1);
  });

  it("detects successful gate pass when player matches correct lane", () => {
    const state = createInitialFluxState();
    state.status = "playing";

    // Place a gate right at Z = 1.0 with correctLane = 0 matching playerLane = 0
    state.gates = [
      {
        id: "test-gate-1",
        z: 1.0,
        laneColors: ["crimson", "cyan", "emerald"],
        targetColor: "cyan",
        correctLane: 0,
        passed: false,
        behavior: "static",
      },
    ];

    // Simulate 0.1s with forward step > 1.0 (speed is ~26) -> crosses Z = 0
    const { events } = updateFluxEngine(state, 0.1);

    expect(state.status).toBe("playing");
    expect(state.score).toBeGreaterThan(0);
    expect(state.combo).toBe(1);
    expect(events.some((e) => e.type === "pass")).toBe(true);
  });

  it("detects crash (Game Over) when player enters wrong colored gate", () => {
    const state = createInitialFluxState();
    state.status = "playing";
    state.playerLane = -1; // Player is in Left lane
    state.targetLane = -1;

    // Gate requires Right lane (1)
    state.gates = [
      {
        id: "test-gate-wrong",
        z: 1.0,
        laneColors: ["crimson", "emerald", "cyan"],
        targetColor: "cyan",
        correctLane: 1, // Right lane has cyan
        passed: false,
        behavior: "static",
      },
    ];

    // Advance through gate
    const { events } = updateFluxEngine(state, 0.1);

    expect(state.status).toBe("gameover");
    expect(state.deathReason).toBe("wrong_color");
    expect(events.some((e) => e.type === "crash")).toBe(true);
  });

  it("calculates difficulty phases correctly as score/gates advance", () => {
    expect(calculatePhase(0, 0)).toBe(1);
    expect(calculatePhase(8, 100)).toBe(2);
    expect(calculatePhase(20, 350)).toBe(3);
    expect(calculatePhase(40, 900)).toBe(4);
    expect(calculatePhase(65, 1800)).toBe(5);
    expect(calculatePhase(95, 3000)).toBe(6);
  });

  it("procedurally generates gates that guarantee physical reachability", () => {
    const state = createInitialFluxState();
    state.status = "playing";

    // Run engine through 200 simulation steps
    for (let step = 0; step < 200; step++) {
      // Simulate player moving to correct lane for upcoming gate
      const upcomingGate = state.gates.find((g) => !g.passed);
      if (upcomingGate) {
        setDirectLane(state, upcomingGate.correctLane);
      }
      updateFluxEngine(state, 0.016);
    }

    // Verify all generated gates maintain at least minimum safe distance
    for (let i = 1; i < state.gates.length; i++) {
      const spacing = state.gates[i].z - state.gates[i - 1].z;
      expect(spacing).toBeGreaterThanOrEqual(20.0);
    }
  });
});
