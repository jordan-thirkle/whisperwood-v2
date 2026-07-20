import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

export class AmbientParticles {
  readonly group = new THREE.Group();
  private readonly dustPoints: THREE.Points;
  private readonly leafPoints: THREE.Points;
  private readonly pollenPoints: THREE.Points;
  private readonly leafPositions: Float32Array;
  private readonly leafVelocities: Float32Array;
  private readonly rng: () => number;

  constructor(halfWidth: number, halfDepth: number, seed: number) {
    this.rng = createSeededRandom(seed);
    this.group.name = 'ambient-particles';

    // Dust motes — tiny floating specks in golden light
    const dustCount = 200;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (this.rng() - 0.5) * halfWidth * 1.5;
      dustPositions[i * 3 + 1] = 0.5 + this.rng() * 4;
      dustPositions[i * 3 + 2] = (this.rng() - 0.5) * halfDepth * 1.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: '#ffe8c0',
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dustPoints);

    // Falling leaves — larger, slower, colored
    const leafCount = 30;
    this.leafPositions = new Float32Array(leafCount * 3);
    this.leafVelocities = new Float32Array(leafCount * 3);
    for (let i = 0; i < leafCount; i++) {
      this.leafPositions[i * 3] = (this.rng() - 0.5) * halfWidth * 1.2;
      this.leafPositions[i * 3 + 1] = 3 + this.rng() * 5;
      this.leafPositions[i * 3 + 2] = (this.rng() - 0.5) * halfDepth * 1.2;
      this.leafVelocities[i * 3] = (this.rng() - 0.5) * 0.3;
      this.leafVelocities[i * 3 + 1] = -0.2 - this.rng() * 0.3;
      this.leafVelocities[i * 3 + 2] = (this.rng() - 0.5) * 0.3;
    }
    const leafGeo = new THREE.BufferGeometry();
    leafGeo.setAttribute('position', new THREE.BufferAttribute(this.leafPositions, 3));
    const leafMat = new THREE.PointsMaterial({
      color: '#c8a040',
      size: 0.15,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.leafPoints = new THREE.Points(leafGeo, leafMat);
    this.group.add(this.leafPoints);

    // Pollen — golden sparkles near ground
    const pollenCount = 80;
    const pollenPositions = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount; i++) {
      pollenPositions[i * 3] = (this.rng() - 0.5) * halfWidth;
      pollenPositions[i * 3 + 1] = 0.2 + this.rng() * 1.5;
      pollenPositions[i * 3 + 2] = (this.rng() - 0.5) * halfDepth;
    }
    const pollenGeo = new THREE.BufferGeometry();
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPositions, 3));
    const pollenMat = new THREE.PointsMaterial({
      color: '#ffdd60',
      size: 0.06,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pollenPoints = new THREE.Points(pollenGeo, pollenMat);
    this.group.add(this.pollenPoints);
  }

  update(delta: number, elapsed: number): void {
    // Dust — slow drift
    const dustPos = this.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustPos.count; i++) {
      const x = dustPos.getX(i);
      const y = dustPos.getY(i);
      const z = dustPos.getZ(i);
      dustPos.setX(i, x + Math.sin(elapsed * 0.3 + i * 0.5) * 0.002);
      dustPos.setY(i, y + Math.sin(elapsed * 0.2 + i * 0.8) * 0.001);
      dustPos.setZ(i, z + Math.cos(elapsed * 0.25 + i * 0.6) * 0.002);
    }
    dustPos.needsUpdate = true;
    (this.dustPoints.material as THREE.PointsMaterial).opacity = 0.35 + Math.sin(elapsed * 0.7) * 0.15;

    // Leaves — fall and swirl
    for (let i = 0; i < this.leafPositions.length / 3; i++) {
      this.leafPositions[i * 3] += this.leafVelocities[i * 3] * delta + Math.sin(elapsed + i) * 0.005;
      this.leafPositions[i * 3 + 1] += this.leafVelocities[i * 3 + 1] * delta;
      this.leafPositions[i * 3 + 2] += this.leafVelocities[i * 3 + 2] * delta + Math.cos(elapsed + i) * 0.005;

      // Reset when hitting ground
      if (this.leafPositions[i * 3 + 1] < 0) {
        this.leafPositions[i * 3] = (this.rng() - 0.5) * 40;
        this.leafPositions[i * 3 + 1] = 4 + this.rng() * 4;
        this.leafPositions[i * 3 + 2] = (this.rng() - 0.5) * 40;
      }
    }
    (this.leafPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Pollen — gentle pulse
    const pollenPos = this.pollenPoints.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pollenPos.count; i++) {
      const y = pollenPos.getY(i);
      pollenPos.setY(i, y + Math.sin(elapsed * 1.5 + i * 2) * 0.001);
    }
    pollenPos.needsUpdate = true;
    (this.pollenPoints.material as THREE.PointsMaterial).opacity = 0.4 + Math.sin(elapsed * 1.2) * 0.2;
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
