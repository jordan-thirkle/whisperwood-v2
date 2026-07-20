import * as THREE from 'three';

export type PickupType = 'mushroom' | 'flower' | 'crystal' | 'firefly_cluster';

export class Pickup {
  readonly group = new THREE.Group();
  readonly radius = 0.62;
  active = true;

  private readonly core: THREE.Mesh;
  private readonly coreGeometry: THREE.BufferGeometry;
  private readonly coreMaterial: THREE.MeshStandardMaterial;
  private readonly accent: THREE.Mesh | null = null;
  private readonly glowRing: THREE.Mesh | null = null;

  private constructor(
    readonly index: number,
    position: THREE.Vector3,
    private readonly type: PickupType,
  ) {
    const { geometry, material, accentGeometry, accentMaterial } = Pickup.createVisuals(type);
    this.coreGeometry = geometry;
    this.coreMaterial = material;

    this.core = new THREE.Mesh(geometry, material);
    this.core.castShadow = true;
    this.group.add(this.core);

    if (accentGeometry && accentMaterial) {
      const accentMesh = new THREE.Mesh(accentGeometry, accentMaterial);
      accentMesh.castShadow = true;
      this.group.add(accentMesh);
      this.accent = accentMesh;
    }

    // Glow ring under pickup
    const ringGeo = new THREE.TorusGeometry(this.radius * 0.6, 0.02, 8, 20);
    const ringColor = Pickup.getGlowColor(type);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = Math.PI / 2;
    this.glowRing.position.y = -this.getBaseY() + 0.05;
    this.group.add(this.glowRing);

    this.group.position.copy(position);
    this.group.position.y = this.getBaseY();
  }

  static create(index: number, position: THREE.Vector3, type: PickupType): Pickup {
    return new Pickup(index, position, type);
  }

  private static getGlowColor(type: PickupType): string {
    switch (type) {
      case 'mushroom': return '#ff6040';
      case 'flower': return '#ff80c0';
      case 'crystal': return '#60d0f0';
      case 'firefly_cluster': return '#ffe880';
    }
  }

  private static createVisuals(type: PickupType) {
    switch (type) {
      case 'mushroom':
        return Pickup.createMushroom();
      case 'flower':
        return Pickup.createFlower();
      case 'crystal':
        return Pickup.createCrystal();
      case 'firefly_cluster':
        return Pickup.createFireflyCluster();
    }
  }

  private static createMushroom() {
    // Multi-part mushroom: stem + cap + spots
    // Stem — slightly tapered cylinder
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.35, 10);
    const stemMat = new THREE.MeshStandardMaterial({
      color: '#e8dcc8',
      roughness: 0.7,
    });

    // Cap — domed hemisphere
    const capGeo = new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const capMat = new THREE.MeshStandardMaterial({
      color: '#c44a2a',
      roughness: 0.55,
      metalness: 0.05,
      emissive: '#3a1510',
      emissiveIntensity: 0.3,
    });

    return {
      geometry: capGeo,
      material: capMat,
      accentGeometry: stemGeo,
      accentMaterial: stemMat,
    };
  }

  private static createFlower() {
    // Multi-petal flower with center
    const petalGeo = new THREE.SphereGeometry(0.12, 8, 6);
    const petalMat = new THREE.MeshStandardMaterial({
      color: '#e87ab0',
      roughness: 0.4,
      metalness: 0.05,
      emissive: '#4a1530',
      emissiveIntensity: 0.35,
    });

    // Center pistil
    const centerGeo = new THREE.SphereGeometry(0.08, 10, 8);
    const centerMat = new THREE.MeshStandardMaterial({
      color: '#ffe060',
      roughness: 0.3,
      emissive: '#a08020',
      emissiveIntensity: 0.4,
    });

    return {
      geometry: centerGeo,
      material: centerMat,
      accentGeometry: petalGeo,
      accentMaterial: petalMat,
    };
  }

  private static createCrystal() {
    // Faceted crystal with inner glow
    const crystalGeo = new THREE.OctahedronGeometry(0.28, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#60b8d0',
      roughness: 0.12,
      metalness: 0.35,
      emissive: '#103848',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.82,
    });

    // Orbiting ring
    const ringGeo = new THREE.TorusGeometry(0.38, 0.02, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#a0e0f0',
      transparent: true,
      opacity: 0.4,
    });

    return {
      geometry: crystalGeo,
      material: crystalMat,
      accentGeometry: ringGeo,
      accentMaterial: ringMat,
    };
  }

  private static createFireflyCluster() {
    // Glowing orb with orbiting sparkles
    const orbGeo = new THREE.IcosahedronGeometry(0.18, 2);
    const orbMat = new THREE.MeshStandardMaterial({
      color: '#ffe88a',
      roughness: 0.15,
      metalness: 0.1,
      emissive: '#a08020',
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    // Halo ring
    const haloGeo = new THREE.TorusGeometry(0.32, 0.018, 8, 20);
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#fff4c0',
      transparent: true,
      opacity: 0.35,
    });

    return {
      geometry: orbGeo,
      material: orbMat,
      accentGeometry: haloGeo,
      accentMaterial: haloMat,
    };
  }

  private getBaseY(): number {
    switch (this.type) {
      case 'mushroom': return 0.25;
      case 'flower': return 0.18;
      case 'crystal': return 0.32;
      case 'firefly_cluster': return 0.85;
    }
  }

  update(delta: number, elapsed: number): void {
    if (!this.active) return;

    // Gentle floating
    const floatSpeed = this.type === 'firefly_cluster' ? 3.5 : 2.2;
    const floatAmp = this.type === 'firefly_cluster' ? 0.25 : 0.12;
    this.group.position.y = this.getBaseY() + Math.sin(elapsed * floatSpeed + this.index * 1.7) * floatAmp;

    // Slow rotation
    this.group.rotation.y += delta * (this.type === 'crystal' ? 1.2 : 0.8);

    // Crystal pulse + ring orbit
    if (this.type === 'crystal' && this.accent) {
      this.accent.rotation.x += delta * 0.5;
      this.accent.rotation.z += delta * 0.3;
      (this.coreMaterial).emissiveIntensity = 0.4 + Math.sin(elapsed * 2) * 0.2;
    }

    // Firefly glow pulse
    if (this.type === 'firefly_cluster') {
      this.coreMaterial.emissiveIntensity = 0.5 + Math.sin(elapsed * 4 + this.index) * 0.3;
    }

    // Glow ring pulse
    if (this.glowRing) {
      const mat = this.glowRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(elapsed * 2 + this.index * 0.5) * 0.12;
    }
  }

  collect(): void {
    this.active = false;
    this.group.visible = false;
  }

  reset(): void {
    this.active = true;
    this.group.visible = true;
  }

  dispose(): void {
    this.coreGeometry.dispose();
    this.coreMaterial.dispose();
    if (this.accent) {
      this.accent.geometry.dispose();
      (this.accent.material as THREE.Material).dispose();
    }
    if (this.glowRing) {
      this.glowRing.geometry.dispose();
      (this.glowRing.material as THREE.Material).dispose();
    }
  }
}
