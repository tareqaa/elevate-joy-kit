import { FLIPPY_WORLDS, type WorldConfig } from "./flippy-worlds";
import { flippyAudio } from "./flippy-audio";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bird {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  rotation: number;
}

export interface Pipe {
  id: string;
  x: number;
  y: number; // center of the gap
  gap: number;
  width: number;
  passed: boolean;
  isPortal?: boolean;
  nextWorldObj?: WorldConfig;
  offsetY?: number; // for dynamic pipes
  dirY?: number;
}

export interface FlippyState {
  status: "idle" | "playing" | "gameover";
  score: number;
  cycle: number; // increases every 100 points
  worldIndex: number; // 0-9
  currentWorld: WorldConfig;
  previousWorld: WorldConfig | null; // For smooth transitions
  bird: Bird;
  pipes: Pipe[];
  speed: number;
  frames: number;
  groundY: number;
  transitionProgress: number; // 0 to 1
  visitedWorldIds: string[]; // worlds already shown this run, so a portal
  // doesn't send the player back to one they just left
  seed: number; // run seed (uint32) — the whole run is reproducible from it
  rng: number; // current PRNG state, advanced by nextRandom()
  pipeSeq: number;
}

/** Fresh uint32 seed for a new run. */
export function makeFlippySeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] >>> 0;
  } catch {
    return (Math.floor(Math.random() * 0xffffffff) >>> 0);
  }
}

/** Deterministic mulberry32 step — every gameplay random draw goes through here. */
function nextRandom(state: FlippyState): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const CONSTANTS = {
  GRAVITY: 0.25,
  JUMP: -5.5,
  SPEED: 3,
  PIPE_SPACING: 250,
  PIPE_WIDTH: 50,
  GAP_SIZE: 150,
  MIN_GAP: 90,
  MAX_SPEED: 6,
  BIRD_RADIUS: 12,
  BIRD_START_X: 100,
};

export function createInitialState(height: number, seed: number = makeFlippySeed()): FlippyState {
  return {
    status: "idle",
    score: 0,
    cycle: 0,
    worldIndex: 0,
    currentWorld: FLIPPY_WORLDS[0],
    previousWorld: null,
    bird: {
      pos: { x: CONSTANTS.BIRD_START_X, y: height / 2 },
      vel: { x: 0, y: 0 },
      radius: CONSTANTS.BIRD_RADIUS,
      rotation: 0,
    },
    pipes: [],
    speed: CONSTANTS.SPEED,
    frames: 0,
    groundY: height - 50,
    transitionProgress: 1, // Start fully transitioned
    visitedWorldIds: [FLIPPY_WORLDS[0].id],
    seed: seed >>> 0,
    rng: seed >>> 0,
    pipeSeq: 0,
  };
}

export function jump(state: FlippyState) {
  if (state.status === "idle") {
    state.status = "playing";
  }
  if (state.status === "playing") {
    state.bird.vel.y = CONSTANTS.JUMP;
    flippyAudio.playJump();
  }
}

/**
 * `dt` is elapsed real time since the last call, normalized so 1.0 == one
 * frame at 60fps (the rate every constant below was tuned against). Pass
 * `(now - lastNow) / (1000/60)` from the caller's requestAnimationFrame
 * loop. Without this, every increment here was applied once per *frame*
 * rather than once per unit of *time* — on a 120/144Hz display the whole
 * simulation ran proportionally faster, which is exactly the "game feels
 * too fast" bug this parameter fixes. Defaults to 1 so any other caller
 * (e.g. a test) keeps the original fixed-frame behavior.
 */
export function updateEngine(state: FlippyState, width: number, height: number, dt: number = 1) {
  if (state.status !== "playing") return;

  state.frames += dt;

  if (state.transitionProgress < 1.0) {
    state.transitionProgress += 0.0333 * dt; // Takes about 0.5 seconds to fully blend
    if (state.transitionProgress > 1.0) state.transitionProgress = 1.0;
  }

  // Apply world modifiers
  const gravity = CONSTANTS.GRAVITY * state.currentWorld.gravityModifier;

  // Bird physics
  state.bird.vel.y += gravity * dt;
  state.bird.vel.y += state.currentWorld.wind.y * dt;

  state.bird.pos.y += state.bird.vel.y * dt;

  // FIXED CAMERA: Bird stays perfectly at 35% of the screen horizontally
  state.bird.pos.x = width * 0.35;

  // Rotation
  state.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (state.bird.vel.y * 0.1)));

  // Floor / Ceiling collision
  if (state.bird.pos.y + state.bird.radius >= state.groundY || state.bird.pos.y - state.bird.radius <= 0) {
    state.status = "gameover";
    flippyAudio.playHit();
    flippyAudio.playDie();
  }
  // Pipe generation
  if (state.pipes.length === 0 || width - state.pipes[state.pipes.length - 1].x > CONSTANTS.PIPE_SPACING) {
    // Determine if it's time for a transition pipe (every 10 points)
    const upcomingScore = state.score + 1;
    let isTransitionPipe = false;

    // Check if we already have a transition pipe for this tier
    const hasTransition = state.pipes.some(p => p.isPortal);
    if (upcomingScore > 0 && upcomingScore % 10 === 0 && !hasTransition) {
      isTransitionPipe = true;
    }

    const gapMod = Math.max(0.6, state.currentWorld.pipeGapModifier - (state.cycle * 0.05));
    const currentGap = Math.max(CONSTANTS.MIN_GAP, CONSTANTS.GAP_SIZE * gapMod);
    const minCenter = currentGap / 2 + 50;
    const maxCenter = state.groundY - currentGap / 2 - 50;
    const centerY = nextRandom(state) * (maxCenter - minCenter) + minCenter;

    let nextWorldForPortal: WorldConfig | undefined = undefined;
    if (isTransitionPipe) {
      // Prefer a world not yet seen this run, so the same map can't repeat
      // until every other world has had a turn. Once all are visited, reset
      // the seen-list (keeping the current world excluded) so the cycle
      // continues instead of getting stuck with an empty candidate pool.
      let candidates = FLIPPY_WORLDS.filter(w => !state.visitedWorldIds.includes(w.id));
      if (candidates.length === 0) {
        state.visitedWorldIds = [state.currentWorld.id];
        candidates = FLIPPY_WORLDS.filter(w => w.id !== state.currentWorld.id);
      }
      nextWorldForPortal = candidates[Math.floor(nextRandom(state) * candidates.length)];
    }

    state.pipes.push({
      id: `p${++state.pipeSeq}`,
      x: width + 50,
      y: centerY,
      gap: currentGap,
      width: CONSTANTS.PIPE_WIDTH,
      passed: false,
      isPortal: isTransitionPipe,
      nextWorldObj: nextWorldForPortal,
      offsetY: 0,
      dirY: nextRandom(state) > 0.5 ? 1 : -1,
    });
  }

  // Update Pipes & Collisions
  for (let i = state.pipes.length - 1; i >= 0; i--) {
    const p = state.pipes[i];

    // Wind affects scrolling speed instead of bird position
    p.x -= (state.speed - state.currentWorld.wind.x) * dt;

    // Dynamic pipe movement (Cyber world)
    if (state.currentWorld.dynamicPipes) {
      p.offsetY = (p.offsetY || 0) + (p.dirY || 1) * 0.5 * dt;
      if (Math.abs(p.offsetY) > 30) p.dirY = (p.dirY || 1) * -1;
    }

    // Bird Collision
    const birdRight = state.bird.pos.x + state.bird.radius;
    const birdLeft = state.bird.pos.x - state.bird.radius;
    const birdTop = state.bird.pos.y - state.bird.radius;
    const birdBottom = state.bird.pos.y + state.bird.radius;

    const pipeLeft = p.x;
    const pipeRight = p.x + p.width;
    const pY = p.y + (p.offsetY || 0);
    const gapTop = pY - p.gap / 2;
    const gapBottom = pY + p.gap / 2;

    // AABB Collision check
    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      if (birdTop < gapTop || birdBottom > gapBottom) {
        state.status = "gameover";
        flippyAudio.playHit();
        flippyAudio.playDie();
      }
    }

    // Passing pipe
    if (p.x + p.width < state.bird.pos.x - state.bird.radius && !p.passed) {
      p.passed = true;
      state.score++;
      flippyAudio.playScore();

      if (p.isPortal && p.nextWorldObj) {
        transitionWorld(state, p.nextWorldObj);
      }
    }

    // Remove off-screen pipes
    if (p.x + p.width < -50) {
      state.pipes.splice(i, 1);
    }
  }
}

function transitionWorld(state: FlippyState, nextWorld: WorldConfig) {
  // Save previous state for blending
  state.previousWorld = state.currentWorld;
  state.transitionProgress = 0.0;

  if (state.score % 100 === 0 && state.score > 0) {
    state.cycle++;
  }

  const tier = FLIPPY_WORLDS.findIndex(w => w.id === nextWorld.id);
  state.worldIndex = tier > -1 ? tier : 0;
  state.currentWorld = nextWorld;
  if (!state.visitedWorldIds.includes(nextWorld.id)) state.visitedWorldIds.push(nextWorld.id);

  // Increase speed slightly based on absolute score, cap it at MAX_SPEED
  state.speed = Math.min(CONSTANTS.MAX_SPEED, CONSTANTS.SPEED + (state.score * 0.005));
}

/* ============================================================
   RUN LOG + SERVER-SIDE REPLAY
   The game advances in fixed steps (one step == one 60fps frame).
   The client records the seed, the play-area size, the step index
   of every flap and of every resize, and how many steps the run
   lasted. The server replays exactly those inputs through this same
   engine and only the recomputed score is ever saved.
   ============================================================ */

export type FlippyRunLog = {
  seed: number;
  initHeight: number; // height passed to createInitialState
  startW: number; // play-area size when the first flap started the run
  startH: number;
  jumps: number[]; // step indices (strictly increasing) of flaps after the first
  resizes: { f: number; w: number; h: number }[];
  steps: number; // fixed steps simulated until game over
};

export type FlippyReplayResult =
  | { valid: true; score: number; steps: number }
  | { valid: false; reason: string };

export const FLIPPY_MAX_STEPS = 3 * 60 * 60 * 60; // 3 hours at 60 steps/s

export function replayFlippyRun(log: FlippyRunLog): FlippyReplayResult {
  const steps = log.steps;
  if (!Number.isInteger(steps) || steps < 1 || steps > FLIPPY_MAX_STEPS) {
    return { valid: false, reason: "bad_steps" };
  }
  for (let i = 0; i < log.jumps.length; i++) {
    const f = log.jumps[i];
    if (!Number.isInteger(f) || f < 0 || f >= steps || (i > 0 && f <= log.jumps[i - 1])) {
      return { valid: false, reason: "bad_jumps" };
    }
  }
  for (let i = 0; i < log.resizes.length; i++) {
    const r = log.resizes[i];
    if (!Number.isInteger(r.f) || r.f < 0 || r.f >= steps || (i > 0 && r.f < log.resizes[i - 1].f)) {
      return { valid: false, reason: "bad_resizes" };
    }
  }

  const state = createInitialState(log.initHeight, log.seed);
  let w = log.startW;
  let h = log.startH;
  state.groundY = h - 50;
  jump(state); // the opening flap that started the run

  let ji = 0;
  let ri = 0;
  for (let f = 0; f < steps; f++) {
    if (state.status !== "playing") return { valid: false, reason: "ended_early" };
    while (ri < log.resizes.length && log.resizes[ri].f === f) {
      w = log.resizes[ri].w;
      h = log.resizes[ri].h;
      state.groundY = h - 50;
      ri++;
    }
    if (ji < log.jumps.length && log.jumps[ji] === f) {
      jump(state);
      ji++;
    }
    updateEngine(state, w, h, 1);
  }
  if (state.status !== "gameover") return { valid: false, reason: "not_over" };
  return { valid: true, score: state.score, steps };
}
