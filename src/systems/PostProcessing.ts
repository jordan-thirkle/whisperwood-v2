import * as THREE from 'three';
import {
  EffectComposer,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  RenderPass,
} from 'postprocessing';

export class PostProcessing {
  readonly composer: EffectComposer;
  private readonly bloom: BloomEffect;
  private readonly vignette: VignetteEffect;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom — warm glow on bright areas
    this.bloom = new BloomEffect({
      intensity: 0.4,
      luminanceThreshold: 0.6,
      luminanceSmoothing: 0.9,
      mipmapBlur: true,
    });
    this.composer.addPass(this.bloom);

    // Vignette — darken edges for cinematic feel
    this.vignette = new VignetteEffect({
      darkness: 0.45,
      offset: 0.5,
    });
    this.composer.addPass(this.vignette);

    // Chromatic aberration — subtle color fringing
    const chromatic = new ChromaticAberrationEffect();
    chromatic.offset.set(0.0005, 0.0005);
    this.composer.addPass(chromatic);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }

  setBloomIntensity(intensity: number): void {
    this.bloom.intensity = intensity;
  }

  dispose(): void {
    this.composer.dispose();
  }
}
