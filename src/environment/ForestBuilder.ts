import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

export type ForestConfig = {
  halfWidth: number;
  halfDepth: number;
  treeCount: number;
  bushCount: number;
  rockCount: number;
  grassPatchCount: number;
  stumpCount: number;
  thornCount: number;
};

export class ForestBuilder {
  readonly trees: THREE.Group[] = [];
  readonly obstacles: THREE.Group[] = [];
  private readonly rng: () => number;

  constructor(seed: number) {
    this.rng = createSeededRandom(seed);
  }

  build(cfg: ForestConfig): THREE.Group {
    const root = new THREE.Group();

    // Ground
    root.add(this.createGround(cfg.halfWidth, cfg.halfDepth));

    // Paths (worn dirt trails)
    root.add(this.createPaths(cfg));

    // Trees — outer ring + scattered inner
    this.createTrees(cfg, root);

    // Bushes
    for (let i = 0; i < cfg.bushCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.5;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.5;
      root.add(this.createBush(x, z));
    }

    // Rocks with moss
    for (let i = 0; i < cfg.rockCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.5;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.5;
      root.add(this.createRock(x, z));
    }

    // Grass patches (instanced cards)
    root.add(this.createGrassPatches(cfg));

    // Tree stumps (obstacles)
    for (let i = 0; i < cfg.stumpCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.2;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.2;
      const stump = this.createStump(x, z);
      this.obstacles.push(stump);
      root.add(stump);
    }

    // Thorny bushes (obstacles — avoid these)
    for (let i = 0; i < cfg.thornCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.0;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.0;
      const thorn = this.createThornBush(x, z);
      this.obstacles.push(thorn);
      root.add(thorn);
    }

    return root;
  }

  // ─── Ground ──────────────────────────────────────────────

  private createGround(hw: number, hd: number): THREE.Mesh {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base — rich forest floor
    ctx.fillStyle = '#2a3a22';
    ctx.fillRect(0, 0, size, size);

    // Soil variation
    for (let i = 0; i < 60; i++) {
      const x = this.rng() * size;
      const y = this.rng() * size;
      const r = 20 + this.rng() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${50 + this.rng() * 30}, ${60 + this.rng() * 20}, ${35 + this.rng() * 15}, 0.15)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Grass blades
    for (let i = 0; i < 1200; i++) {
      const x = this.rng() * size;
      const y = this.rng() * size;
      const h = 3 + this.rng() * 8;
      const shade = this.rng() * 40;
      ctx.strokeStyle = `rgb(${55 + shade}, ${85 + shade}, ${35 + shade})`;
      ctx.lineWidth = 0.5 + this.rng() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (this.rng() - 0.5) * 6, y - h * 0.6, x + (this.rng() - 0.5) * 4, y - h);
      ctx.stroke();
    }

    // Leaf litter
    for (let i = 0; i < 300; i++) {
      const x = this.rng() * size;
      const y = this.rng() * size;
      ctx.fillStyle = `rgba(${130 + this.rng() * 70}, ${90 + this.rng() * 50}, ${30 + this.rng() * 40}, 0.25)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + this.rng() * 5, 1 + this.rng() * 3, this.rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moss patches
    for (let i = 0; i < 40; i++) {
      const x = this.rng() * size;
      const y = this.rng() * size;
      const r = 10 + this.rng() * 25;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(45, 75, 30, 0.35)');
      g.addColorStop(1, 'rgba(45, 75, 30, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Small pebbles
    for (let i = 0; i < 150; i++) {
      const x = this.rng() * size;
      const y = this.rng() * size;
      ctx.fillStyle = `rgba(${80 + this.rng() * 40}, ${75 + this.rng() * 35}, ${65 + this.rng() * 30}, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + this.rng() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(hw * 2, hd * 2),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'forest-floor';
    return floor;
  }

  // ─── Paths ───────────────────────────────────────────────

  private createPaths(cfg: ForestConfig): THREE.Group {
    const paths = new THREE.Group();
    paths.name = 'paths';

    const pathCanvas = document.createElement('canvas');
    pathCanvas.width = 512;
    pathCanvas.height = 512;
    const ctx = pathCanvas.getContext('2d')!;

    // Transparent base
    ctx.clearRect(0, 0, 512, 512);

    // Worn dirt paths
    const drawPath = (points: [number, number][], width: number) => {
      ctx.strokeStyle = `rgba(90, 70, 45, 0.35)`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0][0] * 512, points[0][1] * 512);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] * 512, points[i][1] * 512);
      }
      ctx.stroke();

      // Edge wear
      ctx.strokeStyle = `rgba(70, 55, 35, 0.15)`;
      ctx.lineWidth = width + 8;
      ctx.beginPath();
      ctx.moveTo(points[0][0] * 512, points[0][1] * 512);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] * 512, points[i][1] * 512);
      }
      ctx.stroke();
    };

    // Cross paths
    drawPath([[0.5, 0.0], [0.5, 0.3], [0.45, 0.5], [0.5, 0.7], [0.5, 1.0]], 18);
    drawPath([[0.0, 0.5], [0.3, 0.48], [0.5, 0.5], [0.7, 0.52], [1.0, 0.5]], 16);
    // Diagonal
    drawPath([[0.2, 0.2], [0.4, 0.4], [0.6, 0.6], [0.8, 0.8]], 12);

    const pathTexture = new THREE.CanvasTexture(pathCanvas);
    pathTexture.colorSpace = THREE.SRGBColorSpace;

    const pathMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.halfWidth * 2, cfg.halfDepth * 2),
      new THREE.MeshStandardMaterial({
        map: pathTexture,
        transparent: true,
        roughness: 0.95,
        metalness: 0,
        depthWrite: false,
      }),
    );
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.y = 0.01;
    pathMesh.receiveShadow = true;
    paths.add(pathMesh);

    return paths;
  }

  // ─── Trees ───────────────────────────────────────────────

  private createTrees(cfg: ForestConfig, parent: THREE.Group): void {
    // Outer ring
    const outerPositions: [number, number][] = [
      [-18, -18], [-12, -20], [-5, -19], [3, -21], [10, -18], [17, -20],
      [-20, -10], [-19, -3], [-21, 5], [-18, 12], [-20, 18],
      [20, -10], [19, -3], [21, 5], [18, 12], [20, 18],
      [-15, 20], [-8, 22], [0, 21], [8, 20], [15, 19],
    ];

    for (const [x, z] of outerPositions) {
      const tree = this.createLargeTree(x, z);
      this.trees.push(tree);
      parent.add(tree);
    }

    // Inner scattered
    const innerCount = cfg.treeCount - outerPositions.length;
    for (let i = 0; i < innerCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.4;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.4;
      // Don't place too close to center (player spawn)
      if (Math.abs(x) < 2 && Math.abs(z) < 2) continue;
      const tree = this.rng() > 0.4 ? this.createLargeTree(x, z) : this.createSmallTree(x, z);
      this.trees.push(tree);
      parent.add(tree);
    }
  }

  private createLargeTree(x: number, z: number): THREE.Group {
    const tree = new THREE.Group();
    const h = 5 + this.rng() * 5;
    const trunkR = 0.18 + this.rng() * 0.15;

    // Trunk — tapered cylinder with bark texture
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.5, trunkR, h, 10);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.07, 0.45, 0.18 + this.rng() * 0.08),
      roughness: 0.92,
      metalness: 0,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Roots — small protruding cylinders at base
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + this.rng() * 0.5;
      const rootLen = 0.4 + this.rng() * 0.5;
      const rootGeo = new THREE.CylinderGeometry(0.04, 0.08, rootLen, 6);
      const root = new THREE.Mesh(rootGeo, trunkMat);
      root.position.set(Math.cos(angle) * trunkR * 1.2, 0.1, Math.sin(angle) * trunkR * 1.2);
      root.rotation.z = Math.cos(angle) * 0.6;
      root.rotation.x = Math.sin(angle) * 0.6;
      tree.add(root);
    }

    // Canopy — layered cones with organic variation
    const layers = 3 + Math.floor(this.rng() * 2);
    for (let i = 0; i < layers; i++) {
      const layerY = h * 0.45 + i * (h * 0.2);
      const layerR = (2.8 - i * 0.5) * (0.75 + this.rng() * 0.5);
      const layerH = 2.2 + this.rng() * 1.8;
      const canopyGeo = new THREE.ConeGeometry(layerR, layerH, 10);
      const canopyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.27 + this.rng() * 0.1, 0.5 + this.rng() * 0.15, 0.16 + this.rng() * 0.12),
        roughness: 0.82,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = layerY;
      canopy.rotation.y = this.rng() * Math.PI * 2;
      canopy.rotation.x = (this.rng() - 0.5) * 0.18;
      canopy.rotation.z = (this.rng() - 0.5) * 0.18;
      const sv = 0.85 + this.rng() * 0.3;
      canopy.scale.set(sv, 0.9 + this.rng() * 0.15, sv);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      tree.add(canopy);
    }

    tree.position.set(x, 0, z);
    return tree;
  }

  private createSmallTree(x: number, z: number): THREE.Group {
    const tree = new THREE.Group();
    const h = 2 + this.rng() * 2;

    // Thin trunk
    const trunkGeo = new THREE.CylinderGeometry(0.04, 0.07, h, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.4, 0.22),
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Small canopy sphere
    const canopyGeo = new THREE.SphereGeometry(0.8 + this.rng() * 0.6, 10, 8);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.28 + this.rng() * 0.08, 0.5, 0.2 + this.rng() * 0.1),
      roughness: 0.8,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = h + 0.3;
    canopy.scale.y = 0.75;
    canopy.castShadow = true;
    tree.add(canopy);

    tree.position.set(x, 0, z);
    return tree;
  }

  // ─── Bush ────────────────────────────────────────────────

  private createBush(x: number, z: number): THREE.Mesh {
    const s = 0.4 + this.rng() * 0.9;
    const geo = new THREE.SphereGeometry(s, 10, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.29 + this.rng() * 0.12, 0.45 + this.rng() * 0.15, 0.14 + this.rng() * 0.1),
      roughness: 0.85,
    });
    const bush = new THREE.Mesh(geo, mat);
    bush.position.set(x, s * 0.55, z);
    bush.scale.y = 0.65 + this.rng() * 0.15;
    bush.castShadow = true;
    bush.receiveShadow = true;
    return bush;
  }

  // ─── Rock ────────────────────────────────────────────────

  private createRock(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    const s = 0.25 + this.rng() * 0.5;

    // Main rock body
    const geo = new THREE.DodecahedronGeometry(s, 1);
    // Deform vertices for organic look
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + (this.rng() - 0.5) * 0.15);
      pos.setY(i, pos.getY(i) * (0.6 + this.rng() * 0.3));
      pos.setZ(i, pos.getZ(i) + (this.rng() - 0.5) * 0.15);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.08, 0.28 + this.rng() * 0.15),
      roughness: 0.95,
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.y = s * 0.35;
    rock.rotation.set(this.rng(), this.rng(), this.rng());
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // Moss on top (if large enough)
    if (s > 0.4) {
      const mossGeo = new THREE.SphereGeometry(s * 0.5, 8, 6);
      const mossMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3, 0.4, 0.2),
        roughness: 0.9,
      });
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.position.y = s * 0.55;
      moss.scale.y = 0.3;
      group.add(moss);
    }

    group.position.set(x, 0, z);
    return group;
  }

  // ─── Grass Patches ───────────────────────────────────────

  private createGrassPatches(cfg: ForestConfig): THREE.Group {
    const group = new THREE.Group();
    group.name = 'grass';

    const grassGeo = new THREE.PlaneGeometry(0.15, 0.6);
    const grassMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.28, 0.5, 0.25),
      roughness: 0.8,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    for (let i = 0; i < cfg.grassPatchCount; i++) {
      const x = (this.rng() - 0.5) * cfg.halfWidth * 1.4;
      const z = (this.rng() - 0.5) * cfg.halfDepth * 1.4;
      const patchSize = 3 + Math.floor(this.rng() * 5);

      for (let j = 0; j < patchSize; j++) {
        const blade = new THREE.Mesh(grassGeo, grassMat);
        blade.position.set(
          x + (this.rng() - 0.5) * 0.8,
          0.3,
          z + (this.rng() - 0.5) * 0.8,
        );
        blade.rotation.y = this.rng() * Math.PI;
        blade.rotation.x = (this.rng() - 0.5) * 0.3;
        const scale = 0.7 + this.rng() * 0.6;
        blade.scale.set(scale, scale, scale);
        group.add(blade);
      }
    }

    return group;
  }

  // ─── Tree Stump (obstacle) ───────────────────────────────

  private createStump(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'stump';

    const h = 0.3 + this.rng() * 0.3;
    const r = 0.25 + this.rng() * 0.2;

    // Stump body
    const geo = new THREE.CylinderGeometry(r, r * 1.1, h, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.07, 0.4, 0.2),
      roughness: 0.92,
    });
    const stump = new THREE.Mesh(geo, mat);
    stump.position.y = h / 2;
    stump.castShadow = true;
    stump.receiveShadow = true;
    group.add(stump);

    // Top ring (cut marks)
    const topGeo = new THREE.RingGeometry(r * 0.3, r, 12);
    const topMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.35, 0.28),
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = h + 0.01;
    group.add(top);

    // Small mushrooms growing on stump
    if (this.rng() > 0.4) {
      const mGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const mMat = new THREE.MeshStandardMaterial({
        color: '#c44a2a',
        emissive: '#3a1510',
        emissiveIntensity: 0.2,
      });
      for (let i = 0; i < 2; i++) {
        const mush = new THREE.Mesh(mGeo, mMat);
        const angle = this.rng() * Math.PI * 2;
        mush.position.set(Math.cos(angle) * r * 0.7, h + 0.05, Math.sin(angle) * r * 0.7);
        mush.scale.set(1, 0.7, 1);
        group.add(mush);
      }
    }

    group.position.set(x, 0, z);
    return group;
  }

  // ─── Thorn Bush (obstacle) ───────────────────────────────

  private createThornBush(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'thorn-bush';

    const s = 0.5 + this.rng() * 0.4;

    // Dark bush core
    const coreGeo = new THREE.SphereGeometry(s, 8, 6);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.3, 0.4, 0.1),
      roughness: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = s * 0.7;
    core.scale.y = 0.8;
    core.castShadow = true;
    group.add(core);

    // Thorn spikes
    const thornGeo = new THREE.ConeGeometry(0.03, 0.25, 4);
    const thornMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08, 0.3, 0.15),
      roughness: 0.7,
    });

    for (let i = 0; i < 12; i++) {
      const theta = this.rng() * Math.PI * 2;
      const phi = this.rng() * Math.PI;
      const r = s * (0.8 + this.rng() * 0.3);
      const thorn = new THREE.Mesh(thornGeo, thornMat);
      thorn.position.set(
        Math.sin(phi) * Math.cos(theta) * r,
        s * 0.7 + Math.cos(phi) * r * 0.5,
        Math.sin(phi) * Math.sin(theta) * r,
      );
      thorn.lookAt(new THREE.Vector3(0, s * 0.7, 0));
      thorn.rotateX(Math.PI);
      thorn.castShadow = true;
      group.add(thorn);
    }

    // Red warning berries
    const berryGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const berryMat = new THREE.MeshStandardMaterial({
      color: '#aa2020',
      emissive: '#400808',
      emissiveIntensity: 0.3,
    });
    for (let i = 0; i < 5; i++) {
      const berry = new THREE.Mesh(berryGeo, berryMat);
      const angle = this.rng() * Math.PI * 2;
      const dist = s * (0.5 + this.rng() * 0.4);
      berry.position.set(Math.cos(angle) * dist, s * 0.6 + this.rng() * s * 0.4, Math.sin(angle) * dist);
      group.add(berry);
    }

    group.position.set(x, 0, z);
    return group;
  }
}
