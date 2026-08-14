export type FluxColor = "cyan" | "crimson" | "emerald" | "amber" | "violet";

export interface ColorDef {
  id: FluxColor;
  nameEn: string;
  nameAr: string;
  hex: string;
  hexNum: number;
  glowHex: string;
  secondaryHex: string;
}

export const FLUX_COLORS: Record<FluxColor, ColorDef> = {
  cyan: {
    id: "cyan",
    nameEn: "CYAN",
    nameAr: "سماوي",
    hex: "#00f0ff",
    hexNum: 0x00f0ff,
    glowHex: "#70f8ff",
    secondaryHex: "#0066aa",
  },
  crimson: {
    id: "crimson",
    nameEn: "CRIMSON",
    nameAr: "أحمر",
    hex: "#ff1e56",
    hexNum: 0xff1e56,
    glowHex: "#ff6b8b",
    secondaryHex: "#990022",
  },
  emerald: {
    id: "emerald",
    nameEn: "EMERALD",
    nameAr: "أخضر",
    hex: "#00ff88",
    hexNum: 0x00ff88,
    glowHex: "#66ffaa",
    secondaryHex: "#008844",
  },
  amber: {
    id: "amber",
    nameEn: "AMBER",
    nameAr: "ذهبي",
    hex: "#ffbe0b",
    hexNum: 0xffbe0b,
    glowHex: "#ffd666",
    secondaryHex: "#aa6600",
  },
  violet: {
    id: "violet",
    nameEn: "VIOLET",
    nameAr: "بنفسجي",
    hex: "#b537f2",
    hexNum: 0xb537f2,
    glowHex: "#d885ff",
    secondaryHex: "#660099",
  },
};

export const COLOR_LIST: FluxColor[] = ["cyan", "crimson", "emerald", "amber", "violet"];

export type LaneIndex = -1 | 0 | 1; // -1: Left, 0: Center, 1: Right

export const LANE_X: Record<LaneIndex, number> = {
  [-1]: -3.4,
  [0]: 0.0,
  [1]: 3.4,
};

export type GateBehavior = "static" | "pulse" | "shift";

export interface FluxGate {
  id: string;
  z: number;
  // Lane colors: index 0 = Left (-1), 1 = Center (0), 2 = Right (1)
  laneColors: [FluxColor, FluxColor, FluxColor];
  targetColor: FluxColor;
  correctLane: LaneIndex;
  passed: boolean;
  behavior: GateBehavior;
  newPlayerColorOnPass?: FluxColor;
  shiftSpeed?: number;
  offsetY?: number;
}

export interface FloatingFeedback {
  id: string;
  text: string;
  type: "perfect" | "combo" | "color" | "speed";
  color: string;
  x: number;
  y: number;
  alpha: number;
  scale: number;
  createdAt: number;
}

export interface FluxState {
  status: "idle" | "playing" | "gameover";
  score: number;
  combo: number;
  maxCombo: number;
  passedGatesCount: number;
  perfectCount: number;
  
  distance: number;
  speed: number;
  baseSpeed: number;
  
  playerLane: number; // continuous float position in lane space (-1 to 1)
  targetLane: LaneIndex; // discrete target (-1, 0, 1)
  playerColor: FluxColor;
  colorShiftUpcoming?: FluxColor;
  colorShiftCountdown: number; // gates remaining before color shift
  
  gates: FluxGate[];
  nextGateId: number;
  lastSpawnZ: number;
  
  difficultyPhase: 1 | 2 | 3 | 4 | 5 | 6;
  feedbacks: FloatingFeedback[];
  
  // Game over details
  deathReason?: "wrong_color" | "missed_gate";
  deathPosition?: { x: number; y: number; z: number };
}
