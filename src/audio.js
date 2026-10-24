/**
 * Web Audio API Sound Synthesizer for Fruit Duel
 * Zero external dependencies - ultra fast, zero latency sound effects & playful BGM.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = false;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.35;
    this.bgmTimer = null;
    this.bgmGain = null;
    this.isPlayingBGM = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Sound Effects ---

  // Blade swoosh & crisp slice
  playSlice() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Whoosh noise
    const bufferSize = this.ctx.sampleRate * 0.12;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
    filter.Q.setValueAtTime(3, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4 * this.sfxVolume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.12);

    // Sharp blade resonance
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.09);

    oscGain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Juicy fruit squish / splat
  playSplat() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);

    gain.gain.setValueAtTime(0.6 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Rising melodic chime for combos
  playCombo(combo = 1) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760]; // A major arpeggio
    const note = notes[Math.min(combo - 1, notes.length - 1)];

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, t);

    gain.gain.setValueAtTime(0.45 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Low ominous hum when poison fruit is active
  playPoisonWarn() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.2);

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Poison sliced - catastrophic buzzer + boom
  playPoisonExplosion() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy bass boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.6);

    gain.gain.setValueAtTime(0.8 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);

    // Dissonant toxic buzz
    const buzz = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();
    buzz.type = 'square';
    buzz.frequency.setValueAtTime(82, t);
    buzz.frequency.linearRampToValueAtTime(65, t + 0.45);

    buzzGain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    buzz.connect(buzzGain);
    buzzGain.connect(this.ctx.destination);

    buzz.start(t);
    buzz.stop(t + 0.5);
  }

  // Bubbly UI button click
  playClick() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

    gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Countdown sound (3, 2, 1, GO)
  playCountdown(count) {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (count > 0) {
      // Woodblock tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);

      gain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      // GO! - fanfare chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    }
  }

  // Victory fanfare
  playVictory() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.14 }, // G5
      { f: 1046.50, d: 0.35 } // C6
    ];

    let currentOffset = 0;
    const baseTime = this.ctx.currentTime;

    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, baseTime + currentOffset);

      gain.gain.setValueAtTime(0.4 * this.sfxVolume, baseTime + currentOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + currentOffset + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(baseTime + currentOffset);
      osc.stop(baseTime + currentOffset + note.d + 0.05);

      currentOffset += note.d * 0.9;
    });
  }

  // --- Cheerful Pastoral Chiptune BGM ---
  startBGM() {
    if (!this.musicEnabled || this.isPlayingBGM) return;
    this.init();
    if (!this.ctx) return;

    this.isPlayingBGM = true;
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    const sequence = [
      0, 2, 4, 2, 3, 4, 5, 4,
      0, 2, 4, 3, 2, 1, 0, 2,
      4, 5, 7, 5, 4, 3, 2, 4,
      3, 2, 1, 2, 0, 2, 4, 0
    ];

    let step = 0;
    const tempo = 170; // ms per note

    const playStep = () => {
      if (!this.isPlayingBGM || !this.ctx) return;

      const t = this.ctx.currentTime;
      const freq = scale[sequence[step % sequence.length]];

      // Soft pluck synthesizer
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = step % 4 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08 * this.musicVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);

      step++;
      this.bgmTimer = setTimeout(playStep, tempo);
    };

    playStep();
  }

  stopBGM() {
    this.isPlayingBGM = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.musicEnabled;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }
}

export const sound = new SoundEngine();
