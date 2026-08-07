export type ObstacleStyle =
  | "wood" // Forest
  | "ice" // Snow
  | "lava" // Volcano
  | "coral" // Ocean
  | "space" // Space
  | "dark" // Dark Realm
  | "neon" // Cyber
  | "cloud" // Sky
  | "sandstone" // Desert
  | "sakura"; // Sakura

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
  | "sakura";

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
  | "petals";

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
    id: "sky",
    name: "Sky Kingdom",
    bgTop: "#7dd3fc", // vivid sky blue
    bgBottom: "#dbeafe", // soft light blue
    obstacleStyle: "cloud",
    birdSkin: "angel",
    particleType: "sparkles",
    particleColor: "#fde047",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
    fogColor: "rgba(255, 255, 255, 0.2)", // soft cloud fog
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
    bgTop: "#fdf2f8", // light pink
    bgBottom: "#be185d", // deep pink/red
    obstacleStyle: "sakura",
    birdSkin: "sakura",
    particleType: "petals",
    particleColor: "#f472b6",
    gravityModifier: 1.0,
    pipeGapModifier: 1.0,
    wind: { x: 0, y: 0 },
    dynamicPipes: false,
    fogColor: "rgba(252, 231, 243, 0.2)", // soft pink fog
  },
];