import { FlippyState, Pipe } from "./flippy-engine";
import type { WorldConfig } from "./flippy-worlds";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  type: string; // sub-type for varied shapes
}

const neonColors = ["#38bdf8", "#c084fc", "#f472b6", "#fb923c"];

export class FlippyRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  // Parallax scroll counters (accumulate indefinitely, use modulo for tiling)
  private scrollX = 0;
  private fgX = 0;
  private particles: Particle[] = [];
  // Persistent star field for space world
  private stars: { x: number; y: number; s: number; b: number }[] = [];
  // Render-driven animation clock: unlike state.frames (which only advances
  // while status === "playing"), this ticks every render() call regardless
  // of status, so idle bob/flap and the post-death fall have something to
  // animate against. Purely visual — never read by game logic.
  private renderTick = 0;
  private lastStatus: FlippyState["status"] | null = null;
  private deathStartTick: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        s: Math.random() * 2 + 0.5,
        b: Math.random(),
      });
    }
  }

  /** Seamless tile offsets computed from scrollX. Modulo is applied AFTER speed mult. */
  private getScrollOffset(speed: number): number {
    const w = this.width || 1;
    return -(((this.scrollX * speed) % w) + w) % w;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private get bgFarX() { return this.getScrollOffset(0.2); }
  private get bgMidX() { return this.getScrollOffset(0.5); }
  private get bgNearX() { return this.getScrollOffset(0.8); }

  /** `dt`: same normalized-to-60fps unit updateEngine takes, so background
   *  scroll and bird animation speed track real time instead of raw frame
   *  count — otherwise they'd drift out of sync with the (now dt-correct)
   *  pipe/physics speed on any display that isn't exactly 60Hz. */
  public render(state: FlippyState, dt: number = 1) {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    this.renderTick += dt;
    if (state.status === "gameover") {
      if (this.deathStartTick === null) this.deathStartTick = this.renderTick;
    } else if (this.lastStatus === "gameover") {
      // A fresh round started — clear the fall so it doesn't carry over.
      this.deathStartTick = null;
    }
    this.lastStatus = state.status;

    // Accumulate scroll
    this.scrollX += state.speed * dt;
    this.fgX -= state.speed * dt;
    if (this.fgX <= -60) this.fgX += 60;

    this.drawBackground(state);
    this.updateAndDrawParticles(state);
    this.drawFogUnder(state); // fog drawn under pipes for depth
    this.drawPipes(state);
    this.drawBird(state);
    this.drawFogOver(state); // fog drawn over everything for atmosphere
    this.drawDynamicEvent(state);
  }

  // ──────────────────────────────────────────────────────
  //  BACKGROUND SYSTEM
  // ──────────────────────────────────────────────────────

  private drawBackground(state: FlippyState) {
    const { ctx, width, height } = this;

    // Smooth transition: draw previous world, then overlay current
    if (state.previousWorld && state.transitionProgress < 1.0) {
      ctx.globalAlpha = 1.0;
      this.drawWorldLayers(state.previousWorld, state);
      ctx.globalAlpha = state.transitionProgress;
      this.drawWorldLayers(state.currentWorld, state);
      ctx.globalAlpha = 1.0;
    } else {
      this.drawWorldLayers(state.currentWorld, state);
    }

    this.drawFloor(state);
  }

  private drawWorldLayers(world: WorldConfig, state: FlippyState) {
    const { ctx, width, height } = this;
    const gY = state.groundY;

    // === SKY GRADIENT ===
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, world.bgTop);
    grad.addColorStop(1, world.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dispatch to world-specific drawing
    switch (world.id) {
      case "forest": this.drawForestWorld(state, gY); break;
      case "snow":   this.drawSnowWorld(state, gY); break;
      case "volcano":this.drawVolcanoWorld(state, gY); break;
      case "ocean":  this.drawOceanWorld(state, gY); break;
      case "space":  this.drawSpaceWorld(state, gY); break;
      case "dark":   this.drawDarkWorld(state, gY); break;
      case "cyber":  this.drawCyberWorld(state, gY); break;
      case "sky":    this.drawSkyWorld(state, gY); break;
      case "desert": this.drawDesertWorld(state, gY); break;
      case "sakura": this.drawSakuraWorld(state, gY); break;
    }
  }

  // ─── WORLD 1: FOREST ───
  private drawForestWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Mountains (2 depth layers)
    ctx.save();
    ctx.globalAlpha = 0.6;
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? "#4ade80" : "#22c55e";
      const speed = 0.15 * (1 + layer * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, gY);
      const maxSx = Math.ceil(width / 40) * 40;
      for (let sx = 0; sx <= maxSx; sx += 40) {
        const worldX = (this.scrollX * speed) + sx;
        const h1 = Math.sin((worldX + layer * 200) * 0.008) * 60 + 80 + layer * 40;
        ctx.lineTo(sx, gY - h1);
      }
      ctx.lineTo(maxSx, gY);
      ctx.fill();
    }
    ctx.restore();

    // MID: Trees
    ctx.save();
    const midOff = this.getScrollOffset(0.4);
    for (let i = -1; i < 3; i++) {
      const ox = midOff + i * width;
      for (let tx = 0; tx < width; tx += 140) {
        const treeH = 80 + Math.sin(tx * 7.3) * 30;
        const treeX = ox + tx + 70;
        ctx.fillStyle = "#78350f";
        ctx.fillRect(treeX - 8, gY - treeH, 16, treeH);
        const sway = Math.sin(t * 0.02 + tx) * 3;
        // 2 canopy layers (reduced from 3 for perf)
        ctx.fillStyle = "#166534";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(treeX + sway * 0.3, gY - treeH + 10, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22c55e";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(treeX + sway * 0.6, gY - treeH - 8, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // NEAR: Bushes
    ctx.save();
    const nearOff = this.getScrollOffset(0.7);
    for (let i = -1; i < 3; i++) {
      const ox = nearOff + i * width;
      for (let bx = 0; bx < width; bx += 100) {
        ctx.fillStyle = "#16a34a";
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(ox + bx + 50, gY - 5, 18, Math.PI, 0);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Sun glow
    ctx.save();
    const sunGrad = ctx.createRadialGradient(width * 0.8, 60, 10, width * 0.8, 60, 150);
    sunGrad.addColorStop(0, "rgba(253, 224, 71, 0.6)");
    sunGrad.addColorStop(0.5, "rgba(253, 224, 71, 0.15)");
    sunGrad.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ─── WORLD 2: SNOW ───
  private drawSnowWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Snow mountains
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? "#cbd5e1" : "#e2e8f0";
      ctx.globalAlpha = 0.7 + layer * 0.15;
      for (let i = -1; i < 3; i++) {
        const ox = this.bgFarX + i * width;
        ctx.beginPath();
        ctx.moveTo(ox, gY);
        for (let x = 0; x <= width; x += 25) {
          const h = Math.sin((x + layer * 300) * 0.006) * 80 + 100 + layer * 30;
          const jagged = Math.sin(x * 0.08) * 15;
          ctx.lineTo(ox + x, gY - h - jagged);
        }
        ctx.lineTo(ox + width, gY);
        ctx.fill();
      }
      // Snow caps
      ctx.fillStyle = "#ffffff";
      for (let i = -1; i < 3; i++) {
        const ox = this.bgFarX + i * width;
        ctx.beginPath();
        ctx.moveTo(ox, gY);
        for (let x = 0; x <= width; x += 25) {
          const h = Math.sin((x + layer * 300) * 0.006) * 80 + 100 + layer * 30;
          const jagged = Math.sin(x * 0.08) * 15;
          ctx.lineTo(ox + x, gY - h - jagged);
        }
        for (let x = width; x >= 0; x -= 25) {
          const h = Math.sin((x + layer * 300) * 0.006) * 80 + 100 + layer * 30;
          const jagged = Math.sin(x * 0.08) * 15;
          ctx.lineTo(ox + x, gY - h - jagged + 15);
        }
        ctx.fill();
      }
    }
    ctx.restore();

    // MID: Pine trees
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let tx = 0; tx < width; tx += 100) {
        const treeH = 60 + Math.sin(tx * 3.7) * 20;
        const treeX = ox + tx + 50;
        // Trunk
        ctx.fillStyle = "#78350f";
        ctx.fillRect(treeX - 4, gY - 20, 8, 20);
        // Pine layers
        for (let py = 0; py < 4; py++) {
          ctx.fillStyle = "#166534";
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          const layerW = 25 - py * 4;
          ctx.moveTo(treeX - layerW, gY - 20 - py * 14);
          ctx.lineTo(treeX, gY - 20 - py * 14 - 18);
          ctx.lineTo(treeX + layerW, gY - 20 - py * 14);
          ctx.fill();
          // Snow on branches
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(treeX - layerW + 3, gY - 20 - py * 14);
          ctx.lineTo(treeX, gY - 20 - py * 14 - 5);
          ctx.lineTo(treeX + layerW - 3, gY - 20 - py * 14);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Cold blue atmosphere
    ctx.save();
    ctx.fillStyle = "rgba(147, 197, 253, 0.1)";
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ─── WORLD 3: VOLCANO ───
  private drawVolcanoWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Volcano cones
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      // Dark mountain
      ctx.fillStyle = "#1c1917";
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(ox, gY);
      ctx.lineTo(ox + width * 0.3, gY - 180);
      ctx.lineTo(ox + width * 0.5, gY - 120);
      ctx.lineTo(ox + width * 0.75, gY - 200);
      ctx.lineTo(ox + width, gY);
      ctx.fill();

      // Lava glow at peaks
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 20 + Math.sin(t * 0.05) * 10;
      ctx.beginPath();
      ctx.moveTo(ox + width * 0.3 - 12, gY - 160);
      ctx.lineTo(ox + width * 0.3, gY - 180);
      ctx.lineTo(ox + width * 0.3 + 12, gY - 160);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ox + width * 0.75 - 15, gY - 175);
      ctx.lineTo(ox + width * 0.75, gY - 200);
      ctx.lineTo(ox + width * 0.75 + 15, gY - 175);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // MID: Smoke columns
    ctx.save();
    ctx.globalAlpha = 0.3;
    const midOff = this.getScrollOffset(0.4);
    for (let s = 0; s < 3; s++) {
      const sx = (width * 0.25 * (s + 1)) + midOff * 0.5;
      for (let c = 0; c < 5; c++) {
        ctx.fillStyle = "#78716c";
        ctx.beginPath();
        const yOff = Math.sin(t * 0.01 + s + c) * 10;
        ctx.arc(sx + Math.sin(t * 0.015 + c * 2) * 8, gY - 160 - c * 30 + yOff, 20 + c * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // NEAR: Cracked lava ground glow
    ctx.save();
    const lavaGrad = ctx.createLinearGradient(0, gY - 30, 0, gY);
    lavaGrad.addColorStop(0, "rgba(249, 115, 22, 0)");
    lavaGrad.addColorStop(1, "rgba(249, 115, 22, 0.5)");
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, gY - 30, width, 30);
    // Lava cracks in ground
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(t * 0.08) * 0.2;
    for (let i = -1; i < 3; i++) {
      const ox = this.fgX + i * width;
      for (let cx = 0; cx < width + 300; cx += 60) {
        ctx.beginPath();
        ctx.moveTo(ox + cx, gY - 2);
        ctx.lineTo(ox + cx + 10, gY - 12);
        ctx.lineTo(ox + cx + 25, gY - 5);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Orange glow atmosphere
    ctx.save();
    const volcGlow = ctx.createRadialGradient(width / 2, gY, 50, width / 2, gY, width);
    volcGlow.addColorStop(0, "rgba(249, 115, 22, 0.2)");
    volcGlow.addColorStop(1, "rgba(249, 115, 22, 0)");
    ctx.fillStyle = volcGlow;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ─── WORLD 4: OCEAN ───
  private drawOceanWorld(state: FlippyState, gY: number) {
    const { ctx, width, height } = this;
    const t = state.frames;

    // Water light rays
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let r = 0; r < 5; r++) {
      const rx = (width * 0.15 * (r + 1) + t * 0.3) % (width + 100) - 50;
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 30, 0);
      ctx.lineTo(rx + 80, gY);
      ctx.lineTo(rx - 20, gY);
      ctx.fill();
    }
    ctx.restore();

    // MID: Coral reefs
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let cx = 0; cx < width; cx += 90) {
        const coralH = 30 + Math.sin(cx * 5.1) * 20;
        // Coral branches
        ctx.fillStyle = "#fb7185";
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(ox + cx + 45, gY);
        ctx.bezierCurveTo(ox + cx + 30, gY - coralH, ox + cx + 60, gY - coralH - 10, ox + cx + 45, gY - coralH - 20);
        ctx.bezierCurveTo(ox + cx + 50, gY - coralH, ox + cx + 70, gY - coralH + 10, ox + cx + 55, gY);
        ctx.fill();
        // Seaweed
        if (cx % 180 === 0) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          const swayX = Math.sin(t * 0.03 + cx) * 8;
          ctx.moveTo(ox + cx + 20, gY);
          ctx.bezierCurveTo(ox + cx + 20 + swayX, gY - 30, ox + cx + 20 - swayX, gY - 60, ox + cx + 20 + swayX * 0.5, gY - 80);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Fish silhouettes
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let f = 0; f < 3; f++) {
      const fx = ((t * (1 + f * 0.3) + f * 200) % (width + 100)) - 50;
      const fy = gY * 0.3 + f * gY * 0.2;
      ctx.fillStyle = f === 0 ? "#38bdf8" : f === 1 ? "#fb923c" : "#a78bfa";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(fx - 12, fy);
      ctx.lineTo(fx - 20, fy - 5);
      ctx.lineTo(fx - 20, fy + 5);
      ctx.fill();
    }
    ctx.restore();

    // Moving water caustic overlay (simplified for perf)
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#bae6fd";
    for (let wx = 0; wx < width; wx += 60) {
      for (let wy = 0; wy < gY; wy += 60) {
        const s = Math.sin((wx + t * 2) * 0.05) * Math.cos((wy + t) * 0.05);
        if (s > 0.3) {
          ctx.beginPath();
          ctx.arc(wx, wy, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // ─── WORLD 5: SPACE ───
  private drawSpaceWorld(state: FlippyState, gY: number) {
    const { ctx, width, height } = this;
    const t = state.frames;

    // Stars
    ctx.save();
    for (const star of this.stars) {
      const sx = ((star.x + this.bgFarX) % width + width) % width;
      const sy = ((star.y) % gY + gY) % gY;
      const twinkle = Math.sin(t * 0.05 + star.b * 10) * 0.3 + 0.7;
      ctx.globalAlpha = twinkle * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, star.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Nebula cloud
    ctx.save();
    const nebX = (width * 0.6 + this.bgFarX) % width;
    const nebGrad = ctx.createRadialGradient(nebX, gY * 0.4, 20, nebX, gY * 0.4, 150);
    nebGrad.addColorStop(0, "rgba(168, 85, 247, 0.2)");
    nebGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.1)");
    nebGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();

    // Planet
    ctx.save();
    const planetX = ((width * 0.7 + this.bgMidX) % width + width) % width;
    ctx.globalAlpha = 0.7;
    // Planet body
    const pGrad = ctx.createRadialGradient(planetX - 15, gY * 0.3 - 15, 5, planetX, gY * 0.3, 60);
    pGrad.addColorStop(0, "#c084fc");
    pGrad.addColorStop(1, "#3b0764");
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(planetX, gY * 0.3, 60, 0, Math.PI * 2);
    ctx.fill();
    // Ring
    ctx.strokeStyle = "rgba(192, 132, 252, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(planetX, gY * 0.3, 90, 15, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Asteroids
    ctx.save();
    ctx.fillStyle = "#57534e";
    ctx.globalAlpha = 0.5;
    for (let a = 0; a < 4; a++) {
      const ax = ((a * 200 + this.bgNearX + 500) % width + width) % width;
      const ay = gY * 0.2 + a * gY * 0.15;
      ctx.beginPath();
      ctx.arc(ax, ay, 6 + a * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── WORLD 6: DARK REALM ───
  private drawDarkWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Red moon
    ctx.save();
    const moonX = width * 0.75;
    const moonY = gY * 0.2;
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 80);
    moonGrad.addColorStop(0, "rgba(239, 68, 68, 0.8)");
    moonGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.2)");
    moonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = moonGrad;
    ctx.fillRect(0, 0, width, gY);
    ctx.fillStyle = "#dc2626";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = "#991b1b";
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // FAR: Dark mountains with jagged edges
    ctx.save();
    ctx.fillStyle = "#18181b";
    ctx.globalAlpha = 0.9;
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      ctx.beginPath();
      ctx.moveTo(ox, gY);
      for (let x = 0; x <= width; x += 20) {
        const h = Math.sin(x * 0.01) * 60 + 80 + Math.sin(x * 0.07) * 20;
        ctx.lineTo(ox + x, gY - h);
      }
      ctx.lineTo(ox + width, gY);
      ctx.fill();
    }
    ctx.restore();

    // MID: Dead trees
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let tx = 0; tx < width; tx += 150) {
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.8;
        const base = ox + tx + 75;
        // Trunk
        ctx.beginPath();
        ctx.moveTo(base, gY);
        ctx.lineTo(base - 3, gY - 70);
        ctx.stroke();
        // Branches
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(base - 3, gY - 50);
        ctx.lineTo(base - 25, gY - 75);
        ctx.moveTo(base - 3, gY - 60);
        ctx.lineTo(base + 20, gY - 85);
        ctx.moveTo(base - 3, gY - 40);
        ctx.lineTo(base + 15, gY - 55);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Dark castle silhouette
    ctx.save();
    const castleX = ((width * 0.5 + this.bgMidX) % width + width) % width;
    ctx.fillStyle = "#09090b";
    ctx.globalAlpha = 0.6;
    // Main tower
    ctx.fillRect(castleX, gY - 120, 30, 120);
    ctx.fillRect(castleX + 50, gY - 100, 25, 100);
    ctx.fillRect(castleX + 10, gY - 80, 50, 80);
    // Battlements
    for (let b = 0; b < 4; b++) {
      ctx.fillRect(castleX + 10 + b * 14, gY - 90, 8, 10);
    }
    ctx.restore();
  }

  // ─── WORLD 7: CYBER CITY ───
  private drawCyberWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Grid lines on background
    ctx.save();
    ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, gY);
      ctx.stroke();
    }
    for (let gy = 0; gy < gY; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.restore();

    // FAR: Skyscrapers
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      for (let bx = 0; bx < width; bx += 70) {
        const bh = 60 + Math.abs(Math.sin(bx * 4.3)) * 120;
        const bw = 50;
        ctx.fillStyle = "#0f172a";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(ox + bx, gY - bh, bw, bh);
        // Neon window stripes (optimized for performance)
        ctx.fillStyle = neonColors[(i + bx) % neonColors.length];
        ctx.globalAlpha = Math.sin(t * 0.02 + bx * 0.1) > 0 ? 0.6 : 0.1;
        ctx.fillRect(ox + bx + 10, gY - bh + 10, 8, bh - 20);
        ctx.fillStyle = neonColors[(i + bx + 1) % neonColors.length];
        ctx.globalAlpha = Math.sin(t * 0.03 + bx * 0.2) > 0 ? 0.6 : 0.1;
        ctx.fillRect(ox + bx + 30, gY - bh + 10, 8, bh - 20);
        
        // Horizontal bands
        ctx.fillStyle = "#0f172a";
        ctx.globalAlpha = 1;
        for (let wy = gY - bh + 30; wy < gY; wy += 30) {
          ctx.fillRect(ox + bx, wy, bw, 8);
        }
      }
    }
    ctx.restore();

    // MID: Flying vehicle streaks
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let v = 0; v < 3; v++) {
      const vx = ((t * (2 + v) + v * 300) % (width + 200)) - 100;
      const vy = gY * 0.2 + v * gY * 0.15;
      ctx.strokeStyle = v === 0 ? "#22d3ee" : v === 1 ? "#c026d3" : "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx - 40, vy);
      ctx.stroke();
      // Vehicle dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(vx, vy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Neon glow bottom
    ctx.save();
    const neonGlow = ctx.createLinearGradient(0, gY - 40, 0, gY);
    neonGlow.addColorStop(0, "rgba(34, 211, 238, 0)");
    neonGlow.addColorStop(1, "rgba(34, 211, 238, 0.15)");
    ctx.fillStyle = neonGlow;
    ctx.fillRect(0, gY - 40, width, 40);
    ctx.restore();
  }

  // ─── WORLD 8: SKY KINGDOM ───
  private drawSkyWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Layered cloud banks
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.45)";
      for (let i = -1; i < 3; i++) {
        const ox = this.bgFarX + i * width;
        for (let cx = 0; cx < width; cx += 160 - layer * 30) {
          const cy = gY * (0.6 + layer * 0.15) + Math.sin(cx * 0.015 + layer) * 20;
          ctx.beginPath();
          ctx.arc(ox + cx, cy, 35 - layer * 5, 0, Math.PI * 2);
          ctx.arc(ox + cx + 30, cy - 8, 28 - layer * 3, 0, Math.PI * 2);
          ctx.arc(ox + cx + 55, cy - 3, 32 - layer * 4, 0, Math.PI * 2);
          ctx.arc(ox + cx + 80, cy + 2, 25 - layer * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // MID: Grand floating castle / towers
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;

      // === LARGE CASTLE (centered) ===
      const castleX = ox + width * 0.5;
      const castleBase = gY * 0.42 + Math.sin(t * 0.008) * 6;
      ctx.globalAlpha = 0.85;

      // Cloud platform under castle
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.ellipse(castleX, castleBase + 15, 80, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.ellipse(castleX, castleBase + 22, 65, 10, 0, 0, Math.PI);
      ctx.fill();

      // Castle walls
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(castleX - 35, castleBase - 50, 70, 65);
      // Wall shading
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(castleX - 35, castleBase - 50, 15, 65);

      // Center tower (tallest)
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(castleX - 12, castleBase - 90, 24, 40);
      // Tower top (pointed)
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(castleX - 16, castleBase - 90);
      ctx.lineTo(castleX, castleBase - 115);
      ctx.lineTo(castleX + 16, castleBase - 90);
      ctx.fill();
      // Flag
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(castleX - 1, castleBase - 125, 2, 12);
      ctx.beginPath();
      ctx.moveTo(castleX + 1, castleBase - 125);
      ctx.lineTo(castleX + 12, castleBase - 121);
      ctx.lineTo(castleX + 1, castleBase - 117);
      ctx.fill();

      // Side towers
      for (const side of [-1, 1]) {
        const tx = castleX + side * 30;
        ctx.fillStyle = "#fef9c3";
        ctx.fillRect(tx - 8, castleBase - 65, 16, 30);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.moveTo(tx - 10, castleBase - 65);
        ctx.lineTo(tx, castleBase - 80);
        ctx.lineTo(tx + 10, castleBase - 65);
        ctx.fill();
      }

      // Windows
      ctx.fillStyle = "#7dd3fc";
      ctx.globalAlpha = 0.7;
      for (let wy = 0; wy < 3; wy++) {
        for (let wx = 0; wx < 3; wx++) {
          ctx.beginPath();
          ctx.arc(castleX - 15 + wx * 15, castleBase - 40 + wy * 16, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Arched doorway
      ctx.fillStyle = "#1e3a5f";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(castleX, castleBase + 5, 8, Math.PI, 0);
      ctx.fillRect(castleX - 8, castleBase + 5, 16, 10);
      ctx.fill();

      // === SMALL TOWER (left side) ===
      const towerX = ox + width * 0.15;
      const towerBase = gY * 0.55 + Math.sin(t * 0.012 + 2) * 5;
      ctx.globalAlpha = 0.7;
      // Cloud
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.ellipse(towerX, towerBase + 8, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tower
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(towerX - 8, towerBase - 40, 16, 48);
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(towerX - 10, towerBase - 40);
      ctx.lineTo(towerX, towerBase - 55);
      ctx.lineTo(towerX + 10, towerBase - 40);
      ctx.fill();

      // === WATCHTOWER (right side) ===
      const wt2X = ox + width * 0.82;
      const wt2Base = gY * 0.48 + Math.sin(t * 0.01 + 4) * 7;
      ctx.globalAlpha = 0.75;
      // Cloud
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.ellipse(wt2X, wt2Base + 10, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tower body
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(wt2X - 10, wt2Base - 35, 20, 45);
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.moveTo(wt2X - 13, wt2Base - 35);
      ctx.lineTo(wt2X, wt2Base - 50);
      ctx.lineTo(wt2X + 13, wt2Base - 35);
      ctx.fill();
      // Window
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.arc(wt2X, wt2Base - 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Rainbow bridge (subtle)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 6;
    const rainbowColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
    for (let r = 0; r < rainbowColors.length; r++) {
      ctx.strokeStyle = rainbowColors[r];
      ctx.beginPath();
      ctx.arc(width * 0.5, gY * 0.8, gY * 0.5 + r * 6, Math.PI * 1.1, Math.PI * -0.1);
      ctx.stroke();
    }
    ctx.restore();

    // Small birds
    ctx.save();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    for (let b = 0; b < 5; b++) {
      const bx = ((t * 0.6 + b * 130) % (width + 100)) - 50;
      const by = gY * 0.12 + b * 25;
      const wingUp = Math.sin(t * 0.15 + b * 2.5) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + wingUp);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by + wingUp);
      ctx.stroke();
    }
    ctx.restore();

    // Golden sunlight from top
    ctx.save();
    const skyGlow = ctx.createRadialGradient(width * 0.5, -30, 20, width * 0.5, -30, width * 0.7);
    skyGlow.addColorStop(0, "rgba(253, 224, 71, 0.2)");
    skyGlow.addColorStop(0.5, "rgba(253, 224, 71, 0.06)");
    skyGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ─── WORLD 9: DESERT ───
  private drawDesertWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Strong sun
    ctx.save();
    const sunGrad = ctx.createRadialGradient(width * 0.8, 50, 15, width * 0.8, 50, 200);
    sunGrad.addColorStop(0, "rgba(251, 191, 36, 0.9)");
    sunGrad.addColorStop(0.3, "rgba(251, 191, 36, 0.3)");
    sunGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();

    // FAR: Sand dunes
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? "#d97706" : "#f59e0b";
      ctx.globalAlpha = 0.6 + layer * 0.2;
      for (let i = -1; i < 3; i++) {
        const ox = this.bgFarX + i * width;
        ctx.beginPath();
        ctx.moveTo(ox, gY);
        for (let x = 0; x <= width; x += 30) {
          const h = Math.sin((x + layer * 150) * 0.01) * 50 + 60 + layer * 20;
          ctx.lineTo(ox + x, gY - h);
        }
        ctx.lineTo(ox + width, gY);
        ctx.fill();
      }
    }
    ctx.restore();

    // MID: Palm trees, ruins
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let px = 0; px < width; px += 180) {
        // Palm trunk
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.8;
        const palmX = ox + px + 90;
        ctx.beginPath();
        const lean = Math.sin(t * 0.01 + px) * 5;
        ctx.moveTo(palmX, gY);
        ctx.bezierCurveTo(palmX + lean, gY - 30, palmX + lean * 2, gY - 60, palmX + lean * 2.5, gY - 80);
        ctx.stroke();
        // Palm leaves
        ctx.fillStyle = "#16a34a";
        ctx.globalAlpha = 0.7;
        for (let l = 0; l < 5; l++) {
          const angle = (l / 5) * Math.PI * 2 + t * 0.005;
          ctx.beginPath();
          const lx = palmX + lean * 2.5;
          const ly = gY - 80;
          ctx.moveTo(lx, ly);
          ctx.bezierCurveTo(
            lx + Math.cos(angle) * 15, ly + Math.sin(angle) * 15 - 10,
            lx + Math.cos(angle) * 30, ly + Math.sin(angle) * 10,
            lx + Math.cos(angle) * 35, ly + Math.sin(angle) * 20
          );
          ctx.lineTo(lx, ly);
          ctx.fill();
        }
      }
      // Ancient ruins / Pyramids
      if (i === 0) {
        const pyX = ox + width * 0.4;
        
        // Large Pyramid
        ctx.fillStyle = "#b45309"; // shadow side
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(pyX, gY);
        ctx.lineTo(pyX + 80, gY - 100);
        ctx.lineTo(pyX + 160, gY);
        ctx.fill();
        
        ctx.fillStyle = "#d97706"; // light side
        ctx.beginPath();
        ctx.moveTo(pyX + 80, gY);
        ctx.lineTo(pyX + 80, gY - 100);
        ctx.lineTo(pyX + 160, gY);
        ctx.fill();
        
        // Small Pyramid
        ctx.fillStyle = "#b45309"; 
        ctx.beginPath();
        ctx.moveTo(pyX - 40, gY);
        ctx.lineTo(pyX, gY - 60);
        ctx.lineTo(pyX + 40, gY);
        ctx.fill();
        
        ctx.fillStyle = "#d97706"; 
        ctx.beginPath();
        ctx.moveTo(pyX, gY);
        ctx.lineTo(pyX, gY - 60);
        ctx.lineTo(pyX + 40, gY);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Heat haze
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#fbbf24";
    const hazeY = gY - 20 + Math.sin(t * 0.05) * 5;
    ctx.fillRect(0, hazeY, width, 20);
    ctx.restore();
  }

  // ─── WORLD 10: SAKURA ───
  private drawSakuraWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Japanese mountains
    ctx.save();
    ctx.fillStyle = "#f9a8d4";
    ctx.globalAlpha = 0.4;
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      ctx.beginPath();
      ctx.moveTo(ox, gY);
      for (let x = 0; x <= width; x += 40) {
        const h = Math.sin(x * 0.007) * 70 + 100;
        ctx.lineTo(ox + x, gY - h);
      }
      ctx.lineTo(ox + width, gY);
      ctx.fill();
    }
    // Snow caps
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.3;
    for (let i = -1; i < 3; i++) {
      const ox = this.getScrollOffset(0.15) + i * width;
      ctx.beginPath();
      ctx.moveTo(ox, gY);
      for (let x = 0; x <= width; x += 40) {
        const h = Math.sin(x * 0.007) * 70 + 100;
        ctx.lineTo(ox + x, gY - h);
      }
      for (let x = width; x >= 0; x -= 40) {
        const h = Math.sin(x * 0.007) * 70 + 100;
        ctx.lineTo(ox + x, gY - h + 12);
      }
      ctx.fill();
    }
    ctx.restore();

    // MID: Sakura trees
    ctx.save();
    const midOff = this.getScrollOffset(0.4);
    for (let i = 0; i < 2; i++) {
      const ox = midOff + i * width;
      for (let tx = 0; tx < width; tx += 130) {
        const treeX = ox + tx + 65;
        // Trunk
        ctx.fillStyle = "#78350f";
        ctx.globalAlpha = 0.9;
        ctx.fillRect(treeX - 5, gY - 50, 10, 50);
        // Branch curve
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(treeX, gY - 40);
        ctx.bezierCurveTo(treeX - 30, gY - 60, treeX - 40, gY - 70, treeX - 35, gY - 80);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(treeX, gY - 35);
        ctx.bezierCurveTo(treeX + 25, gY - 55, treeX + 35, gY - 65, treeX + 30, gY - 75);
        ctx.stroke();
        // Cherry blossoms (clusters)
        const blossomPositions = [
          [treeX - 35, gY - 80], [treeX + 30, gY - 75],
          [treeX - 20, gY - 65], [treeX + 15, gY - 60],
          [treeX, gY - 55],
        ];
        for (const [bx, by] of blossomPositions) {
          ctx.fillStyle = "#fbcfe8";
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(bx, by, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f9a8d4";
          ctx.beginPath();
          ctx.arc(bx - 3, by - 3, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Traditional bridge silhouette
    ctx.save();
    const nearOff = this.getScrollOffset(0.7);
    const bridgeX = ((width * 0.4 + nearOff * 0.5) % (width + 300) + width) % (width + 300) - 150;
    ctx.fillStyle = "#7f1d1d";
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(bridgeX, gY);
    ctx.bezierCurveTo(bridgeX + 30, gY - 25, bridgeX + 70, gY - 25, bridgeX + 100, gY);
    ctx.fill();
    // Railing posts
    ctx.fillRect(bridgeX + 10, gY - 30, 3, 15);
    ctx.fillRect(bridgeX + 45, gY - 32, 3, 15);
    ctx.fillRect(bridgeX + 85, gY - 30, 3, 15);
    ctx.restore();

    // Soft pink glow
    ctx.save();
    ctx.fillStyle = "rgba(252, 231, 243, 0.1)";
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ──────────────────────────────────────────────────────
  //  FLOOR
  // ──────────────────────────────────────────────────────

  private drawFloor(state: FlippyState) {
    const { ctx, width, height } = this;
    const world = state.currentWorld;

    let floorColor = "#1e293b";
    let stripeColor = "#334155";
    let topColor = "";

    switch (world.id) {
      case "forest":  floorColor = "#14532d"; stripeColor = "#166534"; topColor = "#22c55e"; break;
      case "snow":    floorColor = "#e2e8f0"; stripeColor = "#f1f5f9"; topColor = "#ffffff"; break;
      case "volcano": floorColor = "#1c1917"; stripeColor = "#292524"; topColor = "#7f1d1d"; break;
      case "ocean":   floorColor = "#164e63"; stripeColor = "#0e7490"; topColor = "#67e8f9"; break;
      case "space":   floorColor = "#020617"; stripeColor = "#0f172a"; topColor = "#334155"; break;
      case "dark":    floorColor = "#09090b"; stripeColor = "#18181b"; topColor = "#27272a"; break;
      case "cyber":   floorColor = "#020617"; stripeColor = "#0f172a"; topColor = "#22d3ee"; break;
      case "sky":     floorColor = "#fef3c7"; stripeColor = "#fde68a"; topColor = "#22c55e"; break;
      case "desert":  floorColor = "#92400e"; stripeColor = "#b45309"; topColor = "#d97706"; break;
      case "sakura":  floorColor = "#831843"; stripeColor = "#9d174d"; topColor = "#f472b6"; break;
    }

    ctx.fillStyle = floorColor;
    ctx.fillRect(0, state.groundY, width, height - state.groundY);

    // Scrolling stripes
    ctx.fillStyle = stripeColor;
    for (let i = -60; i < width + 60; i += 60) {
      ctx.fillRect(i + this.fgX, state.groundY + 4, 30, height - state.groundY);
    }

    // Top edge highlight
    if (topColor) {
      ctx.fillStyle = topColor;
      ctx.fillRect(0, state.groundY, width, 4);
    }
  }

  // ──────────────────────────────────────────────────────
  //  FOG / ATMOSPHERE
  // ──────────────────────────────────────────────────────

  private drawFogUnder(state: FlippyState) {
    const world = state.currentWorld;
    if (!world.fogColor) return;
    const { ctx, width } = this;
    // Soft gradient fog from bottom
    ctx.save();
    const fogGrad = ctx.createLinearGradient(0, state.groundY - 80, 0, state.groundY);
    fogGrad.addColorStop(0, "rgba(0,0,0,0)");
    fogGrad.addColorStop(1, world.fogColor);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, state.groundY - 80, width, 80);
    ctx.restore();
  }

  private drawFogOver(state: FlippyState) {
    const world = state.currentWorld;
    if (!world.fogColor) return;
    const { ctx, width } = this;
    // Full screen light fog
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = world.fogColor;
    // Animated sine fog bands
    for (let fy = 0; fy < state.groundY; fy += 60) {
      const shift = Math.sin(state.frames * 0.008 + fy * 0.05) * 30;
      ctx.globalAlpha = 0.05 + Math.sin(state.frames * 0.01 + fy * 0.03) * 0.03;
      ctx.fillRect(shift - 30, fy, width + 60, 40);
    }
    ctx.restore();
  }

  // ──────────────────────────────────────────────────────
  //  PARTICLES
  // ──────────────────────────────────────────────────────

  private updateAndDrawParticles(state: FlippyState) {
    const { ctx, width, height } = this;
    const world = state.currentWorld;
    const gY = state.groundY;

    // Spawn rates differ by type
    let spawnRate = 0.3;
    if (world.particleType === "snow" || world.particleType === "fire" || world.particleType === "sand") spawnRate = 0.7;
    if (world.particleType === "petals" || world.particleType === "leaves") spawnRate = 0.5;
    if (world.particleType === "bubbles" || world.particleType === "sparkles") spawnRate = 0.4;

    if (state.status === "playing" && Math.random() < spawnRate) {
      let vx = -state.speed * 0.5;
      let vy = 0;
      let x = width + 10;
      let y = Math.random() * gY;
      let size = Math.random() * 4 + 2;
      let subType = "default";

      switch (world.particleType) {
        case "leaves":
          vy = Math.random() * 1.5 + 0.5;
          vx = -Math.random() * 2 - 1;
          x = Math.random() * width;
          y = -10;
          size = Math.random() * 5 + 3;
          subType = Math.random() > 0.5 ? "leaf" : "dust";
          break;
        case "snow":
          vy = Math.random() * 2 + 1;
          vx = -Math.random() * 1.5 + (Math.random() - 0.5);
          x = Math.random() * width;
          y = -10;
          size = Math.random() * 3 + 1;
          break;
        case "fire":
          vy = -Math.random() * 4 - 2;
          vx = (Math.random() - 0.5) * 2;
          y = gY - 5;
          x = Math.random() * width;
          size = Math.random() * 5 + 2;
          subType = Math.random() > 0.3 ? "ember" : "smoke";
          break;
        case "bubbles":
          vy = -Math.random() * 1.5 - 0.5;
          vx = (Math.random() - 0.5) * 0.5;
          x = Math.random() * width;
          y = gY;
          size = Math.random() * 6 + 2;
          break;
        case "stars":
          vx = -state.speed * 0.2;
          vy = 0;
          size = Math.random() * 2 + 1;
          break;
        case "shadows":
          vy = -Math.random() * 0.5 - 0.2;
          vx = (Math.random() - 0.5) * 0.8;
          x = Math.random() * width;
          y = gY;
          size = Math.random() * 8 + 4;
          break;
        case "digital":
          vx = -state.speed * 2.5;
          vy = 0;
          size = Math.random() * 2 + 1;
          break;
        case "sparkles":
          vy = -Math.random() * 1 - 0.3;
          vx = (Math.random() - 0.5) * 1.5;
          x = Math.random() * width;
          y = Math.random() * gY;
          size = Math.random() * 3 + 1;
          break;
        case "sand":
          vx = -state.speed * 1.8 - 2;
          vy = Math.random() * 0.5 - 0.25;
          size = Math.random() * 2 + 1;
          break;
        case "petals":
          vy = Math.random() * 1.5 + 0.5;
          vx = -Math.random() * 1 - 0.5;
          x = Math.random() * width;
          y = -10;
          size = Math.random() * 4 + 3;
          break;
      }

      this.particles.push({
        x, y, vx, vy, size,
        alpha: 1,
        life: Math.random() * 120 + 60,
        maxLife: 180,
        color: world.particleColor,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        type: subType,
      });
    }

    // Cap particles for performance
    if (this.particles.length > 120) {
      this.particles.splice(0, this.particles.length - 120);
    }

    // Update & Draw
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.rotation += p.rotSpeed;

      // Type-specific motion
      if (world.particleType === "petals" || world.particleType === "leaves") {
        p.vx += Math.sin(state.frames * 0.08 + p.life * 0.1) * 0.03;
        p.vy += Math.cos(state.frames * 0.06 + p.life * 0.07) * 0.01;
      } else if (world.particleType === "fire" && p.type === "ember") {
        p.size *= 0.97;
      } else if (world.particleType === "snow") {
        p.vx += Math.sin(state.frames * 0.03 + i) * 0.02;
      } else if (world.particleType === "bubbles") {
        p.vx += Math.sin(state.frames * 0.05 + i * 0.5) * 0.03;
        p.size *= 0.999;
      }

      p.alpha = Math.min(1, p.life / 40);

      if (p.life <= 0 || p.x < -30 || p.y > gY + 30 || p.y < -30 || p.size < 0.3) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      switch (world.particleType) {
        case "leaves":
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          if (p.type === "leaf") {
            ctx.fillStyle = Math.random() > 0.5 ? "#22c55e" : "#16a34a";
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Leaf vein
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(p.size, 0);
            ctx.stroke();
          } else {
            // Dust mote
            ctx.globalAlpha *= 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case "snow":
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // Crystalline highlight
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "fire":
          if (p.type === "smoke") {
            ctx.fillStyle = "rgba(120, 113, 108, 0.4)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = p.life > 40 ? "#fbbf24" : "#f97316";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            // Glow halo (cheaper than shadowBlur)
            ctx.globalAlpha *= 0.3;
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case "bubbles":
          ctx.strokeStyle = "rgba(186, 230, 253, 0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          // Specular highlight
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.25, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "stars":
          const twinkle = Math.sin(state.frames * 0.1 + p.life) * 0.4 + 0.6;
          ctx.globalAlpha *= twinkle;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "shadows":
          ctx.fillStyle = p.color;
          ctx.globalAlpha *= 0.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "digital":
          ctx.fillStyle = Math.random() > 0.5 ? "#22d3ee" : "#c026d3";
          ctx.fillRect(p.x, p.y, p.size * 6, 1);
          break;

        case "sparkles":
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          // 4-pointed star shape
          const ss = p.size;
          ctx.moveTo(p.x, p.y - ss);
          ctx.lineTo(p.x + ss * 0.3, p.y - ss * 0.3);
          ctx.lineTo(p.x + ss, p.y);
          ctx.lineTo(p.x + ss * 0.3, p.y + ss * 0.3);
          ctx.lineTo(p.x, p.y + ss);
          ctx.lineTo(p.x - ss * 0.3, p.y + ss * 0.3);
          ctx.lineTo(p.x - ss, p.y);
          ctx.lineTo(p.x - ss * 0.3, p.y - ss * 0.3);
          ctx.closePath();
          ctx.fill();
          break;

        case "sand":
          ctx.fillStyle = Math.random() > 0.5 ? "#fcd34d" : "#d97706";
          ctx.fillRect(p.x, p.y, p.size * 2, p.size * 0.6);
          break;

        case "petals":
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = Math.random() > 0.3 ? "#f9a8d4" : "#fbcfe8";
          ctx.beginPath();
          // Petal shape
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size, -p.size, p.size, p.size, 0, p.size);
          ctx.bezierCurveTo(-p.size, p.size, -p.size, -p.size, 0, -p.size);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  // ──────────────────────────────────────────────────────
  //  PIPE / OBSTACLE DRAWING
  // ──────────────────────────────────────────────────────

  private drawPipes(state: FlippyState) {
    const { ctx } = this;
    const world = state.currentWorld;

    state.pipes.forEach(p => {
      const pY = p.y + (p.offsetY || 0);

      ctx.save();

      if (world.obstacleStyle === "neon") {
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 8;
      }

      const drawSeg = (yStart: number, pHeight: number, isTop: boolean) => {
        if (pHeight <= 0) return;
        const style = (p.isPortal && p.nextWorldObj) ? p.nextWorldObj.obstacleStyle : world.obstacleStyle;
        const w = p.width;

        switch (style) {
          case "wood":
            this.drawWoodPipe(p.x, yStart, w, pHeight, isTop);
            break;
          case "ice":
            this.drawIcePipe(p.x, yStart, w, pHeight, isTop, state.frames);
            break;
          case "lava":
            this.drawLavaPipe(p.x, yStart, w, pHeight, isTop, state.frames);
            break;
          case "coral":
            this.drawCoralPipe(p.x, yStart, w, pHeight, isTop, state.frames);
            break;
          case "space":
            this.drawSpacePipe(p.x, yStart, w, pHeight, isTop, state.frames);
            break;
          case "dark":
            this.drawDarkPipe(p.x, yStart, w, pHeight, isTop);
            break;
          case "neon":
            this.drawNeonPipe(p.x, yStart, w, pHeight, isTop, state.frames);
            break;
          case "cloud":
            this.drawCloudPipe(p.x, yStart, w, pHeight, isTop);
            break;
          case "sandstone":
            this.drawSandstonePipe(p.x, yStart, w, pHeight, isTop);
            break;
          case "sakura":
            this.drawSakuraPipe(p.x, yStart, w, pHeight, isTop);
            break;
        }
      };

      // Top obstacle
      drawSeg(0, pY - p.gap / 2, true);
      // Bottom obstacle
      drawSeg(pY + p.gap / 2, state.groundY - (pY + p.gap / 2), false);

      ctx.restore();
    });
  }

  // ─── Individual pipe style methods ───

  private drawWoodPipe(x: number, y: number, w: number, h: number, isTop: boolean) {
    const ctx = this.ctx;
    // Bark body
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, w, h);
    // Bark texture
    ctx.fillStyle = "#92400e";
    ctx.fillRect(x + 4, y, 6, h);
    ctx.fillRect(x + 18, y, 4, h);
    ctx.fillRect(x + 34, y, 8, h);
    // Dark bark lines
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x + 12, y, 2, h);
    ctx.fillRect(x + 28, y, 2, h);
    ctx.fillRect(x + 44, y, 2, h);
    // Moss cap
    const capH = 18;
    const capY = isTop ? y + h - capH : y;
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.roundRect(x - 6, capY, w + 12, capH, 6);
    ctx.fill();
    // Moss texture
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(x + 5, isTop ? capY + capH : capY, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 5, isTop ? capY + capH : capY, 4, 0, Math.PI * 2);
    ctx.fill();
    // Small mushrooms
    if (!isTop) {
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.arc(x - 2, y + 5, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.fillRect(x - 1, y + 5, 3, 5);
      // Dots on mushroom
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x - 3, y + 2, 1, 0, Math.PI * 2);
      ctx.arc(x + 1, y + 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawIcePipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number) {
    const ctx = this.ctx;
    // Main ice body
    ctx.fillStyle = "rgba(186, 230, 253, 0.65)";
    ctx.fillRect(x, y, w, h);
    // Inner highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(x + 2, y, w * 0.25, h);
    // Refraction lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let ly = y + 20; ly < y + h; ly += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 5, ly);
      ctx.lineTo(x + w - 5, ly + 15);
      ctx.stroke();
    }
    // Icicles
    const icicleY = isTop ? y + h : y;
    ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
    for (let ix = 0; ix < w; ix += 10) {
      const icicleH = 6 + Math.sin(ix + t * 0.02) * 3;
      ctx.beginPath();
      ctx.moveTo(x + ix, icicleY);
      ctx.lineTo(x + ix + 4, isTop ? icicleY + icicleH : icicleY - icicleH);
      ctx.lineTo(x + ix + 8, icicleY);
      ctx.fill();
    }
  }

  private drawLavaPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number) {
    const ctx = this.ctx;
    // Dark rock body
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(x, y, w, h);
    // Rock texture
    ctx.fillStyle = "#292524";
    for (let ry = y; ry < y + h; ry += 25) {
      ctx.fillRect(x, ry, w, 3);
    }
    // Lava cracks (animated glow)
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(t * 0.08) * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 15);
    ctx.lineTo(x + 15, y + h * 0.3);
    ctx.lineTo(x + 8, y + h * 0.5);
    ctx.lineTo(x + 20, y + h * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 10);
    ctx.lineTo(x + 38, y + h * 0.4);
    ctx.lineTo(x + 30, y + h * 0.8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Glowing edge
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 3, capY - (isTop ? 6 : 0), w + 6, 6);
    ctx.shadowBlur = 0;
  }

  private drawCoralPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number) {
    const ctx = this.ctx;
    // Coral body
    ctx.fillStyle = "#0e7490";
    ctx.fillRect(x, y, w, h);
    // Organic texture
    ctx.fillStyle = "#155e75";
    for (let cy = y; cy < y + h; cy += 20) {
      ctx.beginPath();
      ctx.arc(x + w * 0.3, cy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Coral growth on edges
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#fb7185";
    for (let cx = 0; cx < w; cx += 12) {
      ctx.beginPath();
      const blobH = 8 + Math.sin(cx * 3 + t * 0.02) * 3;
      ctx.arc(x + cx + 6, isTop ? capY + blobH * 0.3 : capY - blobH * 0.3, blobH, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cap
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(x - 5, capY - (isTop ? 8 : 0), w + 10, 8);
  }

  private drawSpacePipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number) {
    const ctx = this.ctx;
    // Metal body
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x, y, w, h);
    // Metal panels
    ctx.fillStyle = "#334155";
    ctx.fillRect(x + 2, y, 3, h);
    ctx.fillRect(x + w - 5, y, 3, h);
    // Animated neon strip
    const stripColor = `hsl(${(t * 2) % 360}, 80%, 60%)`;
    ctx.fillStyle = stripColor;
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    // Blinking lights
    for (let ly = y + 15; ly < y + h - 15; ly += 30) {
      ctx.fillStyle = Math.sin(t * 0.1 + ly) > 0 ? "#22d3ee" : "#0f172a";
      ctx.beginPath();
      ctx.arc(x + 10, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Station cap
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x - 8, capY - (isTop ? 12 : 0), w + 16, 12);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x - 8, capY - (isTop ? 12 : 0), w + 16, 3);
  }

  private drawDarkPipe(x: number, y: number, w: number, h: number, isTop: boolean) {
    const ctx = this.ctx;
    // Obsidian body
    ctx.fillStyle = "#18181b";
    ctx.fillRect(x, y, w, h);
    // Stone texture
    ctx.fillStyle = "#27272a";
    ctx.fillRect(x, y, w * 0.15, h);
    ctx.fillStyle = "#3f3f46";
    for (let sy = y; sy < y + h; sy += 20) {
      ctx.fillRect(x, sy, w, 1);
    }
    // Spikes
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#3f3f46";
    for (let sx = 0; sx < w; sx += 12) {
      ctx.beginPath();
      ctx.moveTo(x + sx, capY);
      ctx.lineTo(x + sx + 6, isTop ? capY + 15 : capY - 15);
      ctx.lineTo(x + sx + 12, capY);
      ctx.fill();
    }
    // Glowing rune
    ctx.fillStyle = "#ef4444";
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawNeonPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number) {
    const ctx = this.ctx;
    // Dark body
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x, y, w, h);
    // Neon border
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    // Inner neon lines
    ctx.strokeStyle = "#c026d3";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + 5, y + h - 5);
    ctx.moveTo(x + w - 5, y + 5);
    ctx.lineTo(x + w - 5, y + h - 5);
    ctx.stroke();
    // Scanning line
    const scanY = y + ((t * 2) % h);
    ctx.fillStyle = "rgba(34, 211, 238, 0.3)";
    ctx.fillRect(x, scanY, w, 3);
    // Cap
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#c026d3";
    ctx.shadowColor = "#c026d3";
    ctx.shadowBlur = 10;
    ctx.fillRect(x - 5, capY - (isTop ? 8 : 0), w + 10, 8);
    ctx.shadowBlur = 0;
  }

  private drawCloudPipe(x: number, y: number, w: number, h: number, isTop: boolean) {
    const ctx = this.ctx;
    // Main cloud column
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 15);
    ctx.fill();
    // Cloud shadow
    ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
    ctx.fillRect(x + w * 0.7, y, w * 0.3, h);
    // Cloud puffs at edges
    const puffY = isTop ? y + h : y;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(x + 10, puffY, 12, 0, Math.PI * 2);
    ctx.arc(x + w / 2, isTop ? puffY + 5 : puffY - 5, 15, 0, Math.PI * 2);
    ctx.arc(x + w - 10, puffY, 12, 0, Math.PI * 2);
    ctx.fill();
    // Golden rim
    ctx.fillStyle = "rgba(253, 224, 71, 0.4)";
    ctx.fillRect(x - 2, puffY - (isTop ? 4 : 0), w + 4, 4);
  }

  private drawSandstonePipe(x: number, y: number, w: number, h: number, isTop: boolean) {
    const ctx = this.ctx;
    // Sandstone body
    ctx.fillStyle = "#d97706";
    ctx.fillRect(x, y, w, h);
    // Brick pattern
    ctx.fillStyle = "#b45309";
    for (let by = y; by < y + h; by += 18) {
      ctx.fillRect(x, by, w, 2);
      const offset = Math.floor(by / 18) % 2 === 0 ? 0 : w / 2;
      ctx.fillRect(x + offset, by, 2, 18);
    }
    // Hieroglyph-style marks
    ctx.fillStyle = "#92400e";
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + 15, y + h * 0.3, 8, 12);
    ctx.fillRect(x + 28, y + h * 0.5, 6, 10);
    ctx.globalAlpha = 1;
    // Cap
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(x - 5, capY - (isTop ? 12 : 0), w + 10, 12);
    // Stepped cap
    ctx.fillRect(x - 2, capY - (isTop ? 16 : -4), w + 4, 4);
  }

  private drawSakuraPipe(x: number, y: number, w: number, h: number, isTop: boolean) {
    const ctx = this.ctx;
    // Dark wood body
    ctx.fillStyle = "#451a03";
    ctx.fillRect(x, y, w, h);
    // Wood grain
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + 5, y, 4, h);
    ctx.fillRect(x + 20, y, 3, h);
    ctx.fillRect(x + 38, y, 5, h);
    // Cap: Torii gate style
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(x - 8, capY - (isTop ? 10 : 0), w + 16, 10);
    ctx.fillRect(x - 10, capY - (isTop ? 14 : -4), w + 20, 4);
    // Small pink blossoms on cap
    ctx.fillStyle = "#f9a8d4";
    ctx.beginPath();
    ctx.arc(x - 4, isTop ? capY + 4 : capY - 4, 5, 0, Math.PI * 2);
    ctx.arc(x + w + 4, isTop ? capY + 4 : capY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ──────────────────────────────────────────────────────
  //  BIRD
  // ──────────────────────────────────────────────────────

  /** Lightens (positive) or darkens (negative) a #rrggbb color by `amount` (0..1). */
  private shade(hex: string, amount: number): string {
    const n = parseInt(hex.replace("#", ""), 16);
    const clamp = (v: number) => Math.min(255, Math.max(0, v));
    const r = clamp(((n >> 16) & 0xff) + Math.round(255 * amount));
    const g = clamp(((n >> 8) & 0xff) + Math.round(255 * amount));
    const b = clamp((n & 0xff) + Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawBird(state: FlippyState) {
    const { ctx } = this;
    const { bird } = state;
    const world = state.currentWorld;
    const tick = this.renderTick;

    // How long (in render frames, capped) the bird has been "dead" — drives a
    // brief continued fall/spin purely on the canvas. Never touches engine
    // state, so scoring/collision timing is completely unaffected.
    const deathElapsed = this.deathStartTick !== null ? Math.min(tick - this.deathStartTick, 40) : 0;
    const fallOffset = deathElapsed > 0 ? Math.pow(deathElapsed / 40, 1.5) * 46 : 0;
    const deathSpin = deathElapsed > 0 ? Math.min(deathElapsed * 0.045, 1.15) : 0;
    const idleBob = state.status === "idle" ? Math.sin(tick * 0.06) * 4 : 0;

    ctx.save();
    ctx.translate(bird.pos.x, bird.pos.y + fallOffset + idleBob);
    ctx.rotate(bird.rotation + deathSpin);

    // Bird Skin colors
    let bodyColor = "#facc15";
    let wingColor = "#fef08a";
    let eyeColor = "#000000";
    let beakColor = "#f97316";
    const isClassic = world.birdSkin === "classic";

    switch (world.birdSkin) {
      case "dark": bodyColor = "#27272a"; wingColor = "#3f3f46"; eyeColor = "#ef4444"; beakColor = "#52525b"; break;
      case "cyber": bodyColor = "#0f172a"; wingColor = "#c026d3"; eyeColor = "#22d3ee"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10; break;
      case "winter": bodyColor = "#facc15"; wingColor = "#bae6fd"; break;
      case "burnt": bodyColor = "#450a0a"; wingColor = "#7f1d1d"; eyeColor = "#fde047"; beakColor = "#b91c1c"; break;
      case "astronaut": bodyColor = "#ffffff"; wingColor = "#cbd5e1"; break;
      case "sakura": bodyColor = "#fbcfe8"; wingColor = "#fce7f3"; beakColor = "#f43f5e"; break;
      case "angel": bodyColor = "#f8fafc"; wingColor = "#ffffff"; eyeColor = "#38bdf8"; beakColor = "#fbbf24"; break;
      case "explorer": bodyColor = "#d4d4d8"; wingColor = "#a1a1aa"; break;
      case "diver": bodyColor = "#0284c7"; wingColor = "#38bdf8"; break;
    }

    // Tail feathers (trailing behind, drawn first so the body overlaps them)
    ctx.save();
    ctx.fillStyle = this.shade(bodyColor, -0.18);
    ctx.globalAlpha = 0.9;
    for (const [ty, trot] of [[-3, -0.35], [1, 0], [5, 0.35]] as const) {
      ctx.save();
      ctx.translate(-11, ty);
      ctx.rotate(trot);
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(-9, 0, -1, 2);
      ctx.quadraticCurveTo(-4, 0, 0, -2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Body — radial gradient for a rounder, more polished 3D look
    const bodyGrad = ctx.createRadialGradient(-3, -8, 2, 2, 2, 24);
    bodyGrad.addColorStop(0, this.shade(bodyColor, 0.28));
    bodyGrad.addColorStop(0.55, bodyColor);
    bodyGrad.addColorStop(1, this.shade(bodyColor, -0.22));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.bezierCurveTo(-13, -17, 13, -19, 17, -3);
    ctx.bezierCurveTo(19, 13, -5, 19, -12, 0);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.shade(bodyColor, -0.4);
    ctx.stroke();

    // GX brand rim-light on the default bird only — a thin cyan edge that
    // reads as a signature accent without fighting the per-world skins.
    if (isClassic) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-11, -3);
      ctx.bezierCurveTo(-10, -15, 10, -17, 15, -4);
      ctx.stroke();
      ctx.restore();
    }

    // Head crest (small tapering tuft) — a bit of character on top
    ctx.fillStyle = this.shade(bodyColor, 0.1);
    for (const cx of [-2, 2, 6]) {
      ctx.beginPath();
      ctx.moveTo(cx, -17);
      ctx.quadraticCurveTo(cx + 2, -23, cx + 4, -18);
      ctx.quadraticCurveTo(cx + 1, -19, cx, -17);
      ctx.fill();
    }

    // Belly highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(-9, 3);
    ctx.bezierCurveTo(-3, -5, 10, -5, 12, 3);
    ctx.bezierCurveTo(10, 11, -5, 11, -9, 3);
    ctx.fill();

    // Gloss
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(1, -12, 6, 2.5, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    if (world.birdSkin === "diver") {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.arc(8, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(8, -8, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(8, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();

      ctx.fillStyle = eyeColor;
      if (state.status === "gameover") {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = eyeColor;
        ctx.beginPath();
        ctx.moveTo(6, -10); ctx.lineTo(10, -6);
        ctx.moveTo(10, -10); ctx.lineTo(6, -6);
        ctx.stroke();
      } else {
        const eyeY = bird.vel.y < 0 ? -9 : bird.vel.y > 2 ? -7 : -8;
        ctx.beginPath();
        ctx.arc(9.5, eyeY, 2, 0, Math.PI * 2);
        ctx.fill();
        if (eyeColor !== "#000000") {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(10, eyeY - 0.5, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Beak
    const beakGrad = ctx.createLinearGradient(12, -3, 22, 3);
    beakGrad.addColorStop(0, this.shade(beakColor, 0.15));
    beakGrad.addColorStop(1, this.shade(beakColor, -0.15));
    ctx.fillStyle = beakGrad;
    ctx.beginPath();
    ctx.moveTo(14, -3);
    ctx.bezierCurveTo(22, -3, 22, 2, 14, 2);
    ctx.bezierCurveTo(18, 4, 18, 6, 12, 5);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.shade(beakColor, -0.35);
    ctx.stroke();

    // Wing — continuous sine flap instead of a chunky 4-frame stepper, so
    // idle/flying/death all read as smooth motion rather than a jerky step.
    ctx.save();
    ctx.translate(-4, 0);
    let wingY: number, wingRot: number;
    if (state.status === "playing") {
      const flap = Math.sin(tick * 0.35);
      wingY = flap * 3.2;
      wingRot = flap * 0.5;
      if (bird.vel.y < -2) { wingY -= 1.5; wingRot -= 0.25; } // sharper stroke right after a jump
    } else if (state.status === "gameover") {
      const settle = Math.min(deathElapsed * 0.12, 4);
      wingY = 3 + settle;
      wingRot = 0.5 + Math.min(deathElapsed * 0.018, 0.35); // trails limply as it falls
    } else {
      const flap = Math.sin(tick * 0.12);
      wingY = flap * 2;
      wingRot = flap * 0.28;
    }
    ctx.translate(0, wingY);
    ctx.rotate(wingRot);
    const wingGrad = ctx.createLinearGradient(-6, -4, 6, 4);
    wingGrad.addColorStop(0, this.shade(wingColor, 0.12));
    wingGrad.addColorStop(1, this.shade(wingColor, -0.15));
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.bezierCurveTo(-6, -4, 4, -4, 6, 0);
    ctx.bezierCurveTo(8, 4, 0, 6, -6, 0);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = this.shade(wingColor, -0.3);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.moveTo(-2, -1); ctx.lineTo(-2, 3);
    ctx.moveTo(2, -1); ctx.lineTo(2, 3);
    ctx.stroke();
    ctx.restore();

    // Accessories
    if (world.birdSkin === "winter") {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, -bird.radius + 2, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, -bird.radius - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Scarf
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-6, 4, 12, 5);
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-6, 4, 12, 2);
      // Scarf tail
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-8, 6, 5, 8);
    } else if (world.birdSkin === "astronaut") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(2, -2, 14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (world.birdSkin === "angel") {
      ctx.strokeStyle = "rgba(255,215,0,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -14, 6, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ──────────────────────────────────────────────────────
  //  EVENTS
  // ──────────────────────────────────────────────────────

  private drawDynamicEvent(state: FlippyState) {
    if (!state.activeEvent) return;

    const { ctx, width, height } = this;
    ctx.save();

    if (state.activeEvent === "fog") {
      ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
      ctx.fillRect(0, 0, width, height);
    } else if (state.activeEvent === "rain") {
      ctx.strokeStyle = "rgba(200, 200, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 100; i++) {
        const rx = (Math.random() * width + state.frames * 2) % width;
        const ry = (Math.random() * height + state.frames * 15) % height;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + 15);
      }
      ctx.stroke();
    } else if (state.activeEvent === "thunder") {
      if (Math.random() < 0.05) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(0, 0, width, height);
      }
    }

    ctx.restore();
  }
}
