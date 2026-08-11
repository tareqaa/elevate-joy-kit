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

  // Render-quality cap on top of the device's own pixel ratio. Starts at 2x
  // (crisp); FlippyCanvas's start-screen Performance/Quality picker calls
  // setQualityMode() below for an explicit choice, and downgradeQuality()
  // is a separate automatic safety net for a device that turns out to
  // struggle regardless of what was picked.
  private dprCap = 2;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.ctx = canvas.getContext("2d")!;
    this.width = width;
    this.height = height;
    this.applyDpr(width, height);
    this.initStars();
  }

  /** Explicit choice from the start-screen Performance/Quality picker.
   *  "performance" pins to 1x — still anti-aliased and clean since this
   *  scene is 100% vector paths/gradients with no drawImage/sprites
   *  anywhere (never pixelated, just not retina-crisp on fine detail) —
   *  and "quality" restores the normal 2x cap. Takes effect immediately,
   *  whether called before or during a round. */
  public setQualityMode(mode: "performance" | "quality") {
    this.dprCap = mode === "performance" ? 1 : 2;
    this.applyDpr(this.width, this.height);
  }

  /** Called by FlippyCanvas after it measures sustained slow frames on this
   *  device — a safety net for a device that struggles even after picking
   *  Quality, since a fixed cap can't be both sharp and smooth on every
   *  device. Returns false if already at the floor (nothing left to
   *  downgrade, e.g. Performance mode was already picked). */
  public downgradeQuality(): boolean {
    if (this.dprCap <= 1) return false;
    this.dprCap = 1;
    this.applyDpr(this.width, this.height);
    return true;
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
    this.applyDpr(width, height);
  }

  /** Sizes the canvas's backing bitmap for the display's actual pixel
   *  density instead of 1 device pixel per CSS pixel, then compensates with
   *  a persistent transform so every existing draw call keeps working in
   *  CSS-pixel space unchanged. Without this the whole scene is rendered at
   *  a lower resolution than the screen and gets upscaled to fit — soft on
   *  any HiDPI display, and reported as especially blurry on iOS, where
   *  Safari's canvas upscaling makes the shortfall more visible than
   *  Chrome does with the same undersized bitmap.
   *
   *  Capped at 2x rather than the raw ratio — every current iPhone reports
   *  devicePixelRatio 3, which would push canvas pixel area (and every
   *  gradient/shadow fill cost this scene pays per frame) to 9x instead of
   *  4x. That's the standard tradeoff point web games cap at: the jump from
   *  1x to 2x is the visually obvious fix (the original blurry-sprites
   *  bug), while 2x to 3x costs proportionally more GPU/CPU than it buys in
   *  perceptible sharpness — reported as a real frame-rate regression on
   *  iPhone after the uncapped version shipped. */
  private applyDpr(width: number, height: number) {
    const canvas = this.ctx.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    this.drawVignette(); // cinematic edge-darkening, uniform across every world
  }

  /** Subtle radial edge-darkening applied on top of every world — a cheap,
   *  world-agnostic pass that reads as "premium game" instead of flat vector
   *  art without needing bespoke work in each world's drawing code. */
  private drawVignette() {
    const { ctx, width, height } = this;
    ctx.save();
    const vg = ctx.createRadialGradient(
      width / 2, height * 0.42, height * 0.2,
      width / 2, height * 0.5, height * 0.9
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.75, "rgba(0,0,0,0.05)");
    vg.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Rich, hand-tuned multi-stop sky gradients per world — replaces the flat
   *  2-color bgTop/bgBottom wash with a believable lit sky. Falls back to
   *  the WorldConfig's 2-stop colors for any id not listed here. */
  private skyStops(world: WorldConfig): [number, string][] {
    switch (world.id) {
      case "forest": return [[0, "#7dd3fc"], [0.35, "#38bdf8"], [0.7, "#5fd48a"], [1, "#14532d"]];
      case "snow": return [[0, "#f0f9ff"], [0.4, "#dff3ff"], [0.72, "#7dd3fc"], [1, "#0284c7"]];
      case "volcano": return [[0, "#1e1b4b"], [0.38, "#3b0f0f"], [0.72, "#7f1d1d"], [1, "#3f0d0d"]];
      case "ocean": return [[0, "#0ea5e9"], [0.4, "#0284c7"], [0.75, "#075985"], [1, "#082f49"]];
      case "space": return [[0, "#1e1b4b"], [0.5, "#0f172a"], [1, "#000000"]];
      case "dark": return [[0, "#2a2a30"], [0.5, "#18181b"], [1, "#000000"]];
      case "cyber": return [[0, "#4c1d95"], [0.45, "#2e1065"], [0.8, "#1a0a30"], [1, "#09090b"]];
      case "sky": return [[0, "#141210"], [0.35, "#2b2118"], [0.65, "#4a331f"], [0.85, "#7a5228"], [1, "#a97634"]];
      case "desert": return [[0, "#fed7aa"], [0.4, "#fdba74"], [0.75, "#f59e0b"], [1, "#b45309"]];
      case "sakura": return [[0, "#2e2a55"], [0.35, "#453a63"], [0.7, "#7c5b73"], [1, "#3d2a3a"]];
      default: return [[0, world.bgTop], [1, world.bgBottom]];
    }
  }

  private drawSky(world: WorldConfig, height: number) {
    const { ctx, width } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    for (const [offset, color] of this.skyStops(world)) grad.addColorStop(offset, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // ──────────────────────────────────────────────────────
  //  BACKGROUND SYSTEM
  // ──────────────────────────────────────────────────────

  private drawBackground(state: FlippyState) {
    const { ctx, width, height } = this;

    // Smooth transition: draw previous world, then overlay current. Skipped
    // in Performance mode — it doubles full background rendering cost (sky
    // gradient + every per-world layer, drawn twice) for the whole ~0.5s
    // transition window, which is exactly the kind of hitch on world
    // changes Performance mode exists to avoid. Quality mode keeps the
    // smooth blend since that's the whole point of picking it.
    if (state.previousWorld && state.transitionProgress < 1.0 && this.dprCap > 1) {
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
    const { height } = this;
    const gY = state.groundY;

    // === SKY GRADIENT ===
    this.drawSky(world, height);

    // Dispatch to world-specific drawing
    switch (world.id) {
      case "forest": this.drawForestWorld(state, gY); break;
      case "snow":   this.drawSnowWorld(state, gY); break;
      case "volcano":this.drawVolcanoWorld(state, gY); break;
      case "ocean":  this.drawOceanWorld(state, gY); break;
      case "space":  this.drawSpaceWorld(state, gY); break;
      case "dark":   this.drawDarkWorld(state, gY); break;
      case "cyber":  this.drawCyberWorld(state, gY); break;
      case "sky":    this.drawClockworkWorld(state, gY); break;
      case "desert": this.drawDesertWorld(state, gY); break;
      case "sakura": this.drawSakuraWorld(state, gY); break;
    }
  }

  // ─── WORLD 1: FOREST — a real forest again: sunlit hills, a varied
  //     living treeline, and drifting birds, now that the obstacle is back
  //     to a wood trunk (a city skyline behind a tree didn't fit) ───
  private drawForestWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Sun glow
    ctx.save();
    const sunGrad = ctx.createRadialGradient(width * 0.8, 60, 10, width * 0.8, 60, 170);
    sunGrad.addColorStop(0, "rgba(255, 244, 190, 0.7)");
    sunGrad.addColorStop(0.5, "rgba(253, 224, 71, 0.18)");
    sunGrad.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();

    // Soft distant clouds
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const cloudOff = this.getScrollOffset(0.1);
    for (let i = -1; i < 3; i++) {
      const ox = cloudOff + i * width;
      for (let cx = 0; cx < width; cx += 180) {
        const cy = gY * 0.16 + Math.sin(cx * 0.02) * 10;
        ctx.beginPath();
        ctx.arc(ox + cx, cy, 16, 0, Math.PI * 2);
        ctx.arc(ox + cx + 16, cy - 5, 13, 0, Math.PI * 2);
        ctx.arc(ox + cx + 30, cy, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Distant birds gliding across the sky
    ctx.save();
    ctx.strokeStyle = "rgba(20, 60, 40, 0.4)";
    ctx.lineWidth = 1.6;
    for (let b = 0; b < 4; b++) {
      const bx = ((t * 0.5 + b * 160) % (width + 100)) - 50;
      const by = gY * 0.14 + b * 22 + Math.sin(t * 0.02 + b) * 6;
      const wingUp = Math.sin(t * 0.14 + b * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 6, by + wingUp);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 6, by + wingUp);
      ctx.stroke();
    }
    ctx.restore();

    // FAR: Rolling hills — volumetric gradient (sunlit ridge → shaded base)
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      const speed = 0.15 * (1 + layer * 0.5);
      const top = layer === 0 ? "#86efac" : "#4ade80";
      const bottom = layer === 0 ? "#22c55e" : "#15803d";
      const hillGrad = ctx.createLinearGradient(0, gY - 160, 0, gY);
      hillGrad.addColorStop(0, top);
      hillGrad.addColorStop(1, bottom);
      ctx.fillStyle = hillGrad;
      ctx.globalAlpha = 0.75 + layer * 0.15;
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
      ctx.strokeStyle = "rgba(255, 250, 210, 0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // MID: Trees — each canopy built from 3-4 irregular overlapping lobes
    // of varying size instead of two uniform circles, so the treeline
    // stops reading as a stamped repeat. Positioned on a single continuous
    // grid (own natural period = spacing) rather than duplicated width-size
    // tiles — the canvas width is never an exact multiple of the tree
    // spacing, so tiling by width left a misaligned seam every screen
    // where two trees could land almost on top of each other.
    ctx.save();
    {
      const treeSpeed = 0.4;
      const spacing = 140;
      const raw = this.scrollX * treeSpeed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const slot = baseSlot + n;
        const treeX = off + n * spacing + spacing * 0.5;
        const seed = this.seedOf(`tree-${slot}`);
        const treeH = 70 + seed * 45;
        const sway = Math.sin(t * 0.02 + seed * 8) * 3;
        const scale = 0.85 + seed * 0.4;

        ctx.fillStyle = "#5c2e0d";
        ctx.fillRect(treeX - 7 * scale, gY - treeH, 14 * scale, treeH);
        ctx.fillStyle = "#8a4a17";
        ctx.fillRect(treeX - 7 * scale, gY - treeH, 5 * scale, treeH);

        const lobes: [number, number, number][] = [
          [-14 * scale, 8, 20 * scale], [10 * scale, 2, 18 * scale],
          [-2 * scale, -14, 22 * scale], [16 * scale, -8, 15 * scale],
        ];
        for (const [lx, ly, lr] of lobes) {
          const cx0 = treeX + lx + sway * 0.5, cy0 = gY - treeH + ly;
          const canopyGrad = ctx.createRadialGradient(cx0 - lr * 0.3, cy0 - lr * 0.3, 2, cx0, cy0, lr);
          canopyGrad.addColorStop(0, "#6ee89a");
          canopyGrad.addColorStop(0.6, "#22c55e");
          canopyGrad.addColorStop(1, "#0f5132");
          ctx.fillStyle = canopyGrad;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(cx0, cy0, lr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Bushes at the base — rebuilt after feedback: the single perfect
    // semicircle repeated every 100px read as a flat, static stamp. Each
    // bush is now a cluster of 3 uneven lobes (varied per-bush via seed)
    // and gently sways in a breeze instead of sitting frozen. Same single-
    // continuous-grid positioning as the trees above, for the same reason.
    ctx.save();
    {
      const bushSpeed = 0.7;
      const spacing = 92;
      const raw = this.scrollX * bushSpeed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const slot = baseSlot + n;
        const cx0 = off + n * spacing + spacing * 0.5;
        const seed = this.seedOf(`bush-${slot}`);
        const sway = Math.sin(t * 0.02 + seed * 10) * 2.5;
        const scale = 0.8 + seed * 0.5;

        const bushGrad = ctx.createRadialGradient(cx0 - 6, gY - 14 * scale, 2, cx0, gY - 6, 22 * scale);
        bushGrad.addColorStop(0, "#6ee89a");
        bushGrad.addColorStop(0.55, "#3fae5e");
        bushGrad.addColorStop(1, "#14532d");
        ctx.fillStyle = bushGrad;

        // Three uneven lobes instead of one uniform dome
        for (const [lx, ly, lr] of [
          [-13 * scale, -3 * scale, 13 * scale],
          [3 * scale, -8 * scale, 15 * scale],
          [16 * scale, -2 * scale, 11 * scale],
        ] as const) {
          ctx.beginPath();
          ctx.arc(cx0 + lx + sway, gY - 4 + ly, lr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Ground mist hugging the floor for atmospheric depth
    ctx.save();
    const mistGrad = ctx.createLinearGradient(0, gY - 40, 0, gY);
    mistGrad.addColorStop(0, "rgba(240, 253, 244, 0)");
    mistGrad.addColorStop(1, "rgba(240, 253, 244, 0.18)");
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, gY - 40, width, 40);
    ctx.restore();
  }

  // ─── WORLD 2: SNOW — frozen peaks, aurora sky, drifting haze ───
  private drawSnowWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Aurora — the signature flourish for this world: soft ribbons of
    // color drifting near the top of the sky, unique to the arctic theme.
    ctx.save();
    ctx.globalAlpha = 0.28;
    const auroraColors = ["#5eead4", "#a78bfa", "#7dd3fc"];
    for (let a = 0; a < 3; a++) {
      ctx.strokeStyle = auroraColors[a];
      ctx.lineWidth = 14 - a * 3;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 20) {
        const y = gY * 0.12 + a * 16 + Math.sin(x * 0.02 + t * 0.015 + a * 2) * 22;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // FAR: Snow mountains — gradient rock face + snow cap
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      const rockGrad = ctx.createLinearGradient(0, gY - 180, 0, gY);
      rockGrad.addColorStop(0, layer === 0 ? "#e2e8f0" : "#f1f5f9");
      rockGrad.addColorStop(1, layer === 0 ? "#94a3b8" : "#cbd5e1");
      ctx.fillStyle = rockGrad;
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
      // Snow caps with a cool blue-white gradient for icy volume
      const capGrad = ctx.createLinearGradient(0, gY - 180, 0, gY - 130);
      capGrad.addColorStop(0, "#ffffff");
      capGrad.addColorStop(1, "#dbeafe");
      ctx.fillStyle = capGrad;
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

    // MID: Pine trees — gradient needles + snow highlight
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let tx = 0; tx < width; tx += 100) {
        const treeH = 60 + Math.sin(tx * 3.7) * 20;
        const treeX = ox + tx + 50;
        // Trunk
        ctx.fillStyle = "#4a2410";
        ctx.fillRect(treeX - 4, gY - 20, 8, 20);
        // Pine layers
        for (let py = 0; py < 4; py++) {
          const layerW = 25 - py * 4;
          const pineGrad = ctx.createLinearGradient(treeX, gY - 20 - py * 14 - 18, treeX, gY - 20 - py * 14);
          pineGrad.addColorStop(0, "#166534");
          pineGrad.addColorStop(1, "#0b3b22");
          ctx.fillStyle = pineGrad;
          ctx.globalAlpha = 0.92;
          ctx.beginPath();
          ctx.moveTo(treeX - layerW, gY - 20 - py * 14);
          ctx.lineTo(treeX, gY - 20 - py * 14 - 18);
          ctx.lineTo(treeX + layerW, gY - 20 - py * 14);
          ctx.fill();
          // Snow on branches
          ctx.fillStyle = "#f8fafc";
          ctx.globalAlpha = 0.85;
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

    // Low drifting snow haze near the ground
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(t * 0.01) * 0.05;
    const hazeGrad = ctx.createLinearGradient(0, gY - 60, 0, gY);
    hazeGrad.addColorStop(0, "rgba(255,255,255,0)");
    hazeGrad.addColorStop(1, "rgba(226, 240, 255, 0.55)");
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, gY - 60, width, 60);
    ctx.restore();

    // Cold blue atmosphere
    ctx.save();
    ctx.fillStyle = "rgba(147, 197, 253, 0.1)";
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();
  }

  // ─── WORLD 3: VOLCANO — glowing lava river, ash-lit peaks ───
  private drawVolcanoWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // FAR: Volcano cones — heat-lit gradient rock instead of flat black
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      // Dark mountain, gradient from ash-grey top to near-black base with a
      // faint red undertone from the lava glow below
      const rockGrad = ctx.createLinearGradient(0, gY - 200, 0, gY);
      rockGrad.addColorStop(0, "#3f3a38");
      rockGrad.addColorStop(0.6, "#1c1917");
      rockGrad.addColorStop(1, "#2a0f0d");
      ctx.fillStyle = rockGrad;
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

    // MID: Smoke columns — gradient plumes instead of flat grey blobs
    ctx.save();
    ctx.globalAlpha = 0.32;
    const midOff = this.getScrollOffset(0.4);
    for (let s = 0; s < 3; s++) {
      const sx = (width * 0.25 * (s + 1)) + midOff * 0.5;
      for (let c = 0; c < 5; c++) {
        const yOff = Math.sin(t * 0.01 + s + c) * 10;
        const py = gY - 160 - c * 30 + yOff;
        const px = sx + Math.sin(t * 0.015 + c * 2) * 8;
        const r = 20 + c * 8;
        const smokeGrad = ctx.createRadialGradient(px, py, 2, px, py, r);
        smokeGrad.addColorStop(0, "#a8a29e");
        smokeGrad.addColorStop(1, "#57534e");
        ctx.fillStyle = smokeGrad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Glowing lava river — a wavy, pulsing band of molten rock along the
    // horizon, the signature feature that sells "volcano" beyond flat color
    ctx.save();
    const riverY = gY - 46;
    ctx.globalAlpha = 0.85;
    const riverGrad = ctx.createLinearGradient(0, riverY - 8, 0, riverY + 10);
    riverGrad.addColorStop(0, "#fde047");
    riverGrad.addColorStop(0.5, "#f97316");
    riverGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = riverGrad;
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 18 + Math.sin(t * 0.06) * 8;
    ctx.beginPath();
    ctx.moveTo(0, riverY + 12);
    for (let x = 0; x <= width; x += 24) {
      const wave = Math.sin((x + this.scrollX * 0.6) * 0.02 + t * 0.04) * 5;
      ctx.lineTo(x, riverY + wave);
    }
    ctx.lineTo(width, riverY + 14);
    for (let x = width; x >= 0; x -= 24) {
      const wave = Math.sin((x + this.scrollX * 0.6) * 0.02 + t * 0.04) * 5;
      ctx.lineTo(x, riverY + 10 + wave);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
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

  // ─── WORLD 4: OCEAN — sunlit depths, gradient coral, distant whale ───
  private drawOceanWorld(state: FlippyState, gY: number) {
    const { ctx, width, height } = this;
    const t = state.frames;

    // Water light rays (God rays piercing down from the surface)
    ctx.save();
    ctx.globalAlpha = 0.1;
    for (let r = 0; r < 5; r++) {
      const rx = (width * 0.15 * (r + 1) + t * 0.3) % (width + 100) - 50;
      const rayGrad = ctx.createLinearGradient(rx, 0, rx, gY);
      rayGrad.addColorStop(0, "rgba(224, 250, 255, 0.9)");
      rayGrad.addColorStop(1, "rgba(224, 250, 255, 0)");
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 30, 0);
      ctx.lineTo(rx + 80, gY);
      ctx.lineTo(rx - 20, gY);
      ctx.fill();
    }
    ctx.restore();

    // Distant whale silhouette drifting across the deep background
    ctx.save();
    ctx.globalAlpha = 0.18;
    const wx = ((t * 0.25 + 100) % (width + 300)) - 150;
    const wy = gY * 0.22;
    ctx.fillStyle = "#0c4a6e";
    ctx.beginPath();
    ctx.ellipse(wx, wy, 55, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(wx - 50, wy);
    ctx.quadraticCurveTo(wx - 75, wy - 18, wx - 85, wy - 4);
    ctx.quadraticCurveTo(wx - 70, wy + 2, wx - 50, wy + 6);
    ctx.fill();
    ctx.restore();

    // MID: Coral reefs — volumetric gradient heads instead of flat pink
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let cx = 0; cx < width; cx += 90) {
        const coralH = 30 + Math.sin(cx * 5.1) * 20;
        const coralGrad = ctx.createLinearGradient(0, gY - coralH - 20, 0, gY);
        coralGrad.addColorStop(0, "#fda4af");
        coralGrad.addColorStop(1, "#9f1239");
        ctx.fillStyle = coralGrad;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(ox + cx + 45, gY);
        ctx.bezierCurveTo(ox + cx + 30, gY - coralH, ox + cx + 60, gY - coralH - 10, ox + cx + 45, gY - coralH - 20);
        ctx.bezierCurveTo(ox + cx + 50, gY - coralH, ox + cx + 70, gY - coralH + 10, ox + cx + 55, gY);
        ctx.fill();
        // Seaweed
        if (cx % 180 === 0) {
          const weedGrad = ctx.createLinearGradient(0, gY - 80, 0, gY);
          weedGrad.addColorStop(0, "#4ade80");
          weedGrad.addColorStop(1, "#166534");
          ctx.strokeStyle = weedGrad;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.6;
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

    // Fish silhouettes with a subtle gradient body for shimmer
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let f = 0; f < 3; f++) {
      const fx = ((t * (1 + f * 0.3) + f * 200) % (width + 100)) - 50;
      const fy = gY * 0.3 + f * gY * 0.2;
      const base = f === 0 ? "#38bdf8" : f === 1 ? "#fb923c" : "#a78bfa";
      const fishGrad = ctx.createRadialGradient(fx + 2, fy - 2, 1, fx, fy, 12);
      fishGrad.addColorStop(0, this.shade(base, 0.3));
      fishGrad.addColorStop(1, base);
      ctx.fillStyle = fishGrad;
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

  // ─── WORLD 5: SPACE — layered nebula, shooting stars, ringed planet ───
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

    // Occasional shooting star streak — the signature flourish for space
    ctx.save();
    const shootCycle = 220;
    const shootPhase = Math.floor(t) % shootCycle;
    if (shootPhase < 26) {
      const progress = shootPhase / 26;
      const sx = width * (0.15 + progress * 0.7);
      const sy = gY * (0.1 + progress * 0.35);
      ctx.globalAlpha = 1 - progress;
      const trail = ctx.createLinearGradient(sx, sy, sx - 60, sy - 24);
      trail.addColorStop(0, "#ffffff");
      trail.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 60, sy - 24);
      ctx.stroke();
    }
    ctx.restore();

    // Nebula cloud — two overlapping color washes for a richer deep-space glow
    ctx.save();
    const nebX = (width * 0.6 + this.bgFarX) % width;
    const nebGrad = ctx.createRadialGradient(nebX, gY * 0.4, 20, nebX, gY * 0.4, 160);
    nebGrad.addColorStop(0, "rgba(168, 85, 247, 0.22)");
    nebGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.12)");
    nebGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebGrad;
    ctx.fillRect(0, 0, width, gY);

    const nebX2 = (width * 0.25 + this.bgFarX * 0.7) % width;
    const nebGrad2 = ctx.createRadialGradient(nebX2, gY * 0.6, 10, nebX2, gY * 0.6, 130);
    nebGrad2.addColorStop(0, "rgba(236, 72, 153, 0.14)");
    nebGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebGrad2;
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

    // Asteroids — cratered, not flat grey circles
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let a = 0; a < 4; a++) {
      const ax = ((a * 200 + this.bgNearX + 500) % width + width) % width;
      const ay = gY * 0.2 + a * gY * 0.15;
      const r = 6 + a * 3;
      const astGrad = ctx.createRadialGradient(ax - r * 0.3, ay - r * 0.3, 1, ax, ay, r);
      astGrad.addColorStop(0, "#78716c");
      astGrad.addColorStop(1, "#3f3b38");
      ctx.fillStyle = astGrad;
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(ax + r * 0.3, ay + r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // A derelict station hull — one large, clearly hand-composed set-piece
    // drifting in the mid-ground, so this world has an ownable landmark
    // instead of only the generic stars/nebula/planet kit
    ctx.save();
    const hullX = ((width * 0.32 + this.bgMidX) % (width + 260) + width + 260) % (width + 260) - 130;
    const hullY = gY * 0.62;
    ctx.globalAlpha = 0.5;
    const hullGrad = ctx.createLinearGradient(hullX - 90, hullY - 20, hullX + 90, hullY + 20);
    hullGrad.addColorStop(0, "#334155");
    hullGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(hullX - 95, hullY);
    ctx.lineTo(hullX - 60, hullY - 22);
    ctx.lineTo(hullX + 20, hullY - 26);
    ctx.lineTo(hullX + 70, hullY - 8);
    ctx.lineTo(hullX + 60, hullY + 16);
    ctx.lineTo(hullX - 30, hullY + 24);
    ctx.lineTo(hullX - 80, hullY + 14);
    ctx.closePath();
    ctx.fill();
    // Broken/jagged edge where the hull sheared off
    ctx.fillStyle = "#0a0f1a";
    ctx.beginPath();
    ctx.moveTo(hullX + 20, hullY - 26);
    ctx.lineTo(hullX + 36, hullY - 34);
    ctx.lineTo(hullX + 30, hullY - 14);
    ctx.lineTo(hullX + 48, hullY - 16);
    ctx.lineTo(hullX + 44, hullY + 2);
    ctx.lineTo(hullX + 70, hullY - 8);
    ctx.lineTo(hullX + 20, hullY - 26);
    ctx.fill();
    // A few dim, dead lights, pulsing smoothly rather than snapping on/off
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(hullX - 20, hullY - 4, 2, 0, Math.PI * 2);
    ctx.arc(hullX + 5, hullY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, Math.sin(t * 0.05)) * 0.9;
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(hullX - 20, hullY - 4, 2, 0, Math.PI * 2);
    ctx.arc(hullX + 5, hullY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A ruined skyline in one silhouette: a crumbled stub, a tall jagged
   *  tower, a slender spire, and a broken low wing — asymmetric and
   *  fractured rather than four clean rectangles. */
  private traceRuinedCastle(cx: number, base: number) {
    const ctx = this.ctx;
    const pt = (dx: number, dy: number): [number, number] => [cx + dx, base - dy];
    const pts: [number, number][] = [
      pt(-40, 0), pt(-40, 25),
      pt(-34, 38), pt(-28, 30), pt(-24, 42), pt(-18, 28),
      pt(-12, 28), pt(-12, 95),
      pt(-8, 84), pt(-4, 98), pt(0, 88), pt(4, 100),
      pt(8, 60),
      pt(14, 60), pt(14, 90),
      pt(18, 125), pt(22, 90),
      pt(28, 90), pt(28, 45),
      pt(34, 45), pt(34, 55), pt(38, 50), pt(38, 58), pt(42, 45),
      pt(42, 0),
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // ─── WORLD 6: DARK REALM — haunted highland, gnarled trees, a fractured
  //     ruin, and lightning with an actual bolt rather than a flat tint ───
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

    // Lightning: a real jagged bolt on the primary strike, then a dimmer
    // afterglow tint with no bolt — a specific event, not a screen filter.
    const flashCycle = 260;
    const strikeIndex = Math.floor(t / flashCycle);
    const flashPhase = Math.floor(t) % flashCycle;
    const isBoltFrame = flashPhase < 3;
    const isAfterglow = flashPhase > 8 && flashPhase < 10;
    const flashing = isBoltFrame || isAfterglow;
    if (isBoltFrame) {
      const boltSeed = this.seedOf(String(strikeIndex));
      const boltX = width * (0.2 + boltSeed * 0.6);
      ctx.save();
      ctx.strokeStyle = "rgba(240,240,255,0.9)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#c7d2fe";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      let bx = boltX, by = 0;
      ctx.moveTo(bx, by);
      while (by < gY * 0.55) {
        bx += (boltSeed * 40 - 20) + Math.sin(by * 0.08 + boltSeed * 10) * 18;
        by += 22;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (flashing) {
      ctx.save();
      ctx.globalAlpha = isBoltFrame ? 0.2 : 0.1;
      ctx.fillStyle = "#e4e4f7";
      ctx.fillRect(0, 0, width, gY);
      ctx.restore();
    }

    // FAR: Dark mountains — gradient with a cold rim-light from the moon
    ctx.save();
    const mtnGrad = ctx.createLinearGradient(0, gY - 160, 0, gY);
    mtnGrad.addColorStop(0, flashing ? "#3f3f4a" : "#242429");
    mtnGrad.addColorStop(1, "#0a0a0c");
    ctx.fillStyle = mtnGrad;
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

    // MID: Gnarled dead trees — bent trunks, forked broken tops, irregular
    // branch angles instead of a handful of straight lineTo sticks
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgMidX + i * width;
      for (let tx = 0; tx < width; tx += 150) {
        const base = ox + tx + 75;
        const seed = this.seedOf(`${i}-${tx}`);
        const bend = (seed - 0.5) * 24;
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.8;
        // Bent trunk — two segments, not one straight line
        ctx.beginPath();
        ctx.moveTo(base, gY);
        ctx.lineTo(base + bend * 0.4, gY - 35);
        ctx.lineTo(base + bend, gY - 68);
        ctx.stroke();
        // Forked broken top
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(base + bend, gY - 68);
        ctx.lineTo(base + bend - 10, gY - 84);
        ctx.moveTo(base + bend, gY - 68);
        ctx.lineTo(base + bend + 8, gY - 88);
        ctx.stroke();
        // Irregular side branches, angled off the bend
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(base + bend * 0.4, gY - 35);
        ctx.lineTo(base + bend * 0.4 - 22 - seed * 10, gY - 50 - seed * 15);
        ctx.moveTo(base + bend * 0.7, gY - 52);
        ctx.lineTo(base + bend * 0.7 + 18 + seed * 12, gY - 40 - seed * 10);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // The ruined castle — one fractured silhouette with flickering window
    // glow, instead of four clean rectangles
    ctx.save();
    const castleX = ((width * 0.52 + this.bgMidX) % width + width) % width;
    this.traceRuinedCastle(castleX, gY);
    const ruinGrad = ctx.createLinearGradient(castleX - 40, gY - 125, castleX + 42, gY);
    ruinGrad.addColorStop(0, flashing ? "#2a2a30" : "#151517");
    ruinGrad.addColorStop(1, "#050506");
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = ruinGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Flickering amber window lights
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.15) * 0.25;
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(castleX - 8, gY - 60, 4, 6);
    ctx.fillRect(castleX + 18, gY - 75, 4, 6);
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

    // FAR: Skyscrapers — irregular width/height and occasional rooftop
    // greebles instead of one repeating block spacing, so the skyline
    // stops reading as a barcode
    ctx.save();
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      let bx = 0;
      let bi = 0;
      while (bx < width) {
        const seed = this.seedOf(`${i}-${bi}`);
        const bw = 36 + Math.floor(seed * 34); // 36-70
        const bh = 60 + Math.abs(Math.sin(bx * 4.3)) * 120;
        const bldGrad = ctx.createLinearGradient(0, gY - bh, 0, gY);
        bldGrad.addColorStop(0, "#1e293b");
        bldGrad.addColorStop(1, "#020617");
        ctx.fillStyle = bldGrad;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(ox + bx, gY - bh, bw, bh);
        // Neon window stripes — smooth continuous glow instead of a hard
        // on/off swap, so lit windows don't visibly pop every couple seconds
        ctx.fillStyle = neonColors[(i + bx) % neonColors.length];
        ctx.globalAlpha = 0.1 + (Math.sin(t * 0.02 + bx * 0.1) * 0.5 + 0.5) * 0.5;
        ctx.fillRect(ox + bx + 10, gY - bh + 10, 8, bh - 20);
        if (bw > 50) {
          ctx.fillStyle = neonColors[(i + bx + 1) % neonColors.length];
          ctx.globalAlpha = 0.1 + (Math.sin(t * 0.03 + bx * 0.2) * 0.5 + 0.5) * 0.5;
          ctx.fillRect(ox + bx + 30, gY - bh + 10, 8, bh - 20);
        }
        // Horizontal bands
        ctx.fillStyle = "#0f172a";
        ctx.globalAlpha = 1;
        for (let wy = gY - bh + 30; wy < gY; wy += 30) {
          ctx.fillRect(ox + bx, wy, bw, 8);
        }
        // Rooftop greeble on roughly one in four buildings — antenna,
        // vent, or a blinking beacon, so rooflines stop reading as flat
        if (bi % 4 === 0) {
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ox + bx + bw * 0.5, gY - bh);
          ctx.lineTo(ox + bx + bw * 0.5, gY - bh - 14);
          ctx.stroke();
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(ox + bx + bw * 0.5, gY - bh - 14, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = Math.max(0, Math.sin(t * 0.1 + bi));
          ctx.fillStyle = "#f43f5e";
          ctx.beginPath();
          ctx.arc(ox + bx + bw * 0.5, gY - bh - 14, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (bi % 4 === 2) {
          ctx.fillStyle = "#334155";
          ctx.fillRect(ox + bx + bw * 0.2, gY - bh - 8, bw * 0.3, 8);
        }
        bx += bw + 6;
        bi++;
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

    // Cyber rain streaks — thin diagonal lines catching the neon light
    ctx.save();
    ctx.strokeStyle = "rgba(148, 200, 230, 0.22)";
    ctx.lineWidth = 1;
    for (let r = 0; r < 26; r++) {
      const rx = ((r * 47 + this.fgX * 1.4) % (width + 60)) - 30;
      const ry = ((r * 83 + t * 6) % (gY + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 16);
      ctx.stroke();
    }
    ctx.restore();

    // Faint horizontal scanlines for a cyberpunk-screen feel
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#22d3ee";
    for (let sy = 0; sy < gY; sy += 4) {
      ctx.fillRect(0, sy, width, 1);
    }
    ctx.restore();

    // Neon glow bottom
    ctx.save();
    const neonGlow = ctx.createLinearGradient(0, gY - 40, 0, gY);
    neonGlow.addColorStop(0, "rgba(34, 211, 238, 0)");
    neonGlow.addColorStop(1, "rgba(34, 211, 238, 0.18)");
    ctx.fillStyle = neonGlow;
    ctx.fillRect(0, gY - 40, width, 40);
    ctx.restore();

    // Wet-street reflection — faint vertical neon streaks bleeding up from
    // the ground line, the cheap high-impact addition the review called for
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let r = 0; r < 10; r++) {
      const rx = ((r * 97 + this.bgFarX * 0.3) % width + width) % width;
      ctx.fillStyle = neonColors[r % neonColors.length];
      ctx.fillRect(rx, gY - 28, 3, 28);
    }
    ctx.restore();
  }

  // ─── WORLD 8: CLOCKWORK WORLD — THE MECHANICAL CITY — flying through the
  //     inside of a gigantic living machine: clock towers, slow-turning
  //     gears, riveted gantries, pistons, and vented steam. Replaces Petra
  //     (formerly Sky Kingdom) on the same world slot. ───

  /** A clock tower: a tapered riveted shaft topped with a large round clock
   *  face (real moving hands, driven by `t`) and a small domed cap with a
   *  finial spike — the world's signature recurring landmark. */
  private drawClockTower(cx: number, base: number, scale: number, alpha: number, t: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    const s = scale;

    const shaftW = 46 * s, shaftH = 140 * s;
    const shaftGrad = ctx.createLinearGradient(cx - shaftW / 2, base - shaftH, cx + shaftW / 2, base);
    shaftGrad.addColorStop(0, "#4a3f2e");
    shaftGrad.addColorStop(0.5, "#2b241a");
    shaftGrad.addColorStop(1, "#171310");
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(cx - shaftW / 2, base - shaftH, shaftW, shaftH);
    // Riveted seams — one path for every line instead of a stroke() per
    // iteration. Each tower could rack up 4 clock towers x ~6 separate
    // stroke calls just for this; batching into one path + one stroke is
    // the same pixels for a fraction of the draw-call overhead, which is
    // what was making this world noticeably heavier to render than others.
    ctx.strokeStyle = "rgba(201,138,63,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ry = base - shaftH + 10; ry < base; ry += 22) {
      ctx.moveTo(cx - shaftW / 2, ry);
      ctx.lineTo(cx + shaftW / 2, ry);
    }
    ctx.stroke();

    // Clock face
    const faceY = base - shaftH - 4 * s;
    const faceR = 30 * s;
    const faceGrad = ctx.createRadialGradient(cx - faceR * 0.3, faceY - faceR * 0.3, 2, cx, faceY, faceR);
    faceGrad.addColorStop(0, "#e8dcc0");
    faceGrad.addColorStop(1, "#b8a878");
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(cx, faceY, faceR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a5a2a";
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    // Tick marks — batched into one path/stroke instead of 12 per tower
    ctx.strokeStyle = "#3d332a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * faceR * 0.8, faceY + Math.sin(a) * faceR * 0.8);
      ctx.lineTo(cx + Math.cos(a) * faceR * 0.92, faceY + Math.sin(a) * faceR * 0.92);
    }
    ctx.stroke();
    // Moving hands — slow, continuous, never binary
    const minuteA = t * 0.006, hourA = t * 0.0005;
    ctx.strokeStyle = "#241c12";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, faceY);
    ctx.lineTo(cx + Math.cos(minuteA) * faceR * 0.78, faceY + Math.sin(minuteA) * faceR * 0.78);
    ctx.stroke();
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(cx, faceY);
    ctx.lineTo(cx + Math.cos(hourA) * faceR * 0.5, faceY + Math.sin(hourA) * faceR * 0.5);
    ctx.stroke();
    ctx.fillStyle = "#c98a3f";
    ctx.beginPath();
    ctx.arc(cx, faceY, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Domed cap and finial
    ctx.fillStyle = "#2b241a";
    ctx.beginPath();
    ctx.moveTo(cx - faceR - 4 * s, faceY - faceR);
    ctx.quadraticCurveTo(cx, faceY - faceR - 26 * s, cx + faceR + 4 * s, faceY - faceR);
    ctx.fill();
    ctx.strokeStyle = "#c98a3f";
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(cx, faceY - faceR - 22 * s);
    ctx.lineTo(cx, faceY - faceR - 34 * s);
    ctx.stroke();
    ctx.fillStyle = "#c98a3f";
    ctx.beginPath();
    ctx.arc(cx, faceY - faceR - 34 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** One near-ground mechanical gantry — a riveted steel support tower with
   *  diagonal cross-bracing, an embedded rotating gear, a sliding piston,
   *  and a vent that periodically breathes steam. The braced-truss
   *  silhouette itself reads as an industrial structure, not bare rock or
   *  a smooth column. */
  private drawMachineGantry(baseX: number, gY: number, side: -1 | 1, seed: number, t: number) {
    const ctx = this.ctx;
    const w = 110;
    const towerH = 200 + seed * 90;
    const x = side === -1 ? baseX : baseX - w;

    const towerGrad = ctx.createLinearGradient(x, gY - towerH, x + w, gY);
    towerGrad.addColorStop(0, "#4a4038");
    towerGrad.addColorStop(0.5, "#2b2620");
    towerGrad.addColorStop(1, "#171310");
    ctx.fillStyle = towerGrad;
    ctx.fillRect(x, gY - towerH, w, towerH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, gY - towerH, w, towerH);
    ctx.clip();
    // Diagonal cross-bracing — the truss pattern that sells "gantry".
    // Batched into one path/stroke: with up to ~7 gantries on screen at
    // once, one stroke() per brace instead of one per row was a big share
    // of this world's per-frame draw-call count.
    ctx.strokeStyle = "rgba(201,138,63,0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let by = gY - towerH; by < gY; by += 70) {
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by + 70);
      ctx.moveTo(x + w, by);
      ctx.lineTo(x, by + 70);
    }
    ctx.stroke();
    // Rivets along the outer edges — batched the same way (was one fill()
    // per row, ~18 rows per gantry).
    ctx.fillStyle = "rgba(20,15,10,0.6)";
    ctx.beginPath();
    for (let ry = gY - towerH + 8; ry < gY; ry += 16) {
      ctx.moveTo(x + 5 + 1.6, ry);
      ctx.arc(x + 5, ry, 1.6, 0, Math.PI * 2);
      ctx.moveTo(x + w - 5 + 1.6, ry);
      ctx.arc(x + w - 5, ry, 1.6, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    // An embedded gear, slowly turning
    const gearY = gY - towerH * (0.3 + seed * 0.3);
    const gearR = 20;
    const gearGrad = ctx.createRadialGradient(x + w / 2 - 3, gearY - 3, 1, x + w / 2, gearY, gearR);
    gearGrad.addColorStop(0, "#e8c98a");
    gearGrad.addColorStop(1, "#8a5a2a");
    this.traceGear(x + w / 2, gearY, gearR, gearR * 0.7, 8, t * 0.006 + seed * 6);
    ctx.fillStyle = gearGrad;
    ctx.fill();
    ctx.fillStyle = "#2b2620";
    ctx.beginPath();
    ctx.arc(x + w / 2, gearY, gearR * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // A piston sliding within a housing lower on the tower
    const pistonY = gY - towerH * (0.62 + seed * 0.15);
    const extend = (Math.sin(t * 0.03 + seed * 10) * 0.5 + 0.5) * 16;
    ctx.fillStyle = "#171310";
    ctx.fillRect(x + w * 0.3, pistonY - 6, w * 0.4, 12);
    ctx.fillStyle = "#c9a35a";
    ctx.fillRect(x + w * 0.3, pistonY - 2.5, w * 0.4 + extend, 5);
    ctx.beginPath();
    ctx.arc(x + w * 0.3 + w * 0.4 + extend, pistonY, 3, 0, Math.PI * 2);
    ctx.fill();

    // A steam vent that breathes on its own slow cycle — smooth scale/alpha,
    // no hard on/off pop
    const ventCycle = 240;
    const ventPhase = (Math.floor(t) + seed * ventCycle) % ventCycle;
    if (ventPhase < 60) {
      const ventProgress = ventPhase / 60;
      const ventX = x + w * 0.75, ventY = gY - towerH * 0.15;
      ctx.globalAlpha = Math.sin(ventProgress * Math.PI) * 0.4;
      ctx.fillStyle = "#e8e2d8";
      ctx.beginPath();
      ctx.arc(ventX, ventY - ventProgress * 30, 6 + ventProgress * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawClockworkWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // Distant atmospheric haze + muted industrial skyline (single
    // continuous grid — see the forest-tree fix note above for why this
    // matters: tiling by canvas width instead left visible seams).
    ctx.save();
    ctx.globalAlpha = 0.45;
    {
      const speed = 0.12, spacing = 90;
      const raw = this.scrollX * speed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const slot = baseSlot + n;
        const bx = off + n * spacing;
        const seed = this.seedOf(`bldg-${slot}`);
        const bh = 50 + seed * 90;
        ctx.fillStyle = "#3a3128";
        ctx.fillRect(bx, gY - bh, spacing - 6, bh);
        if (seed > 0.6) {
          ctx.fillStyle = "#2b241c";
          ctx.fillRect(bx + spacing * 0.35, gY - bh - 22, spacing * 0.3, 22);
        }
      }
    }
    ctx.restore();

    // Two huge background gears, barely rotating, peeking from behind the
    // haze for scale. Positioned on the same kind of continuous grid as the
    // far skyline above — NOT getScrollOffset() + a custom spacing, which
    // wraps on canvas *width* while the spacing has its own period, so the
    // two periods drift apart and every gear jumps at once when they
    // desync. That mismatch was the actual cause of the reported "buildings
    // popping in and out."
    ctx.save();
    ctx.globalAlpha = 0.16;
    {
      const speed = 0.08, spacing = 480;
      const raw = this.scrollX * speed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const slot = baseSlot + n;
        const gx = off + n * spacing + spacing / 2;
        this.traceGear(gx, gY - 40, 130, 108, 14, t * 0.0015 + slot);
        ctx.fillStyle = "#c98a3f";
        ctx.fill();
      }
    }
    ctx.restore();

    // Warm boiler-glow low on the horizon — this world's light source
    ctx.save();
    const glow = ctx.createRadialGradient(width * 0.5, gY * 1.05, 10, width * 0.5, gY * 1.05, width * 0.6);
    glow.addColorStop(0, "rgba(255, 180, 90, 0.35)");
    glow.addColorStop(0.5, "rgba(255, 150, 70, 0.1)");
    glow.addColorStop(1, "rgba(255, 150, 70, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, gY);
    ctx.restore();

    // Far birds — small mechanical silhouettes drifting past
    ctx.save();
    ctx.strokeStyle = "rgba(40, 30, 20, 0.4)";
    ctx.lineWidth = 1.5;
    for (let b = 0; b < 3; b++) {
      const bx = ((t * 0.5 + b * 180) % (width + 100)) - 50;
      const by = gY * 0.12 + b * 20;
      const wingUp = Math.sin(t * 0.14 + b * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + wingUp);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by + wingUp);
      ctx.stroke();
    }
    ctx.restore();

    // MID: the Clock Tower, recurring as the world's signature landmark —
    // continuous grid (own period = spacing), same fix as the far skyline
    ctx.save();
    {
      const speed = 0.35, spacing = 420;
      const raw = this.scrollX * speed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const towerX = off + n * spacing + spacing / 2;
        this.drawClockTower(towerX, gY - 2, 0.85, 0.85, t);
      }
    }
    ctx.restore();

    // MID: a riveted mechanical bridge truss spanning between towers
    ctx.save();
    ctx.globalAlpha = 0.5;
    const bridgeSpacing = 50;
    const bridgeRaw = this.scrollX * 0.3;
    const bridgeOffLocal = -(bridgeRaw - Math.floor(bridgeRaw / bridgeSpacing) * bridgeSpacing);
    const bridgeY = gY * 0.55;
    ctx.strokeStyle = "#3d332a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, bridgeY);
    ctx.lineTo(width, bridgeY);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(201,138,63,0.4)";
    // Batched into one path/stroke instead of one stroke() per brace
    // (up to ~20 on a wide canvas).
    ctx.beginPath();
    for (let bx = bridgeOffLocal - bridgeSpacing; bx < width; bx += bridgeSpacing) {
      ctx.moveTo(bx, bridgeY - 16);
      ctx.lineTo(bx + 25, bridgeY);
      ctx.lineTo(bx, bridgeY + 16);
    }
    ctx.stroke();
    ctx.restore();

    // NEAR: massive riveted gantries framing the passage — fastest layer,
    // sells the feeling of flying through the inside of a machine. This is
    // the layer most likely to have been read as "buildings popping in and
    // out" — it's the largest, closest structure, and getScrollOffset()
    // wraps on canvas width while the 260 spacing doesn't share that
    // period, so the whole row used to jump in sync whenever the two
    // periods drifted apart. Continuous grid fixes it the same way as the
    // trees/bushes/far-skyline above.
    ctx.save();
    {
      const speed = 0.85, spacing = 260;
      const raw = this.scrollX * speed;
      const baseSlot = Math.floor(raw / spacing);
      const off = -(raw - baseSlot * spacing);
      const count = Math.ceil(width / spacing) + 2;
      for (let n = -1; n <= count; n++) {
        const slot = baseSlot + n;
        const ox = off + n * spacing;
        const seed = this.seedOf(`gantry-${slot}`);
        this.drawMachineGantry(ox, gY, seed > 0.5 ? 1 : -1, seed, t);
      }
    }
    ctx.restore();

    // Warm haze near the ground, and a faint drifting smoke layer
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#e8a259";
    const hazeY = gY - 20 + Math.sin(t * 0.05) * 5;
    ctx.fillRect(0, hazeY, width, 20);
    ctx.restore();

    // Golden rim light — the single light source every structure above
    // respects
    ctx.save();
    const rimGlow = ctx.createRadialGradient(width * 0.5, gY * 0.4, 20, width * 0.5, gY * 0.4, width * 0.8);
    rimGlow.addColorStop(0, "rgba(255, 190, 110, 0.14)");
    rimGlow.addColorStop(1, "rgba(255, 190, 110, 0)");
    ctx.fillStyle = rimGlow;
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

    // FAR: Sand dunes — sculpted with a sunlit-ridge gradient
    ctx.save();
    for (let layer = 0; layer < 2; layer++) {
      const duneGrad = ctx.createLinearGradient(0, gY - 110, 0, gY);
      duneGrad.addColorStop(0, layer === 0 ? "#fbbf24" : "#fcd34d");
      duneGrad.addColorStop(1, layer === 0 ? "#b45309" : "#d97706");
      ctx.fillStyle = duneGrad;
      ctx.globalAlpha = 0.7 + layer * 0.15;
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
      // Ancient ruins / Pyramids — drawn in every parallax tile now (was
      // gated to a single tile, so it scrolled off-screen and then had to
      // wait a full cycle before snapping back into view — the "pyramids
      // disappear then suddenly pop up" bug).
      {
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

    // Low sandstorm haze drifting along the ground
    ctx.save();
    ctx.globalAlpha = 0.16 + Math.sin(t * 0.02) * 0.04;
    const sandHaze = ctx.createLinearGradient(0, gY - 50, 0, gY);
    sandHaze.addColorStop(0, "rgba(217, 119, 6, 0)");
    sandHaze.addColorStop(1, "rgba(217, 119, 6, 0.5)");
    ctx.fillStyle = sandHaze;
    ctx.fillRect(0, gY - 50, width, 50);
    ctx.restore();
  }

  // ─── WORLD 10: SAKURA — restrained indigo dusk garden; pink is the
  //     accent, not the base. The old full-frame pink overlay is gone. ───
  private drawSakuraWorld(state: FlippyState, gY: number) {
    const { ctx, width } = this;
    const t = state.frames;

    // A low, warm moon — the world's one light source, everything below
    // takes its rim-light from this
    ctx.save();
    const moonX = width * 0.78, moonY = gY * 0.16;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 90);
    moonGlow.addColorStop(0, "rgba(255, 237, 213, 0.35)");
    moonGlow.addColorStop(1, "rgba(255, 237, 213, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, width, gY);
    ctx.fillStyle = "#fff7ed";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Distant torii gate silhouette
    ctx.save();
    ctx.globalAlpha = 0.28;
    const toriiX = ((width * 0.72 + this.bgFarX * 0.6) % (width + 200) + width) % (width + 200) - 100;
    ctx.fillStyle = "#2b1620";
    ctx.fillRect(toriiX + 8, gY - 90, 6, 90);
    ctx.fillRect(toriiX + 46, gY - 90, 6, 90);
    ctx.fillRect(toriiX, gY - 92, 60, 8);
    ctx.fillRect(toriiX + 6, gY - 78, 48, 5);
    ctx.restore();

    // FAR: Mountains — cool blue-grey (real distant peaks desaturate
    // toward blue regardless of foreground season), not pink-on-pink
    ctx.save();
    const mtnGrad = ctx.createLinearGradient(0, gY - 170, 0, gY);
    mtnGrad.addColorStop(0, "#6b7394");
    mtnGrad.addColorStop(1, "#33324a");
    ctx.fillStyle = mtnGrad;
    ctx.globalAlpha = 0.55;
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
    // Faint warm rim catching the moonlight along the ridge
    ctx.strokeStyle = "rgba(255, 219, 172, 0.2)";
    ctx.lineWidth = 2;
    for (let i = -1; i < 3; i++) {
      const ox = this.bgFarX + i * width;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 40) {
        const h = Math.sin(x * 0.007) * 70 + 100;
        if (x === 0) ctx.moveTo(ox + x, gY - h); else ctx.lineTo(ox + x, gY - h);
      }
      ctx.stroke();
    }
    ctx.restore();

    // MID: Sakura trees — warm neutral wood, clustered irregular blossom
    // canopies with a shaded underside and lit top instead of uniform
    // repeated circles, so pink reads as volume, not a decal pattern
    ctx.save();
    const midOff = this.getScrollOffset(0.4);
    for (let i = 0; i < 2; i++) {
      const ox = midOff + i * width;
      for (let tx = 0; tx < width; tx += 130) {
        const treeX = ox + tx + 65;
        ctx.fillStyle = "#3d2b1f";
        ctx.globalAlpha = 0.92;
        ctx.fillRect(treeX - 5, gY - 50, 10, 50);
        ctx.strokeStyle = "#3d2b1f";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(treeX, gY - 40);
        ctx.bezierCurveTo(treeX - 30, gY - 60, treeX - 40, gY - 70, treeX - 35, gY - 80);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(treeX, gY - 35);
        ctx.bezierCurveTo(treeX + 25, gY - 55, treeX + 35, gY - 65, treeX + 30, gY - 75);
        ctx.stroke();

        // Clustered canopy masses (2-3 overlapping blobs each) instead of
        // five identical dots — each cluster gets a shaded underside and a
        // lit top so it reads as a flowering mass with real volume
        const clusters: [number, number, number][] = [
          [treeX - 35, gY - 80, 17], [treeX + 30, gY - 75, 16],
          [treeX - 15, gY - 62, 14],
        ];
        for (const [cx0, cy0, r] of clusters) {
          ctx.fillStyle = "#7a2e46";
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(cx0 + 2, cy0 + 3, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
          const blossomGrad = ctx.createRadialGradient(cx0 - r * 0.3, cy0 - r * 0.3, 1, cx0, cy0, r);
          blossomGrad.addColorStop(0, "#ffe4f2");
          blossomGrad.addColorStop(0.55, "#f9a8d4");
          blossomGrad.addColorStop(1, "#db5d92");
          ctx.fillStyle = blossomGrad;
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.arc(cx0, cy0, r, 0, Math.PI * 2);
          ctx.arc(cx0 + r * 0.7, cy0 - r * 0.15, r * 0.6, 0, Math.PI * 2);
          ctx.arc(cx0 - r * 0.5, cy0 + r * 0.25, r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Floating paper lanterns — visible ribs and a warm core vs. soft
    // paper-diffuse edge, so they read as lanterns rather than glowing bars
    ctx.save();
    for (let l = 0; l < 4; l++) {
      const lx = ((l * 210 + t * 0.4) % (width + 100)) - 50;
      const ly = gY - ((t * 0.6 + l * 140) % (gY * 0.8)) - 20;
      const bob = Math.sin(t * 0.03 + l) * 4;
      const ry = ly + bob;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(lx, ry, 15, 0, Math.PI * 2);
      ctx.fill();
      const paperGrad = ctx.createRadialGradient(lx, ry, 1, lx, ry, 9);
      paperGrad.addColorStop(0, "#fff4d6");
      paperGrad.addColorStop(1, "#f97316");
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = paperGrad;
      ctx.beginPath();
      ctx.roundRect(lx - 6, ry - 9, 12, 18, 5);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,53,15,0.4)";
      ctx.lineWidth = 0.8;
      for (const ribY of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(lx - 6, ry + ribY);
        ctx.lineTo(lx + 6, ry + ribY);
        ctx.stroke();
      }
      ctx.fillStyle = "#78350f";
      ctx.fillRect(lx - 1, ry - 12, 2, 3);
      ctx.fillRect(lx - 1, ry + 9, 2, 3);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Traditional bridge silhouette
    ctx.save();
    const nearOff = this.getScrollOffset(0.7);
    const bridgeX = ((width * 0.4 + nearOff * 0.5) % (width + 300) + width) % (width + 300) - 150;
    ctx.fillStyle = "#2b1620";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(bridgeX, gY);
    ctx.bezierCurveTo(bridgeX + 30, gY - 25, bridgeX + 70, gY - 25, bridgeX + 100, gY);
    ctx.fill();
    ctx.fillRect(bridgeX + 10, gY - 30, 3, 15);
    ctx.fillRect(bridgeX + 45, gY - 32, 3, 15);
    ctx.fillRect(bridgeX + 85, gY - 30, 3, 15);
    ctx.restore();
  }

  // ──────────────────────────────────────────────────────
  //  FLOOR
  // ──────────────────────────────────────────────────────

  /** Forest gets its own ground: a bright grass band over solid tan dirt
   *  with sparse texture flecks — the classic-game look the player asked
   *  for, instead of the shared vertical-stripe pattern every other world
   *  uses (which read as too mechanical/blocky for this world). */
  private drawForestFloor(state: FlippyState) {
    const { ctx, width, height } = this;
    const gY = state.groundY;

    const dirtGrad = ctx.createLinearGradient(0, gY, 0, height);
    dirtGrad.addColorStop(0, "#e4cf8e");
    dirtGrad.addColorStop(1, "#c9a35a");
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, gY, width, height - gY);

    // Sparse dirt texture flecks — small and scattered, not uniform stripes
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#a9834a";
    for (let i = -40; i < width + 40; i += 22) {
      const fx = i + this.fgX;
      const fy = gY + 10 + ((i * 37) % (height - gY - 14));
      ctx.fillRect(fx, fy, 2, 5);
    }
    ctx.restore();

    // Grass band on top
    const grassH = 16;
    const grassGrad = ctx.createLinearGradient(0, gY, 0, gY + grassH);
    grassGrad.addColorStop(0, "#8fe06a");
    grassGrad.addColorStop(1, "#5fb745");
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, gY, width, grassH);
    // Small grass blade ticks along the bottom edge of the band
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#4c9938";
    for (let i = -40; i < width + 40; i += 14) {
      const fx = i + this.fgX * 1.2;
      ctx.fillRect(fx, gY + grassH - 4, 2, 6);
    }
    ctx.restore();
  }

  private drawFloor(state: FlippyState) {
    const { ctx, width, height } = this;
    const world = state.currentWorld;

    if (world.id === "forest") {
      this.drawForestFloor(state);
      return;
    }

    let floorColor = "#1e293b";
    let stripeColor = "#334155";
    let topColor = "";

    switch (world.id) {
      case "snow":    floorColor = "#e2e8f0"; stripeColor = "#f1f5f9"; topColor = "#ffffff"; break;
      case "volcano": floorColor = "#1c1917"; stripeColor = "#292524"; topColor = "#7f1d1d"; break;
      case "ocean":   floorColor = "#164e63"; stripeColor = "#0e7490"; topColor = "#67e8f9"; break;
      case "space":   floorColor = "#020617"; stripeColor = "#0f172a"; topColor = "#334155"; break;
      case "dark":    floorColor = "#09090b"; stripeColor = "#18181b"; topColor = "#27272a"; break;
      case "cyber":   floorColor = "#020617"; stripeColor = "#0f172a"; topColor = "#22d3ee"; break;
      case "sky":     floorColor = "#2b2622"; stripeColor = "#3d3630"; topColor = "#c98a3f"; break;
      case "desert":  floorColor = "#92400e"; stripeColor = "#b45309"; topColor = "#d97706"; break;
      case "sakura":  floorColor = "#332a3d"; stripeColor = "#463a52"; topColor = "#f472b6"; break;
    }

    // Gradient floor body — lit near the top edge, deepening with distance
    // from the player instead of one flat slab of color.
    const floorGrad = ctx.createLinearGradient(0, state.groundY, 0, height);
    floorGrad.addColorStop(0, this.shade(floorColor, 0.14));
    floorGrad.addColorStop(1, this.shade(floorColor, -0.2));
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, state.groundY, width, height - state.groundY);

    // Scrolling stripes
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = stripeColor;
    for (let i = -60; i < width + 60; i += 60) {
      ctx.fillRect(i + this.fgX, state.groundY + 4, 30, height - state.groundY);
    }
    ctx.restore();

    // Top edge highlight — bright rim + soft glow catching the light source
    if (topColor) {
      ctx.save();
      const rimGlow = ctx.createLinearGradient(0, state.groundY - 8, 0, state.groundY + 6);
      rimGlow.addColorStop(0, "rgba(0,0,0,0)");
      rimGlow.addColorStop(1, topColor);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = rimGlow;
      ctx.fillRect(0, state.groundY - 8, width, 14);
      ctx.globalAlpha = 1;
      ctx.fillStyle = topColor;
      ctx.fillRect(0, state.groundY, width, 4);
      ctx.restore();
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

    // Forest dropped the falling-leaves particle entirely per feedback — the
    // classic-game look this world is going for doesn't have any particles.
    if (world.id !== "forest" && state.status === "playing" && Math.random() < spawnRate) {
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
        case "dust":
          vy = (Math.random() - 0.5) * 0.25;
          vx = -Math.random() * 0.6 - 0.2;
          x = Math.random() * width;
          y = Math.random() * gY;
          size = Math.random() * 2.5 + 1;
          break;
        case "steam":
          vy = -Math.random() * 0.8 - 0.4;
          vx = -Math.random() * 0.4 - state.speed * 0.3;
          x = Math.random() * width;
          y = gY - Math.random() * 40;
          size = Math.random() * 3 + 2;
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

        case "dust":
          // Soft, low-contrast motes drifting through the canyon air —
          // deliberately faint so they read as atmosphere, not confetti
          ctx.globalAlpha *= 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "steam":
          // A soft puff that widens as it rises and disperses, like real
          // vented steam — grows with age instead of a fixed-size dot
          ctx.globalAlpha *= 0.3;
          ctx.fillStyle = "#e8e2d8";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + (1 - p.life / p.maxLife) * 2.2), 0, Math.PI * 2);
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
      const seed = this.seedOf(p.id);

      ctx.save();

      if (world.obstacleStyle === "neon") {
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 8;
      }

      const drawSeg = (yStart: number, pHeight: number, isTop: boolean) => {
        if (pHeight <= 0) return;
        // Portal pipes render in the CURRENT world's style, not the next
        // world's — otherwise the pipe telegraphs the upcoming world before
        // the bird passes through it, ruining the surprise swap.
        const style = world.obstacleStyle;
        const w = p.width;

        switch (style) {
          case "wood":
            this.drawWoodPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "ice":
            this.drawIcePipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "lava":
            this.drawLavaPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "coral":
            this.drawCoralPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "space":
            this.drawSpacePipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "dark":
            this.drawDarkPipe(p.x, yStart, w, pHeight, isTop, seed);
            break;
          case "neon":
            this.drawNeonPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "cloud":
            this.drawCloudPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
            break;
          case "sandstone":
            this.drawSandstonePipe(p.x, yStart, w, pHeight, isTop, seed);
            break;
          case "sakura":
            this.drawSakuraPipe(p.x, yStart, w, pHeight, isTop, seed);
            break;
          case "clockwork":
            this.drawClockworkPipe(p.x, yStart, w, pHeight, isTop, state.frames, seed);
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

  // ─── Silhouette construction helpers ───
  // These exist because the review's #1 finding was that every obstacle was
  // a straight rectangular column with a re-textured surface — same
  // silhouette everywhere. The helpers below build an actual irregular
  // outline (organic taper/wobble for natural materials, stepped greebles
  // for built/tech materials) so each world's obstacle reads as a different
  // *shape*, not just a different color. The nominal hitbox (p.x..p.x+w) is
  // never touched — only how far the visual silhouette bulges past it, the
  // same "cap overdraws the hitbox" pattern the original pipe caps already
  // used, so collision fairness stays essentially the same as before.

  /** Deterministic 0..1 value from a pipe's id, so an organic silhouette
   *  stays fixed for that pipe's lifetime instead of re-rolling every frame. */
  private seedOf(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000;
  }

  /** Traces an organic, tapered, wobble-edged column path (does not fill/stroke —
   *  caller sets fillStyle and calls ctx.fill()). Wide at the "anchored" end
   *  (away from the gap — the ground for a bottom pipe, the unseen ceiling
   *  canopy for a top pipe), narrower toward the gap, with noisy left/right
   *  edges. Low `samples` + high `wobble` reads as jagged/faceted (ice, rock,
   *  obsidian); high `samples` + low `wobble` reads as a smooth organic taper
   *  (wood, coral). Returns the sampled edge points so callers can anchor
   *  decorations (knots, icicles, chips) to the actual silhouette edge. */
  private traceOrganicColumn(
    x: number, y: number, w: number, h: number, isTop: boolean, seed: number,
    opts: { taper?: number; flare?: number; wobble?: number; freq?: number; samples?: number } = {}
  ): { left: [number, number][]; right: [number, number][]; cx: number } {
    const { taper = 0.35, flare = 0.18, wobble = 4, freq = 2.2, samples = 9 } = opts;
    const ctx = this.ctx;
    const cx = x + w / 2;
    const left: [number, number][] = [];
    const right: [number, number][] = [];

    for (let i = 0; i <= samples; i++) {
      const f = i / samples; // 0 at y, 1 at y+h
      const ty = y + f * h;
      const distFromAnchor = isTop ? f : 1 - f; // 0 at anchored end, 1 at gap end
      const halfW = (w / 2) * (1 + flare * (1 - distFromAnchor) - taper * distFromAnchor);
      const wobL = Math.sin(f * freq * Math.PI * 2 + seed * 12) * wobble;
      const wobR = Math.sin(f * freq * Math.PI * 2 + seed * 12 + 1.7) * wobble;
      left.push([cx - halfW + wobL, ty]);
      right.push([cx + halfW + wobR, ty]);
    }

    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();

    return { left, right, cx };
  }

  /** Traces a stepped/greebled rectilinear column — for built or tech
   *  materials (space, cyber) that should read as engineered, not organic.
   *  Alternates between the nominal width and a slightly recessed width in
   *  bands, giving a panelled/notched edge instead of one clean rectangle. */
  private traceGreebledColumn(
    x: number, y: number, w: number, h: number, isTop: boolean, seed: number,
    opts: { inset?: number; bandCount?: number } = {}
  ): void {
    const { inset = 5, bandCount = 5 } = opts;
    const ctx = this.ctx;
    const bandH = h / bandCount;
    const insetBand = (i: number) => (Math.floor(seed * 7 + i * 2.3) % 3 === 0);

    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < bandCount; i++) {
      const by0 = y + i * bandH;
      const by1 = y + (i + 1) * bandH;
      const rx = insetBand(i) ? x + inset : x;
      ctx.lineTo(rx, by0);
      ctx.lineTo(rx, by1);
    }
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    for (let i = bandCount - 1; i >= 0; i--) {
      const by0 = y + (i + 1) * bandH;
      const by1 = y + i * bandH;
      const rx = insetBand(bandCount - 1 - i) ? x + w - inset : x + w;
      ctx.lineTo(rx, by0);
      ctx.lineTo(rx, by1);
    }
    ctx.lineTo(x + w, y);
    ctx.closePath();
  }

  // ─── Individual pipe style methods ───

  /** A twisted, tapered, root-flared trunk — not a rectangular pipe with bark
   *  glued on. Silhouette-first: strip the fill to solid black and this
   *  should still read as a tree, which the old straight log never did. */
  /** Forest pipe, revised after live feedback: the twisted-trunk silhouette
   *  read as messy rather than "forest." Back to a clean, instantly
   *  readable pipe — straight-edged, classic-Flappy-Bird proportions and
   *  flared rim — just recolored a woody green so it still belongs to this
   *  world instead of being a literal generic grey pipe. */
  /** Forest pipe, third pass: back to an organic tapered trunk so it shares
   *  the same construction language as the other 9 worlds (per explicit
   *  request), but calmer than the first attempt — gentler taper/wobble and
   *  fewer competing decorations, so it reads as a clean trunk rather than a
   *  busy, crooked shape. */
  private drawWoodPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number = 0, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right, cx } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.28, flare: 0.18, wobble: 3, freq: 1.5, samples: 8,
    });

    const barkGrad = ctx.createLinearGradient(x, y, x + w, y);
    barkGrad.addColorStop(0, "#8a5321");
    barkGrad.addColorStop(0.18, "#a1620f");
    barkGrad.addColorStop(0.5, "#78350f");
    barkGrad.addColorStop(1, "#4a2008");
    ctx.fillStyle = barkGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Bark grain following the trunk's own contour, and a light sweep for
    // subtle motion — clipped to the traced silhouette
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.clip();

    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.lineWidth = 2;
    for (const frac of [0.3, 0.7]) {
      ctx.beginPath();
      for (let i = 0; i < left.length; i++) {
        const lx = left[i][0] + (right[i][0] - left[i][0]) * frac;
        const ly = left[i][1];
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    ctx.restore();

    // One knot — subtle, doesn't touch the silhouette
    const knotIdx = Math.floor(2 + seed * (left.length - 5));
    const knotSide = seed > 0.5 ? left : right;
    const knotEdge = knotSide[knotIdx];
    ctx.fillStyle = "rgba(20, 10, 3, 0.4)";
    ctx.beginPath();
    ctx.ellipse(knotEdge[0] + (knotSide === left ? 5 : -5), knotEdge[1], 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // A couple of light branch offshoots along the trunk — short, thin
    // twigs, not the earlier long angled stub, just enough to read as a
    // living tree rather than a bare pole
    for (const [frac, side] of [[0.35, seed > 0.5 ? 1 : -1], [0.62, seed > 0.5 ? -1 : 1]] as const) {
      const idx = Math.round(frac * (left.length - 1));
      const edge = side === 1 ? right[idx] : left[idx];
      const twigLen = 7 + seed * 3;
      ctx.strokeStyle = "#5c3410";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(edge[0], edge[1]);
      ctx.lineTo(edge[0] + side * twigLen, edge[1] - 2);
      ctx.stroke();
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.ellipse(edge[0] + side * twigLen, edge[1] - 2, 3, 1.8, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moss patch + a small swaying leaf sprig only at the end that's
    // actually anchored on screen (ground for a bottom pipe)
    if (!isTop) {
      const baseL = left[left.length - 1], baseR = right[right.length - 1];
      ctx.fillStyle = "#16a34a";
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse((baseL[0] + cx) / 2, baseL[1] - 2, 7, 4, 0.3, 0, Math.PI * 2);
      ctx.ellipse((baseR[0] + cx) / 2, baseR[1] - 3, 6, 3.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // A small leaf sprig at the gap-facing tip, swaying gently — the bit of
    // living motion the other worlds all have (ice shimmer, lava glow,
    // neon scan line), without disturbing the trunk's silhouette
    const tipSide = seed > 0.5 ? right : left;
    const tipDir = tipSide === right ? 1 : -1;
    const tip = isTop ? tipSide[tipSide.length - 1] : tipSide[0];
    const sway = Math.sin(t * 0.03 + seed * 6) * 5;
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tip[0], tip[1]);
    ctx.quadraticCurveTo(tip[0] + tipDir * 8 + sway * 0.4, tip[1] - 4, tip[0] + tipDir * 13 + sway, tip[1] + 2);
    ctx.stroke();
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.ellipse(tip[0] + tipDir * 13 + sway, tip[1] + 1, 4, 2.2, tipDir * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  /** A faceted, broken ice spire — angular straight-edged facets (few
   *  samples, high wobble) instead of a smooth rectangle, so the silhouette
   *  itself reads as shattered crystal rather than an ice-textured column. */
  private drawIcePipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.3, flare: 0.22, wobble: 6, freq: 1.1, samples: 5,
    });

    const iceGrad = ctx.createLinearGradient(x, y, x + w, y);
    iceGrad.addColorStop(0, "rgba(240, 253, 255, 0.85)");
    iceGrad.addColorStop(0.5, "rgba(186, 230, 253, 0.7)");
    iceGrad.addColorStop(1, "rgba(125, 211, 252, 0.6)");
    ctx.fillStyle = iceGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Facet highlight along the lit edge
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.moveTo(left[0][0] + 2, left[0][1]);
    for (const [lx, ly] of left) ctx.lineTo(lx + w * 0.22, ly);
    for (let i = left.length - 1; i >= 0; i--) ctx.lineTo(left[i][0] + 2, left[i][1]);
    ctx.fill();
    // Refraction lines crossing the facets
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let ly = y + 20; ly < y + h; ly += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 5, ly);
      ctx.lineTo(x + w - 5, ly + 15);
      ctx.stroke();
    }
    ctx.restore();

    // Icicle teeth right at the gap edge — kept, this is the strongest
    // material cue the original had and it's genuinely ice-specific
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

  /** Jagged broken-rock column — angular chunks (few samples, high wobble)
   *  instead of a clean rectangle, with the glowing crack network now
   *  running the full length so rock and lava-cap read as one material. */
  private drawLavaPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.25, flare: 0.2, wobble: 6.5, freq: 1.0, samples: 6,
    });

    const rockGrad = ctx.createLinearGradient(x, y, x + w, y);
    rockGrad.addColorStop(0, "#292420");
    rockGrad.addColorStop(0.5, "#1c1917");
    rockGrad.addColorStop(1, "#120f0d");
    ctx.fillStyle = rockGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Rock strata bands
    ctx.fillStyle = "#292524";
    for (let ry = y; ry < y + h; ry += 25) {
      ctx.fillRect(x - 8, ry, w + 16, 3);
    }
    // Lava cracks — now traced along the jagged edge itself so the glow
    // reaches the true silhouette boundary, not a fixed inset rectangle
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(t * 0.08) * 0.3;
    ctx.beginPath();
    for (let i = 0; i < left.length; i++) {
      const [lx, ly] = left[i];
      const jx = lx + (i % 2 === 0 ? 6 : -2);
      if (i === 0) ctx.moveTo(jx, ly); else ctx.lineTo(jx, ly);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < right.length; i++) {
      const [rx, ry2] = right[i];
      const jx = rx + (i % 2 === 0 ? -6 : 2);
      if (i === 0) ctx.moveTo(jx, ry2); else ctx.lineTo(jx, ry2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Glowing molten edge at the gap
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 3, capY - (isTop ? 6 : 0), w + 6, 6);
    ctx.shadowBlur = 0;
  }

  /** A bulging reef-rock column — the body itself undulates like a real
   *  coral formation instead of a flat rectangle wearing coral growths. */
  private drawCoralPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.15, flare: 0.3, wobble: 6, freq: 2.6, samples: 10,
    });

    const coralGrad = ctx.createLinearGradient(x, y, x + w, y);
    coralGrad.addColorStop(0, "#22a5c2");
    coralGrad.addColorStop(0.5, "#0e7490");
    coralGrad.addColorStop(1, "#0b5566");
    ctx.fillStyle = coralGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(6,182,212,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#155e75";
    for (let cy = y; cy < y + h; cy += 20) {
      ctx.beginPath();
      ctx.arc(x + w * 0.3, cy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Coral polyp growth clustered along the bulging edges themselves
    ctx.fillStyle = "#fb7185";
    for (let i = 0; i < left.length; i += 2) {
      const blobH = 5 + Math.sin(i * 3 + t * 0.02) * 2;
      ctx.beginPath();
      ctx.arc(left[i][0], left[i][1], blobH, 0, Math.PI * 2);
      ctx.arc(right[i][0], right[i][1], blobH * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Growth cap at the gap edge
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(x - 5, capY - (isTop ? 8 : 0), w + 10, 8, 4);
    ctx.fill();
  }

  /** A greebled station module — stepped/notched panel edges (built, not
   *  organic) so it reads as engineered hardware rather than a picture
   *  frame with lights on it. */
  private drawSpacePipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number, seed: number = 0) {
    const ctx = this.ctx;
    this.traceGreebledColumn(x, y, w, h, isTop, seed, { inset: 6, bandCount: 6 });

    const metalGrad = ctx.createLinearGradient(x, y, x + w, y);
    metalGrad.addColorStop(0, "#3a4a63");
    metalGrad.addColorStop(0.5, "#1e293b");
    metalGrad.addColorStop(1, "#0f1729");
    ctx.fillStyle = metalGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Panel seams
    ctx.fillStyle = "#334155";
    ctx.fillRect(x + 2, y, 3, h);
    ctx.fillRect(x + w - 5, y, 3, h);
    // Animated neon strip
    const stripColor = `hsl(${(t * 2) % 360}, 80%, 60%)`;
    ctx.fillStyle = stripColor;
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    // Blinking lights — smooth pulse instead of a hard on/off swap
    for (let ly = y + 15; ly < y + h - 15; ly += 30) {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(x + 10, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, Math.sin(t * 0.1 + ly));
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(x + 10, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Antenna/vent greeble poking off the anchored end
    const antennaY = isTop ? y + 4 : y + h - 4;
    const antennaDir = isTop ? -1 : 1;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, antennaY);
    ctx.lineTo(x + w * 0.7, antennaY + antennaDir * 10);
    ctx.stroke();
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(x + w * 0.7, antennaY + antennaDir * 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Station docking cap at the gap edge
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x - 8, capY - (isTop ? 12 : 0), w + 16, 12);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x - 8, capY - (isTop ? 12 : 0), w + 16, 3);
  }

  /** A jagged obsidian spire — the whole silhouette is broken/angular, not
   *  just the cap spikes, and the spike crown itself is now irregular
   *  instead of a perfectly even fence. */
  private drawDarkPipe(x: number, y: number, w: number, h: number, isTop: boolean, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.32, flare: 0.24, wobble: 7, freq: 1.3, samples: 6,
    });

    const obsidianGrad = ctx.createLinearGradient(x, y, x + w, y);
    obsidianGrad.addColorStop(0, "#2b2530");
    obsidianGrad.addColorStop(0.5, "#18181b");
    obsidianGrad.addColorStop(1, "#0a0a0c");
    ctx.fillStyle = obsidianGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(63,63,70,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#27272a";
    ctx.fillRect(x - 8, y, w * 0.15 + 8, h);
    ctx.fillStyle = "#3f3f46";
    for (let sy = y; sy < y + h; sy += 20) {
      ctx.fillRect(x - 8, sy, w + 16, 1);
    }
    ctx.restore();

    // Irregular spike crown — heights/spacing vary instead of an even fence
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#3f3f46";
    let sx = 0;
    let si = 0;
    while (sx < w) {
      const spikeW = 9 + ((si + Math.floor(seed * 5)) % 3) * 3;
      const spikeH = 10 + ((si * 7 + Math.floor(seed * 13)) % 4) * 3;
      ctx.beginPath();
      ctx.moveTo(x + sx, capY);
      ctx.lineTo(x + sx + spikeW / 2, isTop ? capY + spikeH : capY - spikeH);
      ctx.lineTo(x + sx + spikeW, capY);
      ctx.fill();
      sx += spikeW;
      si++;
    }
    // Glowing rune — radial gradient so it actually reads as light
    const runeGrad = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, 10);
    runeGrad.addColorStop(0, "rgba(248, 113, 113, 0.7)");
    runeGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = runeGrad;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  /** A stepped industrial pylon — notched/vented edges (built, not organic)
   *  instead of a clean bordered rectangle, so it reads as a tech structure
   *  rather than "picture frame with neon on it." */
  private drawNeonPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number, seed: number = 0) {
    const ctx = this.ctx;
    this.traceGreebledColumn(x, y, w, h, isTop, seed, { inset: 7, bandCount: 5 });

    const neonBodyGrad = ctx.createLinearGradient(x, y, x + w, y);
    neonBodyGrad.addColorStop(0, "#1e1b3a");
    neonBodyGrad.addColorStop(0.5, "#0f172a");
    neonBodyGrad.addColorStop(1, "#050a16");
    ctx.fillStyle = neonBodyGrad;
    ctx.fill();
    // Neon border traces the actual stepped silhouette now
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Inner neon lines
    ctx.strokeStyle = "#c026d3";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + 5, y + h - 5);
    ctx.moveTo(x + w - 5, y + 5);
    ctx.lineTo(x + w - 5, y + h - 5);
    ctx.stroke();
    // Vent slats in the recessed bands
    ctx.strokeStyle = "rgba(34,211,238,0.4)";
    ctx.lineWidth = 1;
    for (let vy = y + 8; vy < y + h - 8; vy += 14) {
      ctx.beginPath();
      ctx.moveTo(x + 2, vy);
      ctx.lineTo(x + w - 2, vy);
      ctx.stroke();
    }
    // Scanning line
    const scanY = y + ((t * 2) % h);
    ctx.fillStyle = "rgba(34, 211, 238, 0.3)";
    ctx.fillRect(x - 4, scanY, w + 8, 3);
    ctx.restore();

    // Cap
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "#c026d3";
    ctx.shadowColor = "#c026d3";
    ctx.shadowBlur = 10;
    ctx.fillRect(x - 5, capY - (isTop ? 8 : 0), w + 10, 8);
    ctx.shadowBlur = 0;
  }

  /** An ornate carved-stone pillar with a flared capital/base and fluted
   *  shaft — a fragment of the floating kingdom's own architecture, not a
   *  cloud-textured rectangle. Cloud wisps drift around the flares so it
   *  still reads as belonging to the sky, just as built stone rather than
   *  condensed vapor. */
  private drawCloudPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number = 0, seed: number = 0) {
    const ctx = this.ctx;
    // Fluted shaft: many thin, low-amplitude ripples read as carved grooves
    // rather than an organic wobble — deliberately restrained, not jagged.
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.06, flare: 0.16, wobble: 1.6, freq: 4.5, samples: 14,
    });

    const stoneGrad = ctx.createLinearGradient(x, y, x + w, y);
    stoneGrad.addColorStop(0, "#fefce8");
    stoneGrad.addColorStop(0.55, "#fde9b8");
    stoneGrad.addColorStop(1, "#d9b877");
    ctx.fillStyle = stoneGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(146,64,14,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Flute shadow lines
    ctx.strokeStyle = "rgba(146,64,14,0.15)";
    ctx.lineWidth = 1;
    for (const frac of [0.25, 0.5, 0.75]) {
      ctx.beginPath();
      for (let i = 0; i < left.length; i++) {
        const lx = left[i][0] + (right[i][0] - left[i][0]) * frac;
        const ly = left[i][1];
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }
    // Gold inlay band at mid-shaft
    ctx.fillStyle = "rgba(251, 191, 36, 0.55)";
    const midIdx = Math.floor(left.length / 2);
    ctx.fillRect(left[midIdx][0] - 2, left[midIdx][1] - 3, right[midIdx][0] - left[midIdx][0] + 4, 6);
    ctx.restore();

    // Carved capital/base flare at the anchored end (away from the gap)
    const anchorPt = isTop ? { l: left[0], r: right[0] } : { l: left[left.length - 1], r: right[right.length - 1] };
    const flareY = anchorPt.l[1];
    ctx.fillStyle = "#fde9b8";
    ctx.beginPath();
    ctx.roundRect(x - 8, flareY - (isTop ? 0 : 10), w + 16, 10, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(146,64,14,0.3)";
    ctx.stroke();

    // Soft cloud wisps drifting around the flare — keeps it tied to the sky
    const wispY = flareY + (isTop ? -6 : 6) + Math.sin(t * 0.02 + seed * 6) * 3;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(x - 4, wispY, 7, 0, Math.PI * 2);
    ctx.arc(x + w + 6, wispY + 3, 6, 0, Math.PI * 2);
    ctx.fill();

    // Gap-facing edge: a simple carved lip instead of the old cloud puffs
    const capY = isTop ? y + h : y;
    ctx.fillStyle = "rgba(253, 224, 71, 0.35)";
    ctx.fillRect(x - 2, capY - (isTop ? 3 : 0), w + 4, 3);
  }

  /** A Nabataean carved-stone column: an entasis shaft (bulging toward the
   *  middle, tapering at both ends — real classical-column proportions,
   *  not a monotonic taper) topped with a corbelled crow-step capital and
   *  set on a flared plinth at the ground. The silhouette itself — bulge
   *  plus stepped cornice — is what makes this read as Petra even in solid
   *  black, not a rectangle with a sandstone texture. */
  /** Traces a gear silhouette — alternating outer/inner radius around the
   *  circumference. Does not fill/stroke; caller sets style. Reused by the
   *  Clockwork obstacle's cap and by the background's rotating gears. */
  private traceGear(cx: number, cy: number, outerR: number, innerR: number, teeth: number, rotation: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    const steps = teeth * 4;
    for (let i = 0; i <= steps; i++) {
      const toothPhase = (i % 4) / 4;
      const r = toothPhase < 0.5 ? outerR : innerR;
      const angle = (i / steps) * Math.PI * 2 + rotation;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** Clockwork obstacle: a stepped steel piston housing capped with an
   *  actual rotating gear collar — the gear-tooth silhouette at the gap
   *  edge is what makes this read as clockwork machinery even as a solid
   *  silhouette, not a rectangle wearing bronze paint and bolts. */
  private drawClockworkPipe(x: number, y: number, w: number, h: number, isTop: boolean, t: number = 0, seed: number = 0) {
    const ctx = this.ctx;
    this.traceGreebledColumn(x, y, w, h, isTop, seed, { inset: 7, bandCount: 6 });

    const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
    bodyGrad.addColorStop(0, "#544738");
    bodyGrad.addColorStop(0.5, "#2e2820");
    bodyGrad.addColorStop(1, "#171310");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Bronze trim bands marking each housing segment
    ctx.fillStyle = "rgba(201,138,63,0.35)";
    for (let by = y; by < y + h; by += h / 6) {
      ctx.fillRect(x - 8, by, w + 16, 3);
    }
    // Rivets along both edges
    ctx.fillStyle = "rgba(20,15,10,0.6)";
    for (let ry = y + 8; ry < y + h - 4; ry += 14) {
      ctx.beginPath();
      ctx.arc(x + 4, ry, 1.6, 0, Math.PI * 2);
      ctx.arc(x + w - 4, ry, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // A small piston rod sliding in and out of a port on the shaft —
    // genuine mechanical motion, not just a color pulse
    const portY = y + h * 0.4;
    const rodExtend = (Math.sin(t * 0.04 + seed * 8) * 0.5 + 0.5) * 10;
    ctx.fillStyle = "#1c1a16";
    ctx.fillRect(x - 4, portY - 5, 8, 10);
    ctx.fillStyle = "#c9a35a";
    ctx.fillRect(x - 4 - rodExtend, portY - 2, rodExtend + 4, 4);
    ctx.beginPath();
    ctx.arc(x - 4 - rodExtend, portY, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // The gear collar — the signature silhouette element, slowly rotating
    const capY = isTop ? y + h : y;
    const gearR = w * 0.62;
    const rotation = t * 0.01 + seed * 6;
    const gearGrad = ctx.createRadialGradient(x + w / 2 - 4, capY - 4, 2, x + w / 2, capY, gearR);
    gearGrad.addColorStop(0, "#e8c98a");
    gearGrad.addColorStop(0.6, "#c98a3f");
    gearGrad.addColorStop(1, "#6e4a22");
    this.traceGear(x + w / 2, capY, gearR, gearR * 0.72, 10, rotation);
    ctx.fillStyle = gearGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(35,22,8,0.55)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#3d332a";
    ctx.beginPath();
    ctx.arc(x + w / 2, capY, gearR * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a2a";
    ctx.beginPath();
    ctx.arc(x + w / 2, capY, gearR * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Riveted mounting flange at the ground — only where visible
    if (!isTop) {
      const baseY = y + h;
      ctx.fillStyle = "#211d18";
      ctx.fillRect(x - 10, baseY - 8, w + 20, 8);
      ctx.strokeStyle = "rgba(201,138,63,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 10, baseY - 8, w + 20, 8);
      ctx.fillStyle = "rgba(20,15,10,0.7)";
      for (const fx of [x - 6, x + w / 2, x + w + 6]) {
        ctx.beginPath();
        ctx.arc(fx, baseY - 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A smooth warm glint (never a hard on/off pop) catching the brass trim
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const sweepPos = y + (((t * 0.7 + seed * h) % (h + 60)) - 30);
    const sweepGrad = ctx.createLinearGradient(0, sweepPos - 16, 0, sweepPos + 16);
    sweepGrad.addColorStop(0, "rgba(255,214,150,0)");
    sweepGrad.addColorStop(0.5, "rgba(255,214,150,0.22)");
    sweepGrad.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(x - 6, sweepPos - 16, w + 12, 32);
    ctx.restore();
  }

  /** A broken, weathered obelisk — chipped/eroded silhouette matching the
   *  ruin language the pyramids already established, not a clean brick
   *  tower. */
  private drawSandstonePipe(x: number, y: number, w: number, h: number, isTop: boolean, seed: number = 0) {
    const ctx = this.ctx;
    // Erosion: fewer samples than a smooth organic wobble reads as chipped
    // stone chunks rather than a curved surface.
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.1, flare: 0.08, wobble: 4.5, freq: 1.6, samples: 7,
    });

    const stoneGrad = ctx.createLinearGradient(x, y, x + w, y);
    stoneGrad.addColorStop(0, "#f2a72e");
    stoneGrad.addColorStop(0.5, "#d97706");
    stoneGrad.addColorStop(1, "#92400e");
    ctx.fillStyle = stoneGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(69,26,3,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    // Coursed stone joints
    ctx.fillStyle = "#b45309";
    for (let by = y; by < y + h; by += 18) {
      ctx.fillRect(x - 8, by, w + 16, 2);
      const offset = Math.floor(by / 18) % 2 === 0 ? 0 : w / 2;
      ctx.fillRect(x + offset, by, 2, 18);
    }
    // Carved relief bands — real bands, not faint marks
    ctx.fillStyle = "#78350f";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x + 8, y + h * 0.22, w - 16, 6);
    ctx.fillRect(x + 8, y + h * 0.5, w - 16, 6);
    ctx.fillStyle = "#92400e";
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x + 15, y + h * 0.32, 8, 10);
    ctx.fillRect(x + 28, y + h * 0.62, 6, 8);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Chipped chunk missing from one edge — the clearest "ruin" cue
    const chipIdx = Math.floor(2 + seed * (left.length - 4));
    const chipSide = seed > 0.5 ? left : right;
    const chipDir = chipSide === left ? 1 : -1;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(chipSide[chipIdx][0] + chipDir * 4, chipSide[chipIdx][1], 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Weathered, unevenly chipped edge at the gap instead of a clean stepped
    // cap — jagged peaks reaching into the body read as a broken ruin top.
    const capY = isTop ? y + h : y;
    const dir = isTop ? -1 : 1;
    const heights = [2, 12, 4, 13, 6, 11, 1].map(v => v + seed * 3);
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(x - 5, capY);
    for (let i = 0; i < heights.length; i++) {
      const px = x - 5 + ((w + 10) * i) / (heights.length - 1);
      ctx.lineTo(px, capY + dir * heights[i]);
    }
    ctx.lineTo(x + w + 5, capY);
    ctx.closePath();
    ctx.fill();
  }

  /** A weathered wood post with a real torii silhouette at the cap — two
   *  angled crossbeams, not a flat rectangle bar — plus a single blossom
   *  branch growing off the post instead of two identical cap dots. */
  private drawSakuraPipe(x: number, y: number, w: number, h: number, isTop: boolean, seed: number = 0) {
    const ctx = this.ctx;
    const { left, right } = this.traceOrganicColumn(x, y, w, h, isTop, seed, {
      taper: 0.2, flare: 0.14, wobble: 3, freq: 1.4, samples: 8,
    });

    const woodGrad = ctx.createLinearGradient(x, y, x + w, y);
    woodGrad.addColorStop(0, "#6b2c0f");
    woodGrad.addColorStop(0.5, "#451a03");
    woodGrad.addColorStop(1, "#2b0f02");
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#78350f";
    for (const frac of [0.14, 0.5, 0.86]) {
      ctx.beginPath();
      for (let i = 0; i < left.length; i++) {
        const lx = left[i][0] + (right[i][0] - left[i][0]) * frac;
        const ly = left[i][1];
        if (i === 0) ctx.moveTo(lx - 1.5, ly); else ctx.lineTo(lx - 1.5, ly);
      }
      for (let i = left.length - 1; i >= 0; i--) {
        const lx = left[i][0] + (right[i][0] - left[i][0]) * frac;
        ctx.lineTo(lx + 1.5, left[i][1]);
      }
      ctx.fill();
    }
    ctx.restore();

    // Torii crossbeams — the actual gate silhouette, angled beams
    // extending past the post rather than a flat rectangle bar
    const capY = isTop ? y + h : y;
    const beamDir = isTop ? -1 : 1;
    ctx.fillStyle = "#b91c1c";
    ctx.save();
    ctx.translate(x + w / 2, capY);
    // Upper (kasagi) beam — wider, gently upswept ends
    ctx.beginPath();
    ctx.moveTo(-w * 0.9, beamDir * 6);
    ctx.lineTo(-w * 0.95, beamDir * 2);
    ctx.lineTo(w * 0.95, beamDir * 2);
    ctx.lineTo(w * 0.9, beamDir * 6);
    ctx.lineTo(-w * 0.9, beamDir * 6);
    ctx.fill();
    // Lower (nuki) beam — narrower, straight through-tie
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(-w * 0.75, beamDir * 9, w * 1.5, beamDir * 4);
    ctx.restore();

    // A single blossom branch growing off the post, not two identical dots
    const branchSide = seed > 0.5 ? right : left;
    const branchIdx = Math.floor(1 + (1 - seed) * (branchSide.length - 3));
    const [bx, by] = branchSide[branchIdx];
    const dir = branchSide === right ? 1 : -1;
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + dir * 10, by - 6, bx + dir * 18, by - 4);
    ctx.stroke();
    for (const [ox, oy] of [[dir * 18, -4], [dir * 12, -8], [dir * 22, -2]] as const) {
      const bGrad = ctx.createRadialGradient(bx + ox - 2, by + oy - 2, 1, bx + ox, by + oy, 6);
      bGrad.addColorStop(0, "#ffe4f2");
      bGrad.addColorStop(1, "#f472b6");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx + ox, by + oy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
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
      case "clockwork": bodyColor = "#b5773a"; wingColor = "#d99a4e"; eyeColor = "#2b1608"; beakColor = "#8a5a2a"; break;
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
    } else if (world.birdSkin === "clockwork") {
      // A small brass monocle over the eye
      ctx.strokeStyle = "#e8c98a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(9.5, -8, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14.8, -4.5);
      ctx.lineTo(16, 0);
      ctx.stroke();
      // A tiny cog pinned to the chest
      ctx.fillStyle = "#c98a3f";
      ctx.save();
      ctx.translate(-2, 8);
      ctx.rotate(tick * 0.02);
      for (let tooth = 0; tooth < 6; tooth++) {
        ctx.save();
        ctx.rotate((tooth / 6) * Math.PI * 2);
        ctx.fillRect(-1, -4, 2, 2);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a4f22";
      ctx.beginPath();
      ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

}
