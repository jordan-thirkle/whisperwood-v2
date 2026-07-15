import * as THREE from 'three';

export class CameraRig {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly shakeOffset = new THREE.Vector3();

  // Shake state
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeElapsed = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly offset = new THREE.Vector3(0, 9.5, 9.5),
  ) {}

  snapTo(target: THREE.Vector3): void {
    this.desiredPosition.copy(target).add(this.offset);
    this.camera.position.copy(this.desiredPosition);
    this.lookTarget.copy(target).add(new THREE.Vector3(0, 0.4, 0));
    this.camera.lookAt(this.lookTarget);
  }

  triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  update(delta: number, target: THREE.Vector3, lag: number): void {
    this.desiredPosition.copy(target).add(this.offset);
    const factor = 1 - Math.exp(-delta / Math.max(0.001, lag));
    this.camera.position.lerp(this.desiredPosition, factor);
    this.lookTarget.copy(target).add(new THREE.Vector3(0, 0.35, -1.2));

    // Screen shake
    this.shakeOffset.set(0, 0, 0);
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += delta;
      const progress = this.shakeElapsed / this.shakeDuration;
      // Decay curve: strong at start, smooth fade out
      const decay = 1 - progress;
      const intensity = this.shakeIntensity * decay * decay;
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * intensity,
        (Math.random() - 0.5) * 2 * intensity,
        (Math.random() - 0.5) * 2 * intensity * 0.3, // less depth shake
      );
    }

    this.camera.position.add(this.shakeOffset);
    this.camera.lookAt(this.lookTarget);
  }
}
