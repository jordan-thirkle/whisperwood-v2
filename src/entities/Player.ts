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
  private readonly trail: THREE.Points;
  private readonly trailPositions: Float32Array;
  private readonly trailIndex = { value: 0 };
  private readonly bodyMat!: THREE.MeshStandardMaterial;
  private readonly glowMat!: THREE.MeshBasicMaterial;

  constructor() {
    // ── Body — rounded forest spirit with layered geometry ──
    const bodyGroup = new THREE.Group();

    // Main body — slightly squashed sphere with warm golden tone
    const bodyGeo = new THREE.SphereGeometry(0.38, 20, 14);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: '#f0d890',
      roughness: 0.32,
      metalness: 0.08,
      emissive: '#604820',
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, this.bodyMat);
    body.scale.set(1, 0.82, 0.95);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.52;
    bodyGroup.add(body);

    // Belly patch — lighter underside
    const bellyGeo = new THREE.SphereGeometry(0.25, 12, 10);
    const bellyMat = new THREE.MeshStandardMaterial({
      color: '#f8e8b8',
      roughness: 0.4,
      metalness: 0.02,
    });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.45, 0.12);
    belly.scale.set(0.8, 0.7, 0.6);
    bodyGroup.add(belly);

    // ── Face ──
    // Eyes — large expressive with highlights
    const eyeWhiteGeo = new THREE.SphereGeometry(0.08, 10, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
    const eyePupilGeo = new THREE.SphereGeometry(0.05, 8, 6);
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
    const eyeHighlightGeo = new THREE.SphereGeometry(0.02, 6, 4);
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(side * 0.13, 0.58, -0.3);
      bodyGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      pupil.position.set(side * 0.13, 0.58, -0.36);
      bodyGroup.add(pupil);

      const highlight = new THREE.Mesh(eyeHighlightGeo, eyeHighlightMat);
      highlight.position.set(side * 0.11, 0.6, -0.37);
      bodyGroup.add(highlight);
    }

    // Cheek blush — subtle pink discs
    const blushGeo = new THREE.CircleGeometry(0.06, 10);
    const blushMat = new THREE.MeshStandardMaterial({
      color: '#e8a0a0',
      transparent: true,
      opacity: 0.4,
      roughness: 0.5,
    });
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(side * 0.22, 0.5, -0.28);
      blush.lookAt(new THREE.Vector3(side * 2, 0.5, -2));
      bodyGroup.add(blush);
    }

    // ── Leaf Hat — multi-layer with stem ──
    const hatGroup = new THREE.Group();

    // Main leaf
    const leafGeo = new THREE.ConeGeometry(0.22, 0.4, 8);
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#4a8a3a',
      roughness: 0.65,
    });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.rotation.z = 0.12;
    leaf.castShadow = true;
    hatGroup.add(leaf);

    // Small secondary leaf
    const leaf2Geo = new THREE.ConeGeometry(0.14, 0.25, 6);
    const leaf2 = new THREE.Mesh(leaf2Geo, leafMat);
    leaf2.position.set(0.1, -0.05, 0.05);
    leaf2.rotation.z = -0.3;
    hatGroup.add(leaf2);

    // Stem on top
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.15, 5);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#3a6a2a', roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.2;
    hatGroup.add(stem);

    hatGroup.position.y = 0.78;
    bodyGroup.add(hatGroup);

    // ── Feet — two small round pads ──
    const footGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const footMat = new THREE.MeshStandardMaterial({
      color: '#d4a850',
      roughness: 0.7,
    });
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(side * 0.12, 0.1, 0.05);
      foot.scale.set(1, 0.5, 1.3);
      bodyGroup.add(foot);
    }

    // ── Glow ring at feet ──
    const glowGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 28);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: '#ffe88a',
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeo, this.glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.12;
    bodyGroup.add(glow);

    this.group.add(bodyGroup);

    // ── Trail particles ──
    const trailCount = 40;
    this.trailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: '#ffe88a',
      size: 0.08,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trail = new THREE.Points(trailGeo, trailMat);
    this.group.add(this.trail);
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

    // Glow pulse
    this.glowMat.opacity = 0.2 + Math.sin(elapsed * 2) * 0.15;

    // Body emissive pulse (breathing)
    this.bodyMat.emissiveIntensity = 0.15 + Math.sin(elapsed * 1.5) * 0.08;

    // Trail update
    this.updateTrail(delta, elapsed);
  }

  private updateTrail(_delta: number, elapsed: number): void {
    // Add current position to trail periodically
    if (this.velocity.lengthSq() > 0.01) {
      const idx = this.trailIndex.value;
      this.trailPositions[idx * 3] = this.group.position.x + (Math.random() - 0.5) * 0.2;
      this.trailPositions[idx * 3 + 1] = 0.15 + Math.random() * 0.2;
      this.trailPositions[idx * 3 + 2] = this.group.position.z + (Math.random() - 0.5) * 0.2;
      this.trailIndex.value = (this.trailIndex.value + 1) % (this.trailPositions.length / 3);
    }

    // Fade trail
    const pos = this.trail.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setY(i, y + 0.003);
      // Slowly move toward player
      const dx = this.group.position.x - pos.getX(i);
      const dz = this.group.position.z - pos.getZ(i);
      pos.setX(i, pos.getX(i) + dx * 0.01);
      pos.setZ(i, pos.getZ(i) + dz * 0.01);
    }
    pos.needsUpdate = true;
    (this.trail.material as THREE.PointsMaterial).opacity = 0.2 + Math.sin(elapsed * 3) * 0.15;
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
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
