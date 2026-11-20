// Procedural Web Audio API sound effects & dojo background music synthesizer
class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private lastSwipeAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
    if (this.musicEnabled && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  public setSettings(soundEnabled: boolean, musicEnabled: boolean) {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (musicEnabled) {
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    this.playTone(620, 440, 0.055, 'triangle', 0.09);
  }

  public playSwipe() {
    if (!this.soundEnabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastSwipeAt < 95) return;
    this.lastSwipeAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    // Short filtered noise whoosh
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playSlice(fruitRadius = 34) {
    const pitchBase = Math.max(360, 760 - fruitRadius * 7);
    this.playTone(pitchBase, pitchBase * 1.45, 0.09, 'sine', 0.14);
    this.playTone(pitchBase * 0.65, 190, 0.11, 'triangle', 0.1);
  }

  public playCombo(comboSize: number) {
    const base = 440 + Math.min(comboSize, 7) * 55;
    this.playTone(base, base * 1.12, 0.12, 'triangle', 0.14, 0);
    this.playTone(base * 1.25, base * 1.5, 0.16, 'sine', 0.15, 0.055);
    this.playTone(base * 1.5, base * 2, 0.22, 'sine', 0.12, 0.11);
  }

  public playCoin() {
    this.playTone(1046.5, 1318.5, 0.07, 'sine', 0.1, 0);
    this.playTone(1318.5, 1568, 0.14, 'sine', 0.1, 0.06);
  }

  public playPowerUp() {
    this.playTone(392, 523.25, 0.1, 'triangle', 0.13, 0);
    this.playTone(523.25, 659.25, 0.11, 'triangle', 0.13, 0.07);
    this.playTone(659.25, 1046.5, 0.2, 'sine', 0.14, 0.14);
  }

  public playBombExplosion() {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.playTone(160, 35, 0.45, 'sawtooth', 0.22, 0);

    const bufferSize = Math.floor(ctx.sampleRate * 0.42);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.42);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playLevelComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.18, 'triangle', 0.14, idx * 0.09);
    });
  }

  public playGameOver() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.94, 0.22, 'sawtooth', 0.09, idx * 0.12);
    });
  }

  public playChestOpen() {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.16, 'sine', 0.12, idx * 0.07);
    });
  }

  private startMusicLoop() {
    if (this.musicTimer !== null || !this.musicEnabled) return;
    if (typeof window === 'undefined') return;

    // Gentle Japanese Hirajoshi / Pentatonic dojo rhythm
    const scale = [220, 246.94, 293.66, 329.63, 440, 329.63, 293.66, 246.94];
    const bass = [110, 110, 146.83, 146.83, 164.81, 164.81, 146.83, 110];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const idx = this.musicStep % scale.length;

      // Soft plucked koto-like note
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(scale[idx], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.44);

      if (this.musicStep % 2 === 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bass[idx], now);
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.028, now + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.68);
      }

      this.musicStep++;
    }, 360);
  }

  public stopMusicLoop() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audioEngine = new AudioEngine();
