import * as THREE from 'three';

export class WaterFeature {
  readonly group = new THREE.Group();
  private readonly waterMesh: THREE.Mesh;
  private readonly ripples: THREE.Points[] = [];
  private time = 0;

  constructor(x: number, z: number, radius: number) {
    this.group.name = 'water-feature';

    // Pond base — dark reflective surface
    const pondGeo = new THREE.CircleGeometry(radius, 32);
    const pondMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a3a4a'),
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    this.waterMesh = new THREE.Mesh(pondGeo, pondMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = 0.02;
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // Stone rim around pond
    const rimCount = 16;
    for (let i = 0; i < rimCount; i++) {
      const angle = (i / rimCount) * Math.PI * 2;
      const stoneGeo = new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.1, 0);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.1, 0.3 + Math.random() * 0.1),
        roughness: 0.9,
      });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(
        Math.cos(angle) * (radius + 0.1),
        0.08,
        Math.sin(angle) * (radius + 0.1),
      );
      stone.rotation.set(Math.random(), Math.random(), Math.random());
      stone.castShadow = true;
      this.group.add(stone);
    }

    // Lily pads
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.6;
      const lilyGeo = new THREE.CircleGeometry(0.15 + Math.random() * 0.1, 12);
      const lilyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3, 0.5, 0.25),
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const lily = new THREE.Mesh(lilyGeo, lilyMat);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(Math.cos(angle) * dist, 0.04, Math.sin(angle) * dist);
      this.group.add(lily);
    }

    // Ripple rings
    for (let i = 0; i < 2; i++) {
      const rippleGeo = new THREE.RingGeometry(0.1, 0.15, 24);
      const rippleMat = new THREE.MeshBasicMaterial({
        color: '#4a8a9a',
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ripple = new THREE.Mesh(rippleGeo, rippleMat);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = 0.03;
      this.ripples.push(ripple as unknown as THREE.Points);
      this.group.add(ripple);
    }

    this.group.position.set(x, 0, z);
  }

  update(delta: number, elapsed: number): void {
    this.time += delta;

    // Gentle water surface animation
    const mat = this.waterMesh.material as THREE.MeshStandardMaterial;
    mat.roughness = 0.08 + Math.sin(elapsed * 0.5) * 0.03;

    // Animate ripples
    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i] as unknown as THREE.Mesh;
      const phase = elapsed * 0.8 + i * 1.5;
      const scale = 0.5 + (Math.sin(phase) + 1) * 0.8;
      ripple.scale.set(scale, scale, 1);
      (ripple.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(phase) * 0.1;
    }
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
