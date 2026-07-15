import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js';

export class PostProcessing {
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly vignettePass: ShaderPass;
  private readonly chromaticPass: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom — warm glow on bright areas (UnrealBloomPass)
    const bloomResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloom = new UnrealBloomPass(bloomResolution, 0.4, 0.9, 0.6);
    this.composer.addPass(this.bloom);

    // Vignette — darken edges for cinematic feel
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = 0.5;
    this.vignettePass.uniforms['darkness'].value = 0.45;
    this.composer.addPass(this.vignettePass);

    // Chromatic aberration — subtle color fringing
    this.chromaticPass = new ShaderPass(RGBShiftShader);
    this.chromaticPass.uniforms['amount'].value = 0.0005;
    this.chromaticPass.uniforms['angle'].value = 0.0;
    this.composer.addPass(this.chromaticPass);

    // Output pass — applies tone mapping and color space conversion
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width, height);
  }

  render(): void {
    this.composer.render();
  }

  setBloomIntensity(strength: number): void {
    this.bloom.strength = strength;
  }

  dispose(): void {
    this.composer.dispose();
  }
}
