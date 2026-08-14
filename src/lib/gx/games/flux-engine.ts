import {
  type FluxColor,
  type LaneIndex,
  type FluxGate,
  type FluxState,
  type FloatingFeedback,
  COLOR_LIST,
  FLUX_COLORS,
} from "./flux-types";

export const CONSTANTS = {
  INITIAL_SPEED: 26.0,
  MAX_SPEED: 78.0,
  SPEED_ACCEL_BASE: 0.28,
  LANE_LERP_SPEED: 18.0, // horizontal responsive snappy interpolation
  INITIAL_GATE_DISTANCE: 42.0,
  MIN_GATE_DISTANCE: 22.0,
  PLAYER_Z: 0.0, // Camera is at -7.5, player is at 0, track scrolls or player advances
};

export function createInitialFluxState(): FluxState {
  const initialColor: FluxColor = "cyan";
  const state: FluxState = {
    status: "idle",
    score: 0,
    combo: 0,
    maxCombo: 0,
    passedGatesCount: 0,
    perfectCount: 0,
    distance: 0,
    speed: CONSTANTS.INITIAL_SPEED,
    baseSpeed: CONSTANTS.INITIAL_SPEED,
    playerLane: 0,
    targetLane: 0,
    playerColor: initialColor,
    colorShiftCountdown: 4,
    gates: [],
    nextGateId: 1,
    lastSpawnZ: 0,
    difficultyPhase: 1,
    feedbacks: [],
  };

  // Seed the initial learning gates (first 4 gates have generous spacing and clear paths)
  seedInitialGates(state);

  return state;
}

function seedInitialGates(state: FluxState) {
  let spawnZ = 35.0;
  let currentExpectedLane: LaneIndex = 0;

  for (let i = 0; i < 5; i++) {
    // Determine reachable lane (start with simple 1-step moves)
    const possibleLanes: LaneIndex[] = ([-1, 0, 1] as LaneIndex[]).filter(
      (l) => Math.abs(l - currentExpectedLane) <= 1
    );
    const chosenLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
    
    // Pick 2 other distinct colors for the other lanes
    const otherColors = COLOR_LIST.filter((c) => c !== state.playerColor);
    const shuffledOthers = [...otherColors].sort(() => Math.random() - 0.5);

    const laneColors: [FluxColor, FluxColor, FluxColor] = ["cyan", "cyan", "cyan"];
    let otherIdx = 0;
    
    ([-1, 0, 1] as LaneIndex[]).forEach((lane) => {
      const idx = lane + 1;
      if (lane === chosenLane) {
        laneColors[idx] = state.playerColor;
      } else {
        laneColors[idx] = shuffledOthers[otherIdx++];
      }
    });

    const gate: FluxGate = {
      id: `gate-${state.nextGateId++}`,
      z: spawnZ,
      laneColors,
      targetColor: state.playerColor,
      correctLane: chosenLane,
      passed: false,
      behavior: "static",
    };

    state.gates.push(gate);
    currentExpectedLane = chosenLane;
    spawnZ += 38.0;
  }

  state.lastSpawnZ = spawnZ;
}

export function shiftLane(state: FluxState, direction: -1 | 1): boolean {
  if (state.status === "idle") {
    state.status = "playing";
  }

  if (state.status !== "playing") return false;

  const nextLane = Math.max(-1, Math.min(1, state.targetLane + direction)) as LaneIndex;
  if (nextLane !== state.targetLane) {
    state.targetLane = nextLane;
    return true;
  }
  return false;
}

export function setDirectLane(state: FluxState, target: LaneIndex): boolean {
  if (state.status === "idle") {
    state.status = "playing";
  }

  if (state.status !== "playing") return false;

  if (target !== state.targetLane) {
    state.targetLane = target;
    return true;
  }
  return false;
}

/**
 * Calculates the current difficulty phase (1 to 6) based on passed gates & score
 */
export function calculatePhase(passedGates: number, score: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (passedGates < 6) return 1; // Phase 1: Tutorial / Learning
  if (passedGates < 15) return 2; // Phase 2: Speed intro
  if (passedGates < 30) return 3; // Phase 3: Rapid decisions
  if (passedGates < 55) return 4; // Phase 4: High speed
  if (passedGates < 85) return 5; // Phase 5: Advanced behaviors
  return 6; // Phase 6: Extreme
}

/**
 * Core engine update loop.
 * `dt` is normalized in seconds (e.g. 0.0166s for 60fps).
 */
export function updateFluxEngine(state: FluxState, dt: number): {
  events: Array<
    | { type: "pass"; perfect: boolean; points: number; combo: number }
    | { type: "color_change"; newColor: FluxColor }
    | { type: "crash"; position: { x: number; y: number; z: number } }
  >;
} {
  const events: Array<
    | { type: "pass"; perfect: boolean; points: number; combo: number }
    | { type: "color_change"; newColor: FluxColor }
    | { type: "crash"; position: { x: number; y: number; z: number } }
  > = [];

  if (state.status !== "playing") {
    // Keep feedbacks animating smoothly during gameover
    updateFeedbacks(state, dt);
    return { events };
  }

  // 1. Update difficulty and speed progression
  state.difficultyPhase = calculatePhase(state.passedGatesCount, state.score);
  
  // Smooth non-linear speed acceleration curve
  const targetSpeed = Math.min(
    CONSTANTS.MAX_SPEED,
    CONSTANTS.INITIAL_SPEED +
      Math.pow(state.passedGatesCount, 0.65) * 3.2 +
      Math.min(15, state.combo * 0.45)
  );
  state.speed += (targetSpeed - state.speed) * Math.min(1.0, 1.5 * dt);

  // 2. Advance forward distance
  const forwardStep = state.speed * dt;
  state.distance += forwardStep;

  // 3. Update player horizontal lane interpolation
  const laneDiff = state.targetLane - state.playerLane;
  state.playerLane += laneDiff * Math.min(1.0, CONSTANTS.LANE_LERP_SPEED * dt);

  // 4. Update and check gates
  for (let i = state.gates.length - 1; i >= 0; i--) {
    const gate = state.gates[i];
    
    // Gate moves towards player (Z decreases)
    gate.z -= forwardStep;

    // Advanced dynamic behavior (e.g. pulse or wave in Phase 5+)
    if (gate.behavior === "pulse") {
      gate.offsetY = Math.sin(state.distance * 0.15) * 0.35;
    }

    // Check collision when gate crosses the player plane (Z <= 0)
    if (!gate.passed && gate.z <= CONSTANTS.PLAYER_Z) {
      gate.passed = true;

      // Check which lane the player is occupying
      const laneOffset = Math.abs(state.playerLane - gate.correctLane);
      const isCorrectLane = laneOffset <= 0.62;

      if (!isCorrectLane) {
        // CRASH! Game Over
        state.status = "gameover";
        state.deathReason = "wrong_color";
        state.deathPosition = {
          x: state.playerLane * 3.4,
          y: 0.8,
          z: 0.0,
        };
        events.push({
          type: "crash",
          position: state.deathPosition,
        });
        break;
      }

      // Successful pass!
      const isPerfect = laneOffset <= 0.28; // Cleanly centered in lane
      state.passedGatesCount++;
      state.combo++;
      if (state.combo > state.maxCombo) {
        state.maxCombo = state.combo;
      }

      // Scoring formula: (10 base + combo bonus) * perfect multiplier
      const basePoints = isPerfect ? 15 : 10;
      const comboBonus = Math.floor(state.combo * 1.5);
      const earnedPoints = (basePoints + comboBonus);
      state.score += earnedPoints;

      if (isPerfect) {
        state.perfectCount++;
        addFeedback(state, "PERFECT!", "perfect", FLUX_COLORS[state.playerColor].glowHex);
      } else {
        if (state.combo % 5 === 0 && state.combo > 0) {
          addFeedback(state, `${state.combo}x COMBO`, "combo", "#ffea00");
        }
      }

      events.push({
        type: "pass",
        perfect: isPerfect,
        points: earnedPoints,
        combo: state.combo,
      });

      // Check for color transition triggered by this gate
      if (gate.newPlayerColorOnPass && gate.newPlayerColorOnPass !== state.playerColor) {
        state.playerColor = gate.newPlayerColorOnPass;
        addFeedback(state, `COLOR SHIFT`, "color", FLUX_COLORS[state.playerColor].glowHex);
        events.push({
          type: "color_change",
          newColor: state.playerColor,
        });
      }
    }

    // Cull off-screen gates behind camera (Z < -15)
    if (gate.z < -15.0) {
      state.gates.splice(i, 1);
    }
  }

  // 5. Procedural Gate Spawner (Maintains strict reachability fairness)
  maintainGatePipeline(state);

  // 6. Update visual floating feedbacks
  updateFeedbacks(state, dt);

  return { events };
}

/**
 * Procedural gate generation with strict fairness / reachability guarantee
 */
function maintainGatePipeline(state: FluxState) {
  const GATES_IN_FLIGHT = 6;
  
  while (state.gates.length < GATES_IN_FLIGHT) {
    const lastGate = state.gates[state.gates.length - 1];
    const prevZ = lastGate ? lastGate.z : 25.0;
    const prevLane = lastGate ? lastGate.correctLane : state.targetLane;

    // Calculate reachability distance based on current speed and phase
    // Distance = speed * (reaction_time + travel_time_between_lanes)
    const reactionTime = Math.max(0.25, 0.65 - state.difficultyPhase * 0.06);
    const speedRatio = state.speed / CONSTANTS.INITIAL_SPEED;
    
    // Choose next correct lane (avoid repeating same lane 3x)
    const candidates: LaneIndex[] = [-1, 0, 1];
    const chosenLane = candidates[Math.floor(Math.random() * candidates.length)];
    
    const laneJump = Math.abs(chosenLane - prevLane);
    const travelTime = (laneJump * 3.4) / (CONSTANTS.LANE_LERP_SPEED * 0.5);
    const minSafeDistance = state.speed * (reactionTime + travelTime) + 12.0;

    const spawnSpacing = Math.max(
      CONSTANTS.MIN_GATE_DISTANCE,
      Math.max(minSafeDistance, 45.0 / Math.pow(speedRatio, 0.4))
    );

    const gateZ = prevZ + spawnSpacing;

    // Color management: check if it's time for a color transition
    state.colorShiftCountdown--;
    let newColorForPlayer: FluxColor | undefined = undefined;
    let gateTargetColor = state.playerColor;

    if (state.colorShiftCountdown <= 0) {
      // Pick a new, distinct color
      const availableColors = COLOR_LIST.filter((c) => c !== state.playerColor);
      newColorForPlayer = availableColors[Math.floor(Math.random() * availableColors.length)];
      
      // Reset countdown based on phase (Phase 1: 5 gates, Phase 6: 2 gates)
      state.colorShiftCountdown = Math.max(2, 5 - Math.floor(state.difficultyPhase / 2));
    }

    // Build the 3 lane passages with distinct colors
    const otherColors = COLOR_LIST.filter((c) => c !== gateTargetColor);
    const shuffledOthers = [...otherColors].sort(() => Math.random() - 0.5);

    const laneColors: [FluxColor, FluxColor, FluxColor] = ["cyan", "cyan", "cyan"];
    let otherIdx = 0;

    ([-1, 0, 1] as LaneIndex[]).forEach((lane) => {
      const idx = lane + 1;
      if (lane === chosenLane) {
        laneColors[idx] = gateTargetColor;
      } else {
        laneColors[idx] = shuffledOthers[otherIdx++];
      }
    });

    // Determine behavior based on phase
    let behavior: "static" | "pulse" | "shift" = "static";
    if (state.difficultyPhase >= 5 && Math.random() > 0.6) {
      behavior = "pulse";
    }

    const newGate: FluxGate = {
      id: `gate-${state.nextGateId++}`,
      z: gateZ,
      laneColors,
      targetColor: gateTargetColor,
      correctLane: chosenLane,
      passed: false,
      behavior,
      newPlayerColorOnPass: newColorForPlayer,
    };

    state.gates.push(newGate);
  }
}

function addFeedback(state: FluxState, text: string, type: FloatingFeedback["type"], color: string) {
  state.feedbacks.push({
    id: Math.random().toString(36).substr(2, 9),
    text,
    type,
    color,
    x: 0,
    y: 0,
    alpha: 1.0,
    scale: 1.3,
    createdAt: performance.now(),
  });
}

function updateFeedbacks(state: FluxState, dt: number) {
  for (let i = state.feedbacks.length - 1; i >= 0; i--) {
    const f = state.feedbacks[i];
    f.alpha -= 1.8 * dt;
    f.y += 35 * dt;
    f.scale = Math.max(1.0, f.scale - 1.2 * dt);
    if (f.alpha <= 0) {
      state.feedbacks.splice(i, 1);
    }
  }
}
