import * as THREE from "three";
import {
  type FluxState,
  type FluxGate,
  type FluxColor,
  FLUX_COLORS,
  LANE_X,
} from "./flux-types";

interface Particle3D {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class FluxRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;

  // Scene Graph Objects
  private playerGroup: THREE.Group;
  private coreMesh: THREE.Mesh;
  private outerShell: THREE.Mesh;
  private ring1: THREE.Mesh;
  private ring2: THREE.Mesh;
  private playerLight: THREE.PointLight;

  private trackGroup: THREE.Group;
  private trackFloor: THREE.Mesh;
  private leftRail: THREE.Mesh;
  private rightRail: THREE.Mesh;
  private laneLines: THREE.LineSegments;

  // Gate Meshes Pool
  private gatePool: Map<string, THREE.Group> = new Map();
  private gateMaterialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  // Environment & Warp Stars
  private starPoints: THREE.Points;
  private starPositions: Float32Array;
  private starCount = 450;
  private monolithsGroup: THREE.Group;

  // Particle System
  private particles: Particle3D[] = [];
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particleMesh: THREE.Points;
  private maxParticles = 600;

  // Animation clocks & smoothing
  private renderTime = 0;
  private cameraShake = 0;
  private lastPlayerLane = 0;
  private lastColor: FluxColor = "cyan";

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    // 1. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x060814, 0.009);

    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 350);
    this.camera.position.set(0, 3.4, -7.0);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // Cleanly attach to DOM
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    // 3. Lighting
    const ambient = new THREE.AmbientLight(0x223355, 1.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x88bbff, 1.6);
    dirLight.position.set(0, 20, -10);
    this.scene.add(dirLight);

    // 4. Build Environment & Track
    this.trackGroup = new THREE.Group();
    this.buildTrack();
    this.scene.add(this.trackGroup);

    this.buildEnvironment();

    // 5. Build Player 3D Core
    this.playerGroup = new THREE.Group();
    this.buildPlayer();
    this.scene.add(this.playerGroup);

    // 6. Build Particle System
    this.buildParticleSystem();
  }

  private buildTrack() {
    const trackLength = 220;
    const trackWidth = 11.2;

    // Floor Mesh with grid texture feel
    const floorGeo = new THREE.PlaneGeometry(trackWidth, trackLength, 1, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1024,
      roughness: 0.25,
      metalness: 0.75,
      emissive: 0x040816,
      emissiveIntensity: 0.4,
    });
    this.trackFloor = new THREE.Mesh(floorGeo, floorMat);
    this.trackFloor.rotation.x = -Math.PI / 2;
    this.trackFloor.position.set(0, 0, trackLength / 2 - 10);
    this.trackGroup.add(this.trackFloor);

    // Outer Glowing Barrier Rails (Left & Right)
    const railGeo = new THREE.BoxGeometry(0.35, 0.45, trackLength);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    this.leftRail = new THREE.Mesh(railGeo, railMat);
    this.leftRail.position.set(-5.6, 0.22, trackLength / 2 - 10);
    this.trackGroup.add(this.leftRail);

    this.rightRail = new THREE.Mesh(railGeo, railMat.clone());
    this.rightRail.position.set(5.6, 0.22, trackLength / 2 - 10);
    this.trackGroup.add(this.rightRail);

    // Lane Dividers (at X = -1.8 and X = +1.8)
    const lineGeo = new THREE.BufferGeometry();
    const linePositions: number[] = [];

    [-1.8, 1.8].forEach((lx) => {
      for (let z = 0; z < trackLength; z += 6) {
        linePositions.push(lx, 0.04, z);
        linePositions.push(lx, 0.04, z + 3.2);
      }
    });

    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3366aa,
      transparent: true,
      opacity: 0.6,
    });
    this.laneLines = new THREE.LineSegments(lineGeo, lineMat);
    this.trackGroup.add(this.laneLines);
  }

  private buildPlayer() {
    // 1. Inner Emissive Core (Beveled Octahedron/Core)
    const coreGeo = new THREE.OctahedronGeometry(0.65, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: FLUX_COLORS[this.lastColor].hexNum,
      emissiveIntensity: 2.8,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreMesh.position.y = 0.85;
    this.playerGroup.add(this.coreMesh);

    // 2. Outer Faceted Gyro Shell (Transparent Floating Brackets)
    const shellGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x112244,
      emissive: FLUX_COLORS[this.lastColor].hexNum,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.55,
      wireframe: false,
    });
    this.outerShell = new THREE.Mesh(shellGeo, shellMat);
    this.outerShell.position.y = 0.85;
    this.playerGroup.add(this.outerShell);

    // 3. Dual Orbiting Rings
    const ringGeo = new THREE.TorusGeometry(1.0, 0.035, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: FLUX_COLORS[this.lastColor].hexNum,
      transparent: true,
      opacity: 0.85,
    });

    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring1.position.y = 0.85;
    this.playerGroup.add(this.ring1);

    this.ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    this.ring2.position.y = 0.85;
    this.ring2.rotation.x = Math.PI / 2;
    this.playerGroup.add(this.ring2);

    // 4. Dynamic Point Light on player
    this.playerLight = new THREE.PointLight(FLUX_COLORS[this.lastColor].hexNum, 3.5, 16);
    this.playerLight.position.set(0, 1.2, 0);
    this.playerGroup.add(this.playerLight);
  }

  private buildEnvironment() {
    // 1. Warp Starfield
    const starGeo = new THREE.BufferGeometry();
    this.starPositions = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      this.starPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      this.starPositions[i * 3 + 1] = Math.random() * 35 + 1;
      this.starPositions[i * 3 + 2] = Math.random() * 250 - 20;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(this.starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x99ccff,
      size: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);

    // 2. Distant Floating Geometric Monoliths
    this.monolithsGroup = new THREE.Group();
    const monoGeo = new THREE.BoxGeometry(4, 30, 4);
    const monoMat = new THREE.MeshStandardMaterial({
      color: 0x0a1020,
      emissive: 0x050d1e,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5,
    });

    for (let i = 0; i < 18; i++) {
      const mono = new THREE.Mesh(monoGeo, monoMat);
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (Math.random() * 25 + 18);
      const y = Math.random() * 10 - 2;
      const z = (i * 14) + 10;
      mono.position.set(x, y, z);
      this.monolithsGroup.add(mono);
    }
    this.scene.add(this.monolithsGroup);
  }

  private buildParticleSystem() {
    this.particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    this.particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.particleMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(this.particleGeo, this.particleMat);
    this.scene.add(this.particleMesh);
  }

  private getGateMaterial(color: FluxColor, intensity = 2.0): THREE.MeshStandardMaterial {
    const key = `${color}_${intensity}`;
    if (this.gateMaterialCache.has(key)) {
      return this.gateMaterialCache.get(key)!;
    }
    const colorDef = FLUX_COLORS[color];
    const mat = new THREE.MeshStandardMaterial({
      color: colorDef.hexNum,
      emissive: colorDef.hexNum,
      emissiveIntensity: intensity,
      roughness: 0.15,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    });
    this.gateMaterialCache.set(key, mat);
    return mat;
  }

  private createGateMesh(): THREE.Group {
    const gateGroup = new THREE.Group();

    // Structural Top Arch Bar
    const topBarGeo = new THREE.BoxGeometry(11.4, 0.45, 0.45);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x11192e,
      emissive: 0x0d1527,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.8,
    });
    const topBar = new THREE.Mesh(topBarGeo, frameMat);
    topBar.position.set(0, 3.4, 0);
    gateGroup.add(topBar);

    // Left and Right Pillar Posts
    const postGeo = new THREE.BoxGeometry(0.45, 3.6, 0.45);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-5.6, 1.7, 0);
    gateGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(5.6, 1.7, 0);
    gateGroup.add(rightPost);

    // 3 Colored Passage Energy Fields (Left, Center, Right)
    const passageWidth = 3.2;
    const passageHeight = 3.0;
    const fieldGeo = new THREE.BoxGeometry(passageWidth, passageHeight, 0.15);

    // Inner passage glowing arches
    const innerArchGeo = new THREE.BoxGeometry(passageWidth - 0.2, 0.2, 0.3);

    ([-1, 0, 1] as const).forEach((lane) => {
      const lx = LANE_X[lane];
      
      // Portal energy field
      const fieldMesh = new THREE.Mesh(fieldGeo, this.getGateMaterial("cyan"));
      fieldMesh.position.set(lx, 1.6, 0);
      fieldMesh.name = `field_${lane}`;
      gateGroup.add(fieldMesh);

      // Top glowing indicator bar
      const archMesh = new THREE.Mesh(innerArchGeo, this.getGateMaterial("cyan", 3.0));
      archMesh.position.set(lx, 3.1, 0);
      archMesh.name = `arch_${lane}`;
      gateGroup.add(archMesh);
    });

    return gateGroup;
  }

  public triggerPassSparks(x: number, color: FluxColor, isPerfect: boolean) {
    const count = isPerfect ? 45 : 24;
    const c = new THREE.Color(FLUX_COLORS[color].hexNum);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isPerfect ? 16 : 9) + 4;
      this.particles.push({
        position: new THREE.Vector3(x, 1.2 + (Math.random() - 0.5) * 0.8, 0.2),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 3.0,
          (Math.random() - 0.5) * 8 + 4
        ),
        color: c,
        size: Math.random() * 0.4 + 0.3,
        alpha: 1.0,
        life: 0,
        maxLife: isPerfect ? 0.75 : 0.5,
      });
    }
  }

  public triggerCrashExplosion(position: { x: number; y: number; z: number }, color: FluxColor) {
    this.cameraShake = 0.85;
    const count = 90;
    const c = new THREE.Color(FLUX_COLORS[color].hexNum);

    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = Math.random() * 22 + 6;

      this.particles.push({
        position: new THREE.Vector3(position.x, position.y, position.z),
        velocity: dir.multiplyScalar(speed),
        color: Math.random() > 0.3 ? c : new THREE.Color(0xffffff),
        size: Math.random() * 0.6 + 0.4,
        alpha: 1.0,
        life: 0,
        maxLife: 1.1,
      });
    }
  }

  public render(state: FluxState, dt: number) {
    this.renderTime += dt;

    // 1. Update Player 3D Transform & Color
    const targetX = state.playerLane * 3.4;
    this.playerGroup.position.x = targetX;
    this.playerGroup.position.y = 0.85 + Math.sin(this.renderTime * 4.5) * 0.06;

    // Rotation of core & outer shell
    this.coreMesh.rotation.y += 2.5 * dt;
    this.coreMesh.rotation.x += 1.8 * dt;

    this.outerShell.rotation.y -= 1.2 * dt;
    this.outerShell.rotation.z += 1.0 * dt;

    this.ring1.rotation.z += 3.2 * dt;
    this.ring2.rotation.y += 2.8 * dt;

    // Update Player Color if changed
    if (state.playerColor !== this.lastColor) {
      this.lastColor = state.playerColor;
      const colorDef = FLUX_COLORS[state.playerColor];
      
      (this.coreMesh.material as THREE.MeshStandardMaterial).emissive.setHex(colorDef.hexNum);
      (this.outerShell.material as THREE.MeshStandardMaterial).emissive.setHex(colorDef.hexNum);
      (this.ring1.material as THREE.MeshBasicMaterial).color.setHex(colorDef.hexNum);
      (this.ring2.material as THREE.MeshBasicMaterial).color.setHex(colorDef.hexNum);
      this.playerLight.color.setHex(colorDef.hexNum);

      // Trigger small aura burst on color shift
      this.triggerPassSparks(targetX, state.playerColor, false);
    }

    // Hide player on crash
    this.playerGroup.visible = state.status !== "gameover";

    // 2. Camera Smooth Follow & Dynamic Tilt
    const laneVelocity = (state.playerLane - this.lastPlayerLane) / Math.max(0.001, dt);
    this.lastPlayerLane = state.playerLane;

    const targetCamX = targetX * 0.45;
    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1.0, 10.0 * dt);
    
    // Dynamic roll tilt when shifting lanes
    const targetRoll = -laneVelocity * 0.035;
    this.camera.rotation.z += (targetRoll - this.camera.rotation.z) * Math.min(1.0, 12.0 * dt);

    // Camera Shake on crash
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.8;
      this.camera.position.y = 3.4 + (Math.random() - 0.5) * this.cameraShake * 0.8;
      this.cameraShake = Math.max(0, this.cameraShake - 2.5 * dt);
    } else {
      this.camera.position.y = 3.4;
    }

    this.camera.lookAt(targetCamX * 0.25, 1.2, 18.0);

    // 3. Update Gates
    const activeGateIds = new Set<string>();

    state.gates.forEach((gate: FluxGate) => {
      activeGateIds.add(gate.id);
      let mesh = this.gatePool.get(gate.id);

      if (!mesh) {
        mesh = this.createGateMesh();
        this.gatePool.set(gate.id, mesh);
        this.scene.add(mesh);
      }

      mesh.position.z = gate.z;
      mesh.position.y = (gate.offsetY || 0);

      // Update the 3 passage colors
      ([-1, 0, 1] as const).forEach((lane) => {
        const idx = lane + 1;
        const color = gate.laneColors[idx];
        const isTarget = lane === gate.correctLane;
        
        const field = mesh!.getObjectByName(`field_${lane}`) as THREE.Mesh | undefined;
        const arch = mesh!.getObjectByName(`arch_${lane}`) as THREE.Mesh | undefined;

        if (field) {
          field.material = this.getGateMaterial(color, isTarget ? 2.5 : 1.2);
        }
        if (arch) {
          arch.material = this.getGateMaterial(color, isTarget ? 4.0 : 1.8);
        }
      });
    });

    // Remove culled gates from scene
    this.gatePool.forEach((mesh, id) => {
      if (!activeGateIds.has(id)) {
        this.scene.remove(mesh);
        this.gatePool.delete(id);
      }
    });

    // 4. Update Warp Starfield
    if (this.starPositions) {
      const speedFactor = state.status === "playing" ? state.speed * 2.5 : 18;
      for (let i = 0; i < this.starCount; i++) {
        this.starPositions[i * 3 + 2] -= speedFactor * dt;
        if (this.starPositions[i * 3 + 2] < -15) {
          this.starPositions[i * 3 + 2] += 240;
          this.starPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
          this.starPositions[i * 3 + 1] = Math.random() * 35 + 1;
        }
      }
      this.starPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Update Monoliths
    if (state.status === "playing") {
      this.monolithsGroup.children.forEach((mono) => {
        mono.position.z -= state.speed * dt * 0.35;
        if (mono.position.z < -20) {
          mono.position.z += 250;
        }
      });
    }

    // 6. Update Particle System
    this.updateParticles(dt);

    // 7. Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  private updateParticles(dt: number) {
    const posAttr = this.particleGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = this.particleGeo.attributes.color as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 9.8 * dt; // slight gravity on sparks

      const idx = i * 3;
      positions[idx + 0] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      const alpha = 1.0 - (p.life / p.maxLife);
      colors[idx + 0] = p.color.r * alpha;
      colors[idx + 1] = p.color.g * alpha;
      colors[idx + 2] = p.color.b * alpha;
    }

    // Clear unused slots
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      const idx = i * 3;
      positions[idx + 0] = 0;
      positions[idx + 1] = -100;
      positions[idx + 2] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.renderer.dispose();
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
