import * as THREE from 'three';
import { InputController } from '../core/InputController';
import { Loop } from '../core/Loop';
import { createRenderer, resizeRenderer } from '../core/Renderer';
import { Pickup } from '../entities/Pickup';
import { Player, type ArenaBounds } from '../entities/Player';
import { AudioSystem } from '../systems/AudioSystem';
import { CameraRig } from '../systems/CameraRig';
import { CollectEffectPool } from '../systems/CollectEffect';
import { CollisionSystem } from '../systems/CollisionSystem';
import { DebugTools, type DebugTuning } from '../systems/DebugTools';
import { Hud } from '../systems/Hud';
import { PostProcessing } from '../systems/PostProcessing';
import { createSeededRandom } from '../utils/random';

const ARENA: ArenaBounds = {
  halfWidth: 22,
  halfDepth: 22,
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
  private readonly input: InputController;
  private readonly player = new Player();
  private readonly pickups: Pickup[] = [];
  private readonly collision = new CollisionSystem();
  private readonly audio = new AudioSystem();
  private readonly hud = new Hud();
  private readonly cameraRig = new CameraRig(this.camera);
  private readonly loop = new Loop(
    (delta, elapsed) => this.update(delta, elapsed),
    () => this.render(),
  );

  private readonly tuning: DebugTuning = {
    speed: 5.8,
    dashMultiplier: 1.75,
    acceleration: 13,
    cameraLag: 0.16,
    exposure: 1.05,
    maxDpr: 2,
  };

  private readonly debugTools: DebugTools;
  private frame = 0;
  private score = 0;
  private elapsed = 0;
  private complete = false;
  private rng = createSeededRandom(1);
  private pausedForScreenshot = false;
  private reducedMotion = false;

  // Forest elements
  private readonly trees: THREE.Group[] = [];
  private readonly fireflies: THREE.Points[] = [];
  private dayNightCycle = 0;

  // v1 additions
  private postProcessing!: PostProcessing;
  private collectEffects!: CollectEffectPool;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    this.renderer.toneMappingExposure = this.tuning.exposure;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const stick = this.getElement('#touch-stick');
    const knob = this.getElement('#touch-knob');
    const dashButton = this.getElement('#dash-button');
    this.input = new InputController(stick, knob, dashButton);

    this.debugTools = new DebugTools(this.tuning, () => {
      this.renderer.toneMappingExposure = this.tuning.exposure;
      resizeRenderer(this.renderer, this.camera, this.tuning.maxDpr);
    });

    this.createScene();
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.collectEffects = new CollectEffectPool(this.scene, 5);
    this.hud.setTarget(this.pickups.length);
    this.cameraRig.snapTo(this.player.group.position);
    resizeRenderer(this.renderer, this.camera, this.tuning.maxDpr);
    this.installTestHooks();
    this.publishDiagnostics();
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.audio.dispose();
    this.debugTools.dispose();
    this.postProcessing.dispose();
    this.collectEffects.dispose();
    for (const pickup of this.pickups) pickup.dispose();
    for (const tree of this.trees) {
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    for (const ff of this.fireflies) {
      ff.geometry.dispose();
      (ff.material as THREE.Material).dispose();
    }
    this.player.dispose();
    this.renderer.dispose();
    window.__THREE_GAME_DIAGNOSTICS__ = undefined;
    window.__THREE_GAME_TEST_HOOKS__ = undefined;
  }

  private update(delta: number, elapsed: number): void {
    this.frame += 1;
    if (this.pausedForScreenshot) {
      this.publishDiagnostics();
      return;
    }
    if (!this.complete) this.elapsed += delta;

    resizeRenderer(this.renderer, this.camera, this.tuning.maxDpr);
    this.postProcessing.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    const animDelta = this.reducedMotion ? 0 : delta;
    const animElapsed = this.reducedMotion ? 0 : elapsed;
    this.player.update(delta, animElapsed, this.input, this.tuning, ARENA);

    // Animate pickups
    for (const pickup of this.pickups) {
      pickup.update(animDelta, animElapsed);
    }

    // Animate fireflies
    this.updateFireflies(animElapsed);

    // Collect pickups
    const collected = this.collision.collectPickups(this.player.group.position, this.pickups, 0.7);
    for (const pickup of collected) {
      this.score += 1;
      this.audio.pickup(pickup.index);
      this.hud.flashPickup();

      // v1: Particle burst on collect
      const color = this.getPickupColor(pickup);
      this.collectEffects.trigger(pickup.group.position.clone(), color);
    }

    if (this.score >= this.pickups.length) {
      this.complete = true;
    }

    // Day/night cycle (very slow)
    this.dayNightCycle += delta * 0.02;
    this.updateDayNight();

    this.cameraRig.update(delta, this.player.group.position, this.tuning.cameraLag);
    this.collectEffects.update(animDelta);
    this.hud.update(this.score, this.pickups.length, this.elapsed, this.complete);
    this.publishDiagnostics();
  }

  private render(): void {
    this.postProcessing.render();
  }

  private createScene(): void {
    // Forest atmosphere — warm greens and golden light
    this.scene.background = new THREE.Color('#1a2e1a');
    this.scene.fog = new THREE.Fog('#1a2e1a', 25, 65);

    // Golden hour hemisphere light
    const hemisphere = new THREE.HemisphereLight('#f6e8c8', '#2d4a2d', 1.2);
    this.scene.add(hemisphere);

    // Warm directional sunlight
    const sun = new THREE.DirectionalLight('#ffe4a0', 2.2);
    sun.position.set(-8, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Soft fill light from opposite side
    const fill = new THREE.DirectionalLight('#b8d4e8', 0.4);
    fill.position.set(6, 8, -6);
    this.scene.add(fill);

    // Forest floor
    this.scene.add(this.createForestFloor());

    // Trees
    this.createForest();

    // Player
    this.scene.add(this.player.group);

    // Pickups (mushrooms, flowers, crystals)
    this.createPickups();

    // Fireflies
    this.createFireflies();
  }

  private createForestFloor(): THREE.Mesh {
    const size = 512;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = size;
    textureCanvas.height = size;
    const ctx = textureCanvas.getContext('2d')!;

    // Base forest floor — rich dark green-brown
    ctx.fillStyle = '#2a3a22';
    ctx.fillRect(0, 0, size, size);

    // Grass patches
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const height = 2 + Math.random() * 6;
      const shade = Math.random() * 30;
      ctx.strokeStyle = `rgb(${60 + shade}, ${90 + shade}, ${40 + shade})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - height);
      ctx.stroke();
    }

    // Leaf litter
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(${140 + Math.random() * 60}, ${100 + Math.random() * 40}, ${40 + Math.random() * 30}, 0.3)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moss patches
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 8 + Math.random() * 15;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(50, 80, 35, 0.4)');
      gradient.addColorStop(1, 'rgba(50, 80, 35, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA.halfWidth * 2, ARENA.halfDepth * 2, 1, 1),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    return floor;
  }

  private createForest(): void {
    const treePositions: [number, number, number][] = [
      // Outer ring — tall trees
      [-18, 0, -18], [-12, 0, -20], [-5, 0, -19], [3, 0, -21], [10, 0, -18], [17, 0, -20],
      [-20, 0, -10], [-19, 0, -3], [-21, 0, 5], [-18, 0, 12], [-20, 0, 18],
      [20, 0, -10], [19, 0, -3], [21, 0, 5], [18, 0, 12], [20, 0, 18],
      [-15, 0, 20], [-8, 0, 22], [0, 0, 21], [8, 0, 20], [15, 0, 19],
      // Inner trees — scattered
      [-14, 0, -8], [-10, 0, 5], [-6, 0, -12], [-3, 0, 10],
      [5, 0, -8], [8, 0, 6], [12, 0, -5], [14, 0, 10],
      [-8, 0, -6], [2, 0, -14], [6, 0, 14], [11, 0, -14],
      [-16, 0, 0], [16, 0, 0], [0, 0, -16], [0, 0, 16],
    ];

    for (const [x, y, z] of treePositions) {
      const tree = this.createTree(x, y, z);
      this.trees.push(tree);
      this.scene.add(tree);
    }

    // Scattered bushes
    for (let i = 0; i < 25; i++) {
      const x = (this.rng() - 0.5) * ARENA.halfWidth * 1.6;
      const z = (this.rng() - 0.5) * ARENA.halfDepth * 1.6;
      const bush = this.createBush(x, z);
      this.scene.add(bush);
    }

    // Rocks
    for (let i = 0; i < 15; i++) {
      const x = (this.rng() - 0.5) * ARENA.halfWidth * 1.6;
      const z = (this.rng() - 0.5) * ARENA.halfDepth * 1.6;
      const rock = this.createRock(x, z);
      this.scene.add(rock);
    }
  }

  private createTree(x: number, _y: number, z: number): THREE.Group {
    const tree = new THREE.Group();
    const height = 4 + this.rng() * 5;
    const trunkRadius = 0.15 + this.rng() * 0.15;

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, height, 8);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.5, 0.2 + this.rng() * 0.1),
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Canopy — layered cones for pine-tree look
    const layers = 2 + Math.floor(this.rng() * 2);
    for (let i = 0; i < layers; i++) {
      const layerY = height * 0.5 + i * (height * 0.25);
      const layerRadius = (2.5 - i * 0.6) * (0.8 + this.rng() * 0.4);
      const layerHeight = 2 + this.rng() * 1.5;
      const canopyGeo = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
      const canopyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + this.rng() * 0.08, 0.55, 0.18 + this.rng() * 0.12),
        roughness: 0.8,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = layerY;
      canopy.castShadow = true;
      tree.add(canopy);
    }

    tree.position.set(x, 0, z);
    return tree;
  }

  private createBush(x: number, z: number): THREE.Mesh {
    const size = 0.4 + this.rng() * 0.8;
    const geo = new THREE.SphereGeometry(size, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.3 + this.rng() * 0.1, 0.5, 0.15 + this.rng() * 0.1),
      roughness: 0.85,
    });
    const bush = new THREE.Mesh(geo, mat);
    bush.position.set(x, size * 0.6, z);
    bush.scale.y = 0.7;
    bush.castShadow = true;
    return bush;
  }

  private createRock(x: number, z: number): THREE.Mesh {
    const size = 0.3 + this.rng() * 0.5;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.1, 0.1, 0.3 + this.rng() * 0.15),
      roughness: 0.95,
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size * 0.4, z);
    rock.rotation.set(this.rng(), this.rng(), this.rng());
    rock.castShadow = true;
    return rock;
  }

  private createPickups(): void {
    // Place pickups in forest-clearing-like positions
    const positions: [number, number][] = [
      [-10, -8], [-5, -12], [4, -10], [10, -6],
      [-8, 5], [-3, 10], [6, 8], [12, 3],
      [-14, -2], [0, -5], [8, -14], [-6, 14],
      [14, -8], [-12, 10], [3, 15],
    ];

    const types: ('mushroom' | 'flower' | 'crystal' | 'firefly_cluster')[] = [
      'mushroom', 'flower', 'crystal', 'firefly_cluster',
      'mushroom', 'flower', 'crystal', 'mushroom',
      'flower', 'mushroom', 'crystal', 'flower',
      'mushroom', 'crystal', 'flower',
    ];

    positions.forEach(([x, z], index) => {
      const type = types[index % types.length];
      const pickup = Pickup.create(index, new THREE.Vector3(x, 0, z), type);
      this.pickups.push(pickup);
      this.scene.add(pickup.group);
    });
  }

  private createFireflies(): void {
    for (let i = 0; i < 3; i++) {
      const count = 40 + Math.floor(this.rng() * 30);
      const positions = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) {
        positions[j * 3] = (this.rng() - 0.5) * ARENA.halfWidth * 1.5;
        positions[j * 3 + 1] = 0.5 + this.rng() * 3;
        positions[j * 3 + 2] = (this.rng() - 0.5) * ARENA.halfDepth * 1.5;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: '#ffe88a',
        size: 0.12,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      this.fireflies.push(points);
      this.scene.add(points);
    }
  }

  private updateFireflies(elapsed: number): void {
    for (const ff of this.fireflies) {
      const pos = ff.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        pos.setX(i, x + Math.sin(elapsed * 0.5 + i * 0.7) * 0.003);
        pos.setY(i, y + Math.sin(elapsed * 0.8 + i * 1.3) * 0.002);
        pos.setZ(i, z + Math.cos(elapsed * 0.6 + i * 0.9) * 0.003);
      }
      pos.needsUpdate = true;
      // Pulsing glow
      (ff.material as THREE.PointsMaterial).opacity = 0.4 + Math.sin(elapsed * 1.5) * 0.3;
    }
  }

  private updateDayNight(): void {
    const t = (Math.sin(this.dayNightCycle) + 1) / 2; // 0-1
    const fogColor = new THREE.Color('#1a2e1a').lerp(new THREE.Color('#0a120a'), t * 0.3);
    this.scene.fog!.color = fogColor;
    this.scene.background = fogColor;
  }

  private installTestHooks(): void {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: (value: number) => {
        this.rng = createSeededRandom(value);
      },
      setState: (name: string) => {
        if (name === 'active-play') this.resetRun();
        else if (name === 'complete') this.completeRun();
        else console.warn(`Unknown test state: ${name}`);
      },
      setPausedForScreenshot: (paused: boolean) => {
        this.pausedForScreenshot = paused;
      },
      setReducedMotion: (enabled: boolean) => {
        this.reducedMotion = enabled;
      },
      hideDebugUi: (hidden: boolean) => {
        this.debugTools.setHidden(hidden);
      },
    };
  }

  private resetRun(): void {
    this.score = 0;
    this.elapsed = 0;
    this.complete = false;
    this.player.group.position.set(0, this.player.group.position.y, 0);
    this.player.velocity.set(0, 0, 0);
    for (const pickup of this.pickups) {
      pickup.reset();
      pickup.group.rotation.y = this.rng() * Math.PI * 2;
    }
    this.cameraRig.snapTo(this.player.group.position);
    this.hud.setTarget(this.pickups.length);
    this.hud.update(this.score, this.pickups.length, this.elapsed, this.complete);
  }

  private completeRun(): void {
    for (const pickup of this.pickups) {
      if (pickup.active) pickup.collect();
    }
    this.score = this.pickups.length;
    this.complete = true;
    this.hud.update(this.score, this.pickups.length, this.elapsed, this.complete);
  }

  private getPickupColor(pickup: Pickup): THREE.Color {
    // Match the pickup type to its visual color for particle burst
    const type = (pickup as unknown as { type: string }).type;
    switch (type) {
      case 'mushroom': return new THREE.Color('#c44a2a');
      case 'flower': return new THREE.Color('#e87ab0');
      case 'crystal': return new THREE.Color('#60b8d0');
      case 'firefly_cluster': return new THREE.Color('#ffe88a');
      default: return new THREE.Color('#f0d890');
    }
  }

  private publishDiagnostics(): void {
    const info = this.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      elapsed: this.elapsed,
      score: this.score,
      targetScore: this.pickups.length,
      complete: this.complete,
      player: {
        position: {
          x: this.player.group.position.x,
          y: this.player.group.position.y,
          z: this.player.group.position.z,
        },
        speed: this.player.velocity.length(),
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      canvas: {
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        width: this.canvas.width,
        height: this.canvas.height,
        dpr: Math.min(window.devicePixelRatio || 1, this.tuning.maxDpr),
      },
    };
  }

  private getElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }
}
