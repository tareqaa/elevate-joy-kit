import { FLIPPY_WORLDS, type WorldConfig } from "./flippy-worlds";
import { flippyAudio } from "./flippy-audio";

export type FlippyEventType = "storm" | "speedup" | "turbulence" | "portal";

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
  // state.speed with the SPEEDUP event's temporary boost applied. Pipe
  // movement and the renderer's scroll both read this instead of `speed`
  // so the boost can never leak into the permanently-calculated difficulty
  // curve (`speed` itself is only ever touched by transitionWorld).
  effectiveSpeed: number;
  frames: number;
  groundY: number;
  activeEvent: FlippyEventType | null;
  // Remaining destinations for an active PORTAL event — one world is
  // popped off per pipe passed, and the event ends when this empties.
  eventPortalQueue: WorldConfig[];
  // Running phase accumulator for the TURBULENCE event's sine-based force.
  eventTurbulencePhase: number;
  // Bumped every time a new event is chosen (even if it's the same type
  // twice in a row) so the UI can key its announcement animation off a
  // value guaranteed to change, instead of off activeEvent identity.
  eventSeq: number;
  transitionProgress: number; // 0 to 1
  visitedWorldIds: string[]; // worlds already shown this run, so a portal
  // doesn't send the player back to one they just left
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
  // SPEED UP event: multiplies the current calculated speed for movement
  // only (never written back into `speed` itself), clamped so the boost
  // stays "noticeably faster" without becoming unplayable.
  EVENT_SPEEDUP_MULTIPLIER: 1.4,
  EVENT_SPEEDUP_MAX: 8,
  // TURBULENCE event: layered sine force applied to the bird's vertical
  // velocity every frame. What matters isn't the instantaneous amplitude
  // vs. the jump impulse — it's the cumulative push over a half-cycle
  // (roughly π / TURBULENCE_FREQ frames spent leaning the same direction).
  // At the old 0.05/0.16 values that half-cycle was ~63 frames, adding up
  // to ~6.4 vel — more than a full jump impulse (-5.5) with no way to
  // preempt it, which read as "unplayable" instead of turbulence. Faster +
  // much smaller keeps each half-cycle's total push well under one jump,
  // so it reads as light jitter/static instead of a sustained shove.
  TURBULENCE_FREQ: 0.11,
  TURBULENCE_AMPLITUDE: 0.035,
};

export function createInitialState(height: number): FlippyState {
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
    effectiveSpeed: CONSTANTS.SPEED,
    frames: 0,
    groundY: height - 50,
    activeEvent: null,
    eventPortalQueue: [],
    eventTurbulencePhase: 0,
    eventSeq: 0,
    transitionProgress: 1, // Start fully transitioned
    visitedWorldIds: [FLIPPY_WORLDS[0].id],
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

  // TURBULENCE event: a smooth, bounded, ever-shifting nudge — two sine
  // waves at different frequencies/phases so it never reads as a simple
  // metronome — layered on top of normal physics. It never persists past
  // the event (nothing here writes state outside this `if`), so there's
  // nothing to clean up when the event ends.
  if (state.activeEvent === "turbulence") {
    state.eventTurbulencePhase += CONSTANTS.TURBULENCE_FREQ * dt;
    const turbulenceForce =
      Math.sin(state.eventTurbulencePhase) * CONSTANTS.TURBULENCE_AMPLITUDE +
      Math.sin(state.eventTurbulencePhase * 2.3 + 1.7) * CONSTANTS.TURBULENCE_AMPLITUDE * 0.5;
    state.bird.vel.y += turbulenceForce * dt;
  }

  // SPEED UP event: a temporary boost that only ever affects movement
  // (pipe scroll + renderer parallax read this), never the permanently
  // calculated `speed` that transitionWorld maintains.
  state.effectiveSpeed = state.activeEvent === "speedup"
    ? Math.min(CONSTANTS.EVENT_SPEEDUP_MAX, state.speed * CONSTANTS.EVENT_SPEEDUP_MULTIPLIER)
    : state.speed;

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
    // Determine if it's time for a transition pipe (every 10 points), or —
    // during a PORTAL event — force every pipe to be one until the event's
    // 10-world queue is exhausted.
    const upcomingScore = state.score + 1;
    let isTransitionPipe = false;
    const portalEventActive = state.activeEvent === "portal" && state.eventPortalQueue.length > 0;

    if (portalEventActive) {
      isTransitionPipe = true;
    } else {
      // Check if we already have a transition pipe for this tier
      const hasTransition = state.pipes.some(p => p.isPortal);
      if (upcomingScore > 0 && upcomingScore % 10 === 0 && !hasTransition) {
        isTransitionPipe = true;
      }
    }

    const gapMod = Math.max(0.6, state.currentWorld.pipeGapModifier - (state.cycle * 0.05));
    const currentGap = Math.max(CONSTANTS.MIN_GAP, CONSTANTS.GAP_SIZE * gapMod);
    const minCenter = currentGap / 2 + 50;
    const maxCenter = state.groundY - currentGap / 2 - 50;
    const centerY = Math.random() * (maxCenter - minCenter) + minCenter;

    let nextWorldForPortal: WorldConfig | undefined = undefined;
    if (isTransitionPipe) {
      if (portalEventActive) {
        // Consume one destination from this event's shuffled, no-repeat
        // queue of all 10 worlds.
        nextWorldForPortal = state.eventPortalQueue.shift();
      } else {
        // Prefer a world not yet seen this run, so the same map can't repeat
        // until every other world has had a turn. Once all are visited, reset
        // the seen-list (keeping the current world excluded) so the cycle
        // continues instead of getting stuck with an empty candidate pool.
        let candidates = FLIPPY_WORLDS.filter(w => !state.visitedWorldIds.includes(w.id));
        if (candidates.length === 0) {
          state.visitedWorldIds = [state.currentWorld.id];
          candidates = FLIPPY_WORLDS.filter(w => w.id !== state.currentWorld.id);
        }
        nextWorldForPortal = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    state.pipes.push({
      id: Math.random().toString(36).substr(2, 9),
      x: width + 50,
      y: centerY,
      gap: currentGap,
      width: CONSTANTS.PIPE_WIDTH,
      passed: false,
      isPortal: isTransitionPipe,
      nextWorldObj: nextWorldForPortal,
      offsetY: 0,
      dirY: Math.random() > 0.5 ? 1 : -1,
    });
  }

  // Update Pipes & Collisions
  for (let i = state.pipes.length - 1; i >= 0; i--) {
    const p = state.pipes[i];

    // Wind affects scrolling speed instead of bird position
    p.x -= (state.effectiveSpeed - state.currentWorld.wind.x) * dt;

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

      // Events are driven purely by 50-point boundaries — never by the
      // 10-point world transitions. Reroll before this pipe's own
      // transition (if any) fires, so a PORTAL event decided here applies
      // to the world being entered right now.
      if (state.score % 50 === 0) {
        rerollEvent(state);
      }

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

/**
 * Called exactly once per 50-point boundary — the only place the event
 * lifecycle is driven from. Clears whatever event was running and
 * independently rolls a new one; each draw is independent, so the same
 * event can come up again on a later boundary. Never triggered by the
 * 10-point world transitions.
 */
function rerollEvent(state: FlippyState) {
  state.activeEvent = null;
  state.eventPortalQueue = [];

  const events: FlippyEventType[] = ["storm", "speedup", "turbulence", "portal"];
  state.activeEvent = events[Math.floor(Math.random() * events.length)];
  state.eventSeq++;

  if (state.activeEvent === "turbulence") {
    state.eventTurbulencePhase = Math.random() * Math.PI * 2;
  }
  if (state.activeEvent === "portal") {
    state.eventPortalQueue = shuffle(FLIPPY_WORLDS);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}