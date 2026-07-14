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

    this.group.position.copy(position);
    this.group.position.y = this.getBaseY();
  }

  static create(index: number, position: THREE.Vector3, type: PickupType): Pickup {
    return new Pickup(index, position, type);
  }

  private static createVisuals(type: PickupType) {
    switch (type) {
      case 'mushroom':
        return {
          geometry: new THREE.SphereGeometry(0.35, 12, 8),
          material: new THREE.MeshStandardMaterial({
            color: '#c44a2a',
            roughness: 0.6,
            metalness: 0.05,
            emissive: '#3a1510',
            emissiveIntensity: 0.3,
          }),
          accentGeometry: new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8),
          accentMaterial: new THREE.MeshStandardMaterial({
            color: '#e8dcc8',
            roughness: 0.7,
          }),
        };
      case 'flower':
        return {
          geometry: new THREE.SphereGeometry(0.25, 8, 6),
          material: new THREE.MeshStandardMaterial({
            color: '#e87ab0',
            roughness: 0.4,
            metalness: 0.05,
            emissive: '#4a1530',
            emissiveIntensity: 0.4,
          }),
          accentGeometry: new THREE.TorusGeometry(0.35, 0.04, 6, 12),
          accentMaterial: new THREE.MeshStandardMaterial({
            color: '#f0c0d8',
            emissive: '#602040',
            emissiveIntensity: 0.3,
          }),
        };
      case 'crystal':
        return {
          geometry: new THREE.OctahedronGeometry(0.3, 0),
          material: new THREE.MeshStandardMaterial({
            color: '#60b8d0',
            roughness: 0.15,
            metalness: 0.3,
            emissive: '#103848',
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.85,
          }),
          accentGeometry: new THREE.TorusGeometry(0.42, 0.025, 8, 24),
          accentMaterial: new THREE.MeshBasicMaterial({
            color: '#a0e0f0',
            transparent: true,
            opacity: 0.5,
          }),
        };
      case 'firefly_cluster':
        return {
          geometry: new THREE.IcosahedronGeometry(0.2, 1),
          material: new THREE.MeshStandardMaterial({
            color: '#ffe88a',
            roughness: 0.2,
            metalness: 0.1,
            emissive: '#a08020',
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
          }),
          accentGeometry: new THREE.TorusGeometry(0.35, 0.02, 6, 16),
          accentMaterial: new THREE.MeshBasicMaterial({
            color: '#fff4c0',
            transparent: true,
            opacity: 0.4,
          }),
        };
    }
  }

  private getBaseY(): number {
    switch (this.type) {
      case 'mushroom': return 0.25;
      case 'flower': return 0.15;
      case 'crystal': return 0.3;
      case 'firefly_cluster': return 0.8;
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

    // Crystal pulse
    if (this.type === 'crystal' && this.accent) {
      this.accent.rotation.x += delta * 0.5;
      this.accent.rotation.z += delta * 0.3;
    }

    // Firefly glow pulse
    if (this.type === 'firefly_cluster') {
      (this.coreMaterial as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + Math.sin(elapsed * 4 + this.index) * 0.3;
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
  }
}
