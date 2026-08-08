export type ObstacleStyle =
  | "wood" // Forest
  | "ice" // Snow
  | "lava" // Volcano
  | "coral" // Ocean
  | "space" // Space
  | "dark" // Dark Realm
  | "neon" // Cyber
  | "cloud" // (retired, kept for type stability)
  | "sandstone" // Desert
  | "sakura" // Sakura
  | "petra" // (retired, kept for type stability)
  | "clockwork"; // Clockwork World

export type BirdSkin =
  | "classic"
  | "winter"
  | "burnt"
  | "diver"
  | "astronaut"
  | "dark"
  | "cyber"
  | "angel"
  | "explorer"
  | "sakura"
  | "clockwork";

export type ParticleType =
  | "leaves"
  | "snow"
  | "fire"
  | "bubbles"
  | "stars"
  | "shadows"
  | "digital"
  | "sparkles"
  | "sand"
  | "petals"
  | "dust"
  | "steam";

export interface WorldConfig {
  id: string;
  name: string;
  bgTop: string;
  bgBottom: string;
  obstacleStyle: ObstacleStyle;
  birdSkin: BirdSkin;
  particleType: ParticleType;
  particleColor: string;
  gravityModifier: number; // multiplier, 1.0 is default
  pipeGapModifier: number; // multiplier, 1.0 is default
  wind: { x: number; y: number }; // persistent wind force
  dynamicPipes: boolean; // if true, some pipes move vertically
  fogColor?: string; // if set, applies fog overlay
}

export const FLIPPY_WORLDS: WorldConfig[] = [
  {
    id: "forest",
    name: "Forest World",
    bgTop: "#38bdf8", // bright blue sky
    bgBottom: "#14532d", // dark green forest base
    obstacleStyle: "wood",
    birdSkin: "classic",
    particleType: "leaves",
    particleColor: "#22c55e",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
  },
  {
    id: "snow",
    name: "Snow World",
    bgTop: "#e0f2fe", // white cloudy sky
    bgBottom: "#0284c7", // frozen landscape
    obstacleStyle: "ice",
    birdSkin: "winter",
    particleType: "snow",
    particleColor: "#ffffff",
    gravityModifier: 1.1, // slightly heavier
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
  },
  {
    id: "volcano",
    name: "Volcano World",
    bgTop: "#1e1b4b", // dark sky
    bgBottom: "#7f1d1d", // lava mountains
    obstacleStyle: "lava",
    birdSkin: "burnt",
    particleType: "fire",
    particleColor: "#fb923c",
    gravityModifier: 1.0,
    pipeGapModifier: 0.85, // smaller gaps
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
  },
  {
    id: "ocean",
    name: "Ocean World",
    bgTop: "#0284c7", // deep ocean
    bgBottom: "#082f49", // dark depth
    obstacleStyle: "coral",
    birdSkin: "diver",
    particleType: "bubbles",
    particleColor: "#bae6fd",
    gravityModifier: 0.85, // lower gravity (floaty)
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
  },
  {
    id: "space",
    name: "Space World",
    bgTop: "#0f172a", // stars
    bgBottom: "#000000", // empty space
    obstacleStyle: "space",
    birdSkin: "astronaut",
    particleType: "stars",
    particleColor: "#ffffff",
    gravityModifier: 0.8, // low gravity
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
  },
  {
    id: "dark",
    name: "Dark Realm",
    bgTop: "#18181b", // dark sky
    bgBottom: "#000000", // black
    obstacleStyle: "dark",
    birdSkin: "dark",
    particleType: "shadows",
    particleColor: "#3f3f46",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
    fogColor: "rgba(0, 0, 0, 0.6)", // reduced visibility
  },
  {
    id: "cyber",
    name: "Cyber City",
    bgTop: "#2e1065", // purple night sky
    bgBottom: "#09090b", // black ground
    obstacleStyle: "neon",
    birdSkin: "cyber",
    particleType: "digital",
    particleColor: "#22d3ee",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: true, // Some obstacles move horizontally/vertically (handled in engine)
  },
  {
    // Same slot/id as the original "Sky Kingdom" (then briefly "Petra") so
    // tournament/engine code that references world identity by index/id
    // stays untouched — only the visual theme changed again.
    id: "sky",
    name: "Clockwork World", // subtitle: "The Mechanical City"
    bgTop: "#1a1712", // deep charcoal (fallback; renderer uses a richer gradient)
    bgBottom: "#8a5a2a", // warm bronze haze near the horizon
    obstacleStyle: "clockwork",
    birdSkin: "clockwork",
    particleType: "steam",
    particleColor: "#d8cdb8",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
    fogColor: "rgba(90, 65, 35, 0.2)", // warm industrial haze
  },
  {
    id: "desert",
    name: "Desert World",
    bgTop: "#fed7aa", // orange hot sky
    bgBottom: "#b45309", // dark sand
    obstacleStyle: "sandstone",
    birdSkin: "explorer",
    particleType: "sand",
    particleColor: "#fcd34d",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 1.5, y: 0 }, // wind pushes bird/pipes
    dynamicPipes: false,
  },
  {
    id: "sakura",
    name: "Sakura Garden",
    bgTop: "#2e2a55", // indigo dusk sky (fallback; renderer uses a richer gradient)
    bgBottom: "#3d2a3a", // muted violet dusk
    obstacleStyle: "sakura",
    birdSkin: "sakura",
    particleType: "petals",
    particleColor: "#f472b6",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
    fogColor: "rgba(60, 50, 80, 0.25)", // cool indigo dusk haze, not pink
  },
];