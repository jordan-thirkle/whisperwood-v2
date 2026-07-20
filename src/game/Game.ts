import * as THREE from 'three';
import { AmbientParticles } from '../environment/AmbientParticles';
import { ForestBuilder, type ForestConfig } from '../environment/ForestBuilder';
import { WaterFeature } from '../environment/WaterFeature';
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

const FOREST_CFG: ForestConfig = {
  halfWidth: ARENA.halfWidth,
  halfDepth: ARENA.halfDepth,
  treeCount: 35,
  bushCount: 30,
  rockCount: 18,
  grassPatchCount: 60,
  stumpCount: 8,
  thornCount: 6,
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(48, 1, 0.1, 150);
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
    exposure: 1.08,
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

  // v2 additions
  private readonly forest!: THREE.Group;
  private readonly water!: WaterFeature;
  private readonly ambientParticles!: AmbientParticles;
  private postProcessing!: PostProcessing;
  private collectEffects!: CollectEffectPool;

  // Obstacle slow-down state
  private obstacleSlowTimer = 0;

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

    // Build environment
    const forestBuilder = new ForestBuilder(1);
    this.forest = forestBuilder.build(FOREST_CFG);
    this.water = new WaterFeature(8, -6, 2.5);
    this.ambientParticles = new AmbientParticles(
      ARENA.halfWidth, ARENA.halfDepth, 42,
    );

    this.createScene();
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.collectEffects = new CollectEffectPool(this.scene, 8);
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
    this.ambientParticles.dispose();
    this.water.dispose();
    for (const pickup of this.pickups) pickup.dispose();
    // Dispose forest
    this.forest.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
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

    // Obstacle slow-down timer
    if (this.obstacleSlowTimer > 0) {
      this.obstacleSlowTimer -= delta;
    }

    // Player update with obstacle awareness
    const effectiveTuning = this.obstacleSlowTimer > 0
      ? { ...this.tuning, speed: this.tuning.speed * 0.4 }
      : this.tuning;
    this.player.update(delta, animElapsed, this.input, effectiveTuning, ARENA);

    // Check obstacle collisions
    this.checkObstacleCollisions();

    // Animate pickups
    for (const pickup of this.pickups) {
      pickup.update(animDelta, animElapsed);
    }

    // Water animation
    this.water.update(delta, animElapsed);

    // Ambient particles
    this.ambientParticles.update(delta, animElapsed);

    // Collect pickups
    const collected = this.collision.collectPickups(this.player.group.position, this.pickups, 0.7);
    for (const pickup of collected) {
      this.score += 1;
      this.audio.pickup(pickup.index);
      this.hud.flashPickup();

      // Particle burst on collect
      const color = this.getPickupColor(pickup);
      this.collectEffects.trigger(pickup.group.position.clone(), color);

      // Screen shake — scales with progress
      const shakeIntensity = 0.08 + (this.score / this.pickups.length) * 0.04;
      this.cameraRig.triggerShake(shakeIntensity, 0.25);
    }

    if (this.score >= this.pickups.length) {
      this.complete = true;
    }

    // Day/night cycle (very slow)
    this.rng = createSeededRandom(1); // keep deterministic
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
    // ── Atmosphere ──
    this.scene.background = new THREE.Color('#152615');
    this.scene.fog = new THREE.Fog('#152615', 30, 75);

    // ── Lighting — golden hour with enhanced setup ──

    // Hemisphere — warm sky / green ground bounce
    const hemisphere = new THREE.HemisphereLight('#f6e8c8', '#2d4a2d', 1.3);
    this.scene.add(hemisphere);

    // Main sun — warm directional with high-res shadows
    const sun = new THREE.DirectionalLight('#ffe4a0', 2.4);
    sun.position.set(-10, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // Fill light — cooler from opposite side
    const fill = new THREE.DirectionalLight('#b8d4e8', 0.45);
    fill.position.set(8, 10, -8);
    this.scene.add(fill);

    // Rim light — warm backlight for depth
    const rim = new THREE.DirectionalLight('#ffd080', 0.6);
    rim.position.set(0, 8, -15);
    this.scene.add(rim);

    // Bounce light — subtle green from below
    const bounce = new THREE.PointLight('#406030', 0.3, 30);
    bounce.position.set(0, -2, 0);
    this.scene.add(bounce);

    // Ambient — base fill so shadows aren't pure black
    const ambient = new THREE.AmbientLight('#1a2a1a', 0.15);
    this.scene.add(ambient);

    // ── Environment ──
    this.scene.add(this.forest);
    this.scene.add(this.water.group);
    this.scene.add(this.ambientParticles.group);

    // ── Player ──
    this.scene.add(this.player.group);

    // ── Pickups ──
    this.createPickups();
  }

  private createPickups(): void {
    const positions: [number, number][] = [
      [-10, -8], [-5, -12], [4, -10], [10, -6],
      [-8, 5], [-3, 10], [6, 8], [12, 3],
      [-14, -2], [0, -5], [8, -14], [-6, 14],
      [14, -8], [-12, 10], [3, 15],
    ];

    const types: PickupType[] = [
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

  private checkObstacleCollisions(): void {
    const playerPos = this.player.group.position;
    // Check thorn bushes and stumps
    this.forest.traverse((child) => {
      if (child instanceof THREE.Group) {
        const name = child.name;
        if (name === 'thorn-bush' || name === 'stump') {
          const dist = playerPos.distanceTo(child.position);
          if (dist < 1.2) {
            this.obstacleSlowTimer = 0.5;
            // Push player away slightly
            const dir = new THREE.Vector3().subVectors(playerPos, child.position).normalize();
            playerPos.addScaledVector(dir, 0.05);
          }
        }
      }
    });
  }

  private updateDayNight(): void {
    const t = (Math.sin(this.elapsed * 0.02) + 1) / 2;
    const fogColor = new THREE.Color('#152615').lerp(new THREE.Color('#080e08'), t * 0.3);
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
    this.obstacleSlowTimer = 0;
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

type PickupType = 'mushroom' | 'flower' | 'crystal' | 'firefly_cluster';
