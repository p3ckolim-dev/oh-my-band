// Oh My Band - Drum Audio Sampler & Synthesizer
// Loads high-quality sample files or falls back to Web Audio synthesis if offline.

const SAMPLE_URLS = {
  kick: "https://raw.githubusercontent.com/ArunMichaelDsouza/javascript-30-drum-kit/master/sounds/kick.wav",
  snare: "https://raw.githubusercontent.com/ArunMichaelDsouza/javascript-30-drum-kit/master/sounds/snare.wav",
  hihat: "https://raw.githubusercontent.com/ArunMichaelDsouza/javascript-30-drum-kit/master/sounds/hihat.wav",
  tom: "https://raw.githubusercontent.com/ArunMichaelDsouza/javascript-30-drum-kit/master/sounds/tom.wav",
  crash: "https://raw.githubusercontent.com/ArunMichaelDsouza/javascript-30-drum-kit/master/sounds/ride.wav"
};

export class DrumAudio {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.loaded = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.createNoiseBuffer();
    this.preloadSamples();
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  async preloadSamples() {
    this.init();
    const promises = Object.keys(SAMPLE_URLS).map(async (key) => {
      try {
        const response = await fetch(SAMPLE_URLS[key]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers[key] = audioBuffer;
        console.log(`Drum sample [${key}] loaded successfully.`);
      } catch (err) {
        console.warn(`Failed to load drum sample [${key}]. Synthesizer fallback will be used.`, err);
      }
    });

    await Promise.all(promises);
    this.loaded = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  play(type) {
    this.init();
    this.resume();

    // If real sample is loaded, play it!
    if (this.buffers[type]) {
      this.playSample(type);
    } else {
      // Otherwise fallback to synthesized sound
      this.playSynth(type);
    }
  }

  playSample(type) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[type];
    source.connect(this.ctx.destination);
    source.start(0);
  }

  playSynth(type) {
    switch (type) {
      case "kick":
        this.synthKick();
        break;
      case "snare":
        this.synthSnare();
        break;
      case "hihat":
        this.synthHihat();
        break;
      case "tom":
        this.synthTom();
        break;
      case "crash":
        this.synthCrash();
        break;
    }
  }

  // --- Web Audio Synthesizers ---

  synthKick() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Deep pitch sweep (sine wave)
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    // Gain envelope
    gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.16);
  }

  synthSnare() {
    const now = this.ctx.currentTime;
    
    // Snare snap: Noise passband
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // Snare tone: Low sine punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.25);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  synthHihat() {
    const now = this.ctx.currentTime;
    
    // High-pitched filtered white noise
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + 0.08);
  }

  synthTom() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Tom tone sweep
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(85, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.21);
  }

  synthCrash() {
    const now = this.ctx.currentTime;
    
    // Sizzling long white noise decay
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1500;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + 1.3);
  }
}
