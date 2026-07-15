export class AudioSystem {
  private context: AudioContext | null = null;
  private unlocked = false;

  // Ambient forest sounds
  private ambientGain: GainNode | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private ambientStarted = false;

  constructor() {
    const unlock = () => {
      void this.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  async unlock(): Promise<void> {
    if (this.unlocked) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    await this.context.resume();
    this.unlocked = true;
    this.startAmbient();
  }

  pickup(index: number): void {
    if (!this.context || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(320 + index * 22, now);
    oscillator.frequency.exponentialRampToValueAtTime(680 + index * 24, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  private startAmbient(): void {
    if (!this.context || this.ambientStarted) return;
    this.ambientStarted = true;

    // Master ambient gain
    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.12;
    this.ambientGain.connect(this.context.destination);

    // 1. Wind sound — filtered brown noise
    this.createWind();

    // 2. Subtle bird-like chirps — periodic oscillator bursts
    this.scheduleBirdChirps();
  }

  private createWind(): void {
    if (!this.context) return;

    // Generate brown noise buffer (wind-like)
    const sampleRate = this.context.sampleRate;
    const duration = 4; // seconds per loop
    const length = sampleRate * duration;
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise: integrate white noise
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5; // boost volume
    }

    this.windNode = this.context.createBufferSource();
    this.windNode.buffer = buffer;
    this.windNode.loop = true;

    // Low-pass filter to make it sound like wind through trees
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 280;
    lowpass.Q.value = 0.7;

    // Subtle LFO modulation on filter frequency for natural wind gusts
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15; // very slow modulation
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    lfo.start();

    // Secondary band-pass for a bit more "whoosh"
    const bandpass = this.context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 180;
    bandpass.Q.value = 1.2;

    this.windNode.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(this.ambientGain!);
    this.windNode.start();
  }

  private scheduleBirdChirps(): void {
    if (!this.context) return;

    const chirp = () => {
      if (!this.context || this.context.state !== 'running') {
        // Retry later
        setTimeout(chirp, 3000);
        return;
      }

      const now = this.context.currentTime;

      // Random chirp pattern: 2-4 quick notes
      const noteCount = 2 + Math.floor(Math.random() * 3);
      const baseFreq = 2200 + Math.random() * 1800;

      for (let i = 0; i < noteCount; i++) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        const noteOffset = i * (0.06 + Math.random() * 0.04);
        const freq = baseFreq + (Math.random() - 0.5) * 400;

        osc.frequency.setValueAtTime(freq, now + noteOffset);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + noteOffset + 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + noteOffset + 0.06);

        gain.gain.setValueAtTime(0.0001, now + noteOffset);
        gain.gain.exponentialRampToValueAtTime(0.025, now + noteOffset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + noteOffset + 0.08);

        osc.connect(gain).connect(this.ambientGain!);
        osc.start(now + noteOffset);
        osc.stop(now + noteOffset + 0.1);
      }

      // Schedule next chirp at random interval (2-8 seconds)
      const nextDelay = 2000 + Math.random() * 6000;
      setTimeout(chirp, nextDelay);
    };

    // Start first chirp after a short delay
    setTimeout(chirp, 1500 + Math.random() * 3000);
  }

  dispose(): void {
    this.ambientGain?.disconnect();
    this.ambientGain = null;

    try {
      this.windNode?.stop();
    } catch {
      // Already stopped
    }
    this.windNode = null;

    this.ambientStarted = false;
    void this.context?.close();
    this.context = null;
  }
}
