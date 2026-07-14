import * as THREE from 'three';

const BURST_COUNT = 24;
const BURST_LIFETIME = 0.6;

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
};

export class CollectEffect {
  private readonly particles: Particle[] = [];
  private readonly geometry: THREE.BufferGeometry;
  private readonly mesh: THREE.Points;
  private active = false;
  private age = 0;

  constructor() {
    const positions = new Float32Array(BURST_COUNT * 3);
    const sizes = new Float32Array(BURST_COUNT);
    const colors = new Float32Array(BURST_COUNT * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.mesh = new THREE.Points(this.geometry, material);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < BURST_COUNT; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: BURST_LIFETIME,
        scale: 0.1,
      });
    }
  }

  get object(): THREE.Points {
    return this.mesh;
  }

  trigger(position: THREE.Vector3, color: THREE.Color): void {
    this.active = true;
    this.age = 0;

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < BURST_COUNT; i++) {
      const p = this.particles[i];
      p.position.copy(position);
      p.position.y += 0.5;

      // Random burst direction — mostly upward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * 0.8; // mostly upward
      const speed = 1.5 + Math.random() * 3;
      p.velocity.set(
        Math.sin(theta) * Math.sin(phi) * speed,
        Math.cos(phi) * speed * 0.8 + 1,
        Math.sin(theta) * Math.cos(phi) * speed,
      );

      p.life = BURST_LIFETIME;
      p.maxLife = BURST_LIFETIME + (Math.random() - 0.5) * 0.2;
      p.scale = 0.08 + Math.random() * 0.12;

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      sizeAttr.setX(i, p.scale);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.mesh.visible = true;
  }

  update(delta: number): void {
    if (!this.active) return;

    this.age += delta;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;
    const colorAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    let allDead = true;

    for (let i = 0; i < BURST_COUNT; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;

      p.life -= delta;
      if (p.life <= 0) {
        sizeAttr.setX(i, 0);
        continue;
      }

      allDead = false;

      // Physics
      p.velocity.y -= 4 * delta; // gravity
      p.position.addScaledVector(p.velocity, delta);

      // Fade out
      const t = p.life / p.maxLife;
      sizeAttr.setX(i, p.scale * t);
      colorAttr.setXYZ(i, 1, 0.9 * t + 0.1, 0.6 * t);

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    if (allDead) {
      this.active = false;
      this.mesh.visible = false;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// Pool of effects for multiple simultaneous bursts
export class CollectEffectPool {
  private readonly effects: CollectEffect[] = [];
  private nextIndex = 0;

  constructor(scene: THREE.Scene, count = 3) {
    for (let i = 0; i < count; i++) {
      const effect = new CollectEffect();
      effect.object.visible = false;
      scene.add(effect.object);
      this.effects.push(effect);
    }
  }

  trigger(position: THREE.Vector3, color: THREE.Color): void {
    const effect = this.effects[this.nextIndex];
    effect.trigger(position, color);
    this.nextIndex = (this.nextIndex + 1) % this.effects.length;
  }

  update(delta: number): void {
    for (const effect of this.effects) {
      effect.update(delta);
    }
  }

  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose();
    }
  }
}
