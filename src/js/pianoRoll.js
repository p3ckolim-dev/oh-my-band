// Virtual Piano Roll Controller
// Range: C3 (MIDI 48) to C6 (MIDI 84)

const START_NOTE = 48; // C3
const END_NOTE = 84;   // C6

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export class PianoRoll {
  constructor(containerId, onKeyTriggered) {
    this.container = document.getElementById(containerId);
    this.onKeyTriggered = onKeyTriggered; // Callback when a virtual key is clicked/held
    this.audioCtx = null;
    this.activeOscillators = {}; // Keep track of playing virtual notes
    
    this.initKeyboard();
  }

  // Convert MIDI note number to Note Name (e.g. 60 -> C4)
  static getNoteName(note) {
    const oct = Math.floor(note / 12) - 1;
    const name = NOTE_NAMES[note % 12];
    return `${name}${oct}`;
  }

  // Determine if MIDI note is a black key
  static isBlackKey(note) {
    const pc = note % 12;
    return [1, 3, 6, 8, 10].includes(pc);
  }

  initKeyboard() {
    this.container.innerHTML = "";
    
    for (let note = START_NOTE; note <= END_NOTE; note++) {
      const isBlack = PianoRoll.isBlackKey(note);
      const keyEl = document.createElement("div");
      keyEl.classList.add("piano-key", isBlack ? "black" : "white");
      keyEl.dataset.note = note;
      
      // Label only white C keys to keep it clean, and Middle C (C4)
      if (!isBlack) {
        const noteName = PianoRoll.getNoteName(note);
        if (noteName.startsWith("C")) {
          const label = document.createElement("span");
          label.classList.add("piano-key-label");
          label.textContent = noteName;
          keyEl.appendChild(label);
        }
      }
      
      // Set up click & touch events to play synth sounds
      keyEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.triggerNoteStart(note);
      });
      keyEl.addEventListener("mouseup", () => this.triggerNoteEnd(note));
      keyEl.addEventListener("mouseleave", () => this.triggerNoteEnd(note));
      
      keyEl.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.triggerNoteStart(note);
      }, { passive: false });
      keyEl.addEventListener("touchend", () => this.triggerNoteEnd(note));

      this.container.appendChild(keyEl);
    }
  }

  // Synth triggers
  triggerNoteStart(note) {
    this.playSynthSound(note);
    this.highlightPlay(note, null); // Default interactive play
    if (this.onKeyTriggered) {
      this.onKeyTriggered(note);
    }
  }

  triggerNoteEnd(note) {
    this.stopSynthSound(note);
    this.releasePlay(note);
  }

  // Highlight key when user plays it (from Mic or MIDI or Click)
  // status: 'correct', 'wrong', or null (neutral)
  highlightPlay(note, status) {
    const keyEl = this.container.querySelector(`.piano-key[data-note="${note}"]`);
    if (keyEl) {
      keyEl.classList.add("active");
      if (status === "correct") {
        keyEl.classList.add("correct");
        keyEl.classList.remove("wrong");
      } else if (status === "wrong") {
        keyEl.classList.add("wrong");
        keyEl.classList.remove("correct");
      } else {
        keyEl.classList.remove("correct", "wrong");
      }
    }
  }

  // Release highlighted key
  releasePlay(note) {
    const keyEl = this.container.querySelector(`.piano-key[data-note="${note}"]`);
    if (keyEl) {
      keyEl.classList.remove("active", "correct", "wrong");
    }
  }

  // Highlight the target key in orange that the user is supposed to play next
  highlightTarget(note) {
    this.clearTargets();
    const keyEl = this.container.querySelector(`.piano-key[data-note="${note}"]`);
    if (keyEl) {
      keyEl.classList.add("target");
    }
  }

  // Clear all target highlights
  clearTargets() {
    const targets = this.container.querySelectorAll(".piano-key.target");
    targets.forEach(el => el.classList.remove("target"));
  }

  // --- Synth Sound Engine (Web Audio) ---
  lazyInitAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Convert MIDI note to frequency in Hz
  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  playSynthSound(note) {
    try {
      this.lazyInitAudio();
      this.stopSynthSound(note); // Stop if already playing

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      // Soft triangle wave for retro piano-like warm tone
      osc.type = "triangle"; 
      osc.frequency.setValueAtTime(this.midiToFreq(note), this.audioCtx.currentTime);

      // Volume envelope to prevent popping and simulate decay
      gainNode.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 1.2);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.start();

      this.activeOscillators[note] = { osc, gainNode };
    } catch (e) {
      console.warn("Synth failed to start", e);
    }
  }

  stopSynthSound(note) {
    const active = this.activeOscillators[note];
    if (active) {
      try {
        const { osc, gainNode } = active;
        // Fade out quickly to avoid clicks
        gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
        setTimeout(() => {
          try { osc.stop(); } catch (err) {}
        }, 100);
      } catch (err) {}
      delete this.activeOscillators[note];
    }
  }
}
