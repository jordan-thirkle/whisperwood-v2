import * as THREE from 'three';
import type { InputController } from '../core/InputController';

export type PlayerTuning = {
  speed: number;
  dashMultiplier: number;
  acceleration: number;
};

export type ArenaBounds = {
  halfWidth: number;
  halfDepth: number;
};

export class Player {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();

  private readonly move = new THREE.Vector2();
  private readonly targetVelocity = new THREE.Vector3();

  constructor() {
    // Forest spirit body — soft round shape
    const bodyGeo = new THREE.SphereGeometry(0.4, 16, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#f0d890',
      roughness: 0.35,
      metalness: 0.08,
      emissive: '#604820',
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.55;
    body.scale.set(1, 0.85, 1);
    this.group.add(body);

    // Eyes — two small dark spheres
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.6, -0.32);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.6, -0.32);
    this.group.add(rightEye);

    // Leaf hat — small cone on top
    const hatGeo = new THREE.ConeGeometry(0.2, 0.35, 6);
    const hatMat = new THREE.MeshStandardMaterial({
      color: '#4a8a3a',
      roughness: 0.7,
    });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 0.85;
    hat.rotation.z = 0.15;
    hat.castShadow = true;
    this.group.add(hat);

    // Small glow ring at feet
    const glowGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#ffe88a',
      transparent: true,
      opacity: 0.35,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.15;
    this.group.add(glow);
  }

  update(delta: number, elapsed: number, input: InputController, tuning: PlayerTuning, bounds: ArenaBounds): void {
    input.readMovement(this.move);
    const dash = input.isDashHeld() ? tuning.dashMultiplier : 1;
    this.targetVelocity.set(this.move.x, 0, this.move.y).multiplyScalar(tuning.speed * dash);

    const smoothing = 1 - Math.exp(-tuning.acceleration * delta);
    this.velocity.lerp(this.targetVelocity, smoothing);
    this.group.position.addScaledVector(this.velocity, delta);

    // Clamp to bounds
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -bounds.halfWidth + 0.8, bounds.halfWidth - 0.8);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -bounds.halfDepth + 0.8, bounds.halfDepth - 0.8);

    // Face movement direction
    if (this.velocity.lengthSq() > 0.001) {
      this.group.rotation.y = Math.atan2(this.velocity.x, -this.velocity.z);
    }

    // Gentle bob
    this.group.position.y = 0.06 + Math.sin(elapsed * 9) * Math.min(this.velocity.length() / 40, 0.08);
  }

  dispose(): void {
    this.group.traverse((child) => {
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
}
