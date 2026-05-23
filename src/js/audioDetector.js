// Audio Pitch Detector using Autocorrelation Algorithm
// Converts microphone audio stream to MIDI notes in real-time

export class AudioDetector {
  constructor(onNoteDetected, onVolumeChanged) {
    this.onNoteDetected = onNoteDetected; // callback(midiNote)
    this.onVolumeChanged = onVolumeChanged; // callback(rmsPercentage)
    
    this.audioCtx = null;
    this.stream = null;
    this.analyser = null;
    this.source = null;
    
    this.isListening = false;
    this.sensitivity = 35; // 0 to 100 noise filter gate scale
    this.bufferSize = 2048; // Standard buffer size for 44.1/48kHz to resolve lower frequencies (C3 ~ 130Hz)
    this.buffer = new Float32Array(this.bufferSize);
    
    // Pitch stability filter variables
    this.lastDetectedNote = -1;
    this.consecutiveHits = 0;
    this.requiredHits = 3; // Number of stable frames needed to trigger a note change
  }

  setSensitivity(val) {
    this.sensitivity = Number(val);
  }

  /**
   * Check current microphone permission state using the Permissions API.
   * Returns 'granted', 'denied', 'prompt', or 'unknown' if API is unsupported.
   */
  static async checkPermission() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        return result.state; // 'granted' | 'denied' | 'prompt'
      }
    } catch (e) {
      // Some browsers don't support querying 'microphone' permission
      console.warn("Permissions API query for microphone not supported:", e);
    }
    return 'unknown';
  }

  async start() {
    if (this.isListening) return;
    
    // Reuse AudioContext if it exists, or create only if null/closed
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // Disable AGC to preserve key dynamics and avoid noise amplification
        }
      });
      
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      
      // Ensure context is running (comply with modern browser policies)
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      
      this.isListening = true;
      this.lastDetectedNote = -1;
      this.consecutiveHits = 0;
      this.tick();
      
      return true;
    } catch (e) {
      console.error("Microphone access failed:", e);
      this.isListening = false;
      throw e;
    }
  }

  async stop() {
    this.isListening = false;
    
    // Stop tracks to release mic hardware immediately
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // DO NOT close AudioContext to prevent exceeding tab limits on Chromium.
    // Suspend it instead to save CPU power.
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        await this.audioCtx.suspend();
      } catch (err) {
        console.warn("Failed to suspend AudioContext:", err);
      }
    }
    
    this.analyser = null;
    this.source = null;
  }

  tick() {
    if (!this.isListening || !this.analyser) return;

    // Get time-domain data for autocorrelation pitch detection
    this.analyser.getFloatTimeDomainData(this.buffer);
    
    // 1. Calculate Root-Mean-Square (RMS) volume
    let sum = 0;
    for (let i = 0; i < this.bufferSize; i++) {
      sum += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sum / this.bufferSize);
    
    // Scale RMS to a 0-100 percentage for UI calibration display
    const rmsPercentage = Math.min(Math.round(rms * 400), 100);
    if (this.onVolumeChanged) {
      this.onVolumeChanged(rmsPercentage);
    }
    
    // 2. Noise Gate: Filter out noise based on user sensitivity setting
    // Sensitivity scale: 0 (extremely sensitive) to 100 (needs very loud input)
    // Map sensitivity to dynamic threshold (e.g. 0.005 to 0.15)
    const minRmsThreshold = 0.005 + (this.sensitivity / 100) * 0.12;
    
    if (rms > minRmsThreshold) {
      // 3. Autocorrelation Algorithm
      const pitch = this.autoCorrelate(this.buffer, this.audioCtx.sampleRate);
      
      if (pitch !== -1) {
        // Convert Frequency (Hz) to MIDI Note
        // n = 12 * log2(f/440) + 69
        const midiNote = Math.round(12 * Math.log2(pitch / 440) + 69);
        
        // Ensure note falls in reasonable piano practicing range: C2 (36) to C7 (96)
        if (midiNote >= 36 && midiNote <= 96) {
          // Pitch stability filtering
          if (midiNote === this.lastDetectedNote) {
            this.consecutiveHits++;
            if (this.consecutiveHits === this.requiredHits) {
              if (this.onNoteDetected) {
                this.onNoteDetected(midiNote);
              }
            }
          } else {
            this.lastDetectedNote = midiNote;
            this.consecutiveHits = 1;
          }
        }
      } else {
        this.consecutiveHits = 0;
      }
    } else {
      this.consecutiveHits = 0;
    }

    requestAnimationFrame(() => this.tick());
  }

  // Pure autocorrelation fundamental frequency estimator
  autoCorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    
    // 1. Calculate Signal RMS to ensure we have enough data (already done, but double check)
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.005;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; }
      else { break; }
    }
    for (let i = SIZE - 1; i >= SIZE / 2; i--) {
      if (Math.abs(buffer[i]) < thres) { r2 = i; }
      else { break; }
    }
    if (r1 >= r2) return -1; // Buffer too silent

    // Crop silent parts
    const buf = buffer.subarray(r1, r2);
    const len = buf.length;
    
    // 2. Perform Autocorrelation
    const r = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let sum = 0;
      for (let j = 0; j < len - i; j++) {
        sum += buf[j] * buf[j + i];
      }
      r[i] = sum;
    }
    
    // 3. Find the peak matching our expected pitch range
    // Pitch range limits: C3 (130Hz) to C6 (1046Hz)
    // Map to period limits: sampleRate / pitch
    const maxPeriod = Math.round(sampleRate / 100);  // ~100Hz max limit
    const minPeriod = Math.round(sampleRate / 1200); // ~1200Hz min limit
    
    // Start searching for local maxima after the initial center peak
    let peakOffset = -1;
    let peakValue = -1;
    
    // Find where autocorrelation starts going down from the center (tau = 0)
    let d = 0;
    while (d < len - 1 && r[d] > r[d + 1]) {
      d++;
    }
    
    // Look for first major peak after the initial descent
    let maxVal = -1;
    let maxPos = -1;
    
    for (let i = d; i < len; i++) {
      // Check if inside our period boundaries
      if (i >= minPeriod && i <= maxPeriod) {
        if (r[i] > maxVal) {
          maxVal = r[i];
          maxPos = i;
        }
      }
    }
    
    // If a clear peak is found and it is sufficiently strong compared to the absolute peak at 0
    if (maxPos !== -1 && maxVal > r[0] * 0.15) {
      // High-precision sub-sample interpolation (parabolic fit) to refine frequency estimate
      let x1 = r[maxPos - 1];
      let x2 = r[maxPos];
      let x3 = r[maxPos + 1];
      
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      
      let refinedPeriod = maxPos;
      if (a !== 0) {
        refinedPeriod = maxPos - b / (2 * a);
      }
      
      return sampleRate / refinedPeriod;
    }
    
    return -1;
  }
}
