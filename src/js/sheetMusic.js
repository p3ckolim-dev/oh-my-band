import abcjs from 'abcjs';
import { PianoRoll } from './pianoRoll.js';

export class SheetMusicController {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.abcString = "";
    this.visualObj = null;
    this.notes = []; // Parsed note elements in order
    this.currentIndex = 0;
    
    // Performance stats
    this.notesPlayed = 0;
    this.correctNotesPlayed = 0;
    this.accuracy = 100;
    
    // Callbacks
    this.onTargetChanged = options.onTargetChanged || null; // fn(noteData)
    this.onStatsChanged = options.onStatsChanged || null;   // fn(accuracy, progressString, progressPercent)
    this.onSongFinished = options.onSongFinished || null;   // fn(finalStats)
    this.onMetronomeTick = options.onMetronomeTick || null; // fn(tickCount)
    this.onDemoPlayNote = options.onDemoPlayNote || null;   // fn(midi, durationMs)
    
    // Metronome Timing Engine
    this.isMetronomePlaying = false; // Unified metronome flag
    this.isTempoPlaying = false;     // Specific to Tempo Auto-Advance
    this.isDemoPlaying = false;      // Auto Play Demo flag
    this.tempoBPM = 80;
    this.tempoTimer = null;
    this.mode = "wait"; // 'wait' or 'tempo'
    
    // Metronome Sound details
    this.isMetronomeSoundOn = true;
    this.metronomeAudioCtx = null;
    this.metronomeTickCount = 0;
    
    // Track note window in Tempo Mode
    this.noteWindowPlayed = false;
    
    // Playback Cursor
    this.cursorEl = null;
  }

  setMode(mode) {
    this.mode = mode;
    this.stopMetronome();
  }

  setBPM(bpm) {
    this.tempoBPM = Number(bpm);
    if (this.isMetronomePlaying) {
      this.restartMetronomeTimer();
    }
  }

  setMetronomeSound(enabled) {
    this.isMetronomeSoundOn = Boolean(enabled);
  }

  render(abcString) {
    this.stopMetronome();
    this.stopDemoPlay();
    this.abcString = abcString;
    this.currentIndex = 0;
    this.notesPlayed = 0;
    this.correctNotesPlayed = 0;
    this.accuracy = 100;

    this.cursorEl = document.getElementById("playback-cursor");
    if (this.cursorEl) {
      this.cursorEl.classList.remove("active");
    }

    // Render music score as SVG
    this.visualObj = abcjs.renderAbc(this.containerId, this.abcString, {
      responsive: "resize",
      add_classes: true,
      scale: 1.1,
      paddingright: 15,
      paddingleft: 15
    });

    // Parse the actual notes inside the generated tune object
    this.parseNotes();
    this.updateStats();
    
    if (this.notes.length > 0) {
      this.highlightTargetNote();
    } else {
      console.warn("No notes parsed from ABC notation!");
    }
  }

  // Traverse abcjs tune AST to build sequential note index
  parseNotes() {
    this.notes = [];
    if (!this.visualObj || this.visualObj.length === 0) return;
    
    const tune = this.visualObj[0];
    const lines = tune.lines || [];
    
    for (const line of lines) {
      const staffs = line.staff || line.staffs || [];
      const staffsArray = Array.isArray(staffs) ? staffs : [staffs];
      
      for (const staff of staffsArray) {
        const voices = staff.voices || [];
        for (const voice of voices) {
          if (!Array.isArray(voice)) continue;
          
          for (const el of voice) {
            // Filter only elements representing playable notes
            if (el.el_type === "note" && el.pitches && el.pitches.length > 0) {
              const pitchObj = el.pitches[0];
              if (pitchObj.midipitch) {
                this.notes.push({
                  midi: pitchObj.midipitch,
                  name: PianoRoll.getNoteName(pitchObj.midipitch),
                  duration: el.duration || 1, // beat length multiplier
                  element: el
                });
              }
            }
          }
        }
      }
    }
  }

  // Core Practice Judgment Hook
  checkPlayedNote(midiNote) {
    if (this.notes.length === 0 || this.currentIndex >= this.notes.length) return null;

    const target = this.notes[this.currentIndex];
    
    if (this.mode === "wait") {
      this.notesPlayed++;
      
      if (midiNote === target.midi) {
        this.correctNotesPlayed++;
        this.markNoteElement("correct");
        
        this.currentIndex++;
        this.updateStats();
        
        if (this.currentIndex >= this.notes.length) {
          this.highlightTargetNote(); // clear
          this.stopMetronome();
          if (this.onSongFinished) {
            this.onSongFinished({
              accuracy: this.accuracy,
              totalNotes: this.notes.length
            });
          }
        } else {
          this.highlightTargetNote();
        }
        
        return { isMatch: true, targetNote: target };
      } else {
        this.markNoteElement("wrong");
        this.updateStats();
        return { isMatch: false, targetNote: target };
      }
    } 
    else if (this.mode === "tempo" && this.isTempoPlaying) {
      if (midiNote === target.midi) {
        if (!this.noteWindowPlayed) {
          this.noteWindowPlayed = true;
          this.correctNotesPlayed++;
          this.markNoteElement("correct");
          this.updateStats();
          return { isMatch: true, targetNote: target };
        }
      } else {
        this.markNoteElement("wrong");
        this.updateStats();
        return { isMatch: false, targetNote: target };
      }
    }
    
    return null;
  }

  // Highlight active note and advance SVG class styling
  highlightTargetNote() {
    const svgNotes = document.querySelectorAll(`#${this.containerId} .abcjs-note`);
    svgNotes.forEach(el => {
      el.classList.remove("abcjs-target");
    });

    if (this.currentIndex < this.notes.length) {
      const target = this.notes[this.currentIndex];
      
      if (svgNotes[this.currentIndex]) {
        const svgNote = svgNotes[this.currentIndex];
        svgNote.classList.add("abcjs-target");
        
        // Auto scroll to active note
        svgNote.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });

        // Update Playback Cursor position
        if (!this.cursorEl) {
          this.cursorEl = document.getElementById("playback-cursor");
        }
        if (this.cursorEl) {
          const container = document.getElementById(this.containerId);
          const card = container.closest(".sheet-music-card");
          
          if (card) {
            const noteRect = svgNote.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            
            // Calculate relative coordinates
            const relativeLeft = noteRect.left - cardRect.left + card.scrollLeft;
            const relativeTop = noteRect.top - cardRect.top + card.scrollTop;
            
            this.cursorEl.style.left = `${relativeLeft + noteRect.width / 2 - 2}px`;
            this.cursorEl.style.top = `${relativeTop - 5}px`;
            this.cursorEl.style.height = `${noteRect.height + 10}px`;
            this.cursorEl.classList.add("active");
          }
        }
      }
      
      if (this.onTargetChanged) {
        this.onTargetChanged(target);
      }
    } else {
      if (this.cursorEl) {
        this.cursorEl.classList.remove("active");
      }
      if (this.onTargetChanged) {
        this.onTargetChanged(null);
      }
    }
  }

  markNoteElement(status) {
    const svgNotes = document.querySelectorAll(`#${this.containerId} .abcjs-note`);
    const el = svgNotes[this.currentIndex];
    
    if (el) {
      if (status === "correct") {
        el.classList.remove("abcjs-played-wrong");
        el.classList.add("abcjs-played-correct");
      } else if (status === "wrong") {
        el.classList.add("abcjs-played-wrong");
        
        setTimeout(() => {
          el.classList.remove("abcjs-played-wrong");
        }, 600);
      }
    }
  }

  updateStats() {
    if (this.notesPlayed > 0) {
      this.accuracy = Math.round((this.correctNotesPlayed / this.notesPlayed) * 100);
    } else {
      this.accuracy = 100;
    }

    const progressStr = `${this.currentIndex} / ${this.notes.length}`;
    const progressPercent = this.notes.length > 0 
      ? Math.round((this.currentIndex / this.notes.length) * 100)
      : 0;

    if (this.onStatsChanged) {
      this.onStatsChanged(this.accuracy, progressStr, progressPercent);
    }
  }

  // --- UNIFIED METRONOME & AUDIO CLICK ENGINE ---

  playClickSound(isStrong) {
    if (!this.isMetronomeSoundOn) return;
    try {
      if (!this.metronomeAudioCtx) {
        this.metronomeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.metronomeAudioCtx.state === "suspended") {
        this.metronomeAudioCtx.resume();
      }
      
      const osc = this.metronomeAudioCtx.createOscillator();
      const gainNode = this.metronomeAudioCtx.createGain();
      
      osc.type = "sine";
      // First beat of measure has higher pitch
      osc.frequency.setValueAtTime(isStrong ? 1200 : 800, this.metronomeAudioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.12, this.metronomeAudioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.metronomeAudioCtx.currentTime + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(this.metronomeAudioCtx.destination);
      
      osc.start();
      osc.stop(this.metronomeAudioCtx.currentTime + 0.06);
    } catch (e) {
      console.warn("Metronome sound failed to play", e);
    }
  }

  startMetronome() {
    this.stopMetronome();
    this.isMetronomePlaying = true;
    this.metronomeTickCount = 0;
    
    if (this.mode === "wait") {
      this.waitModeMetronomeStep();
    } else if (this.mode === "tempo") {
      this.currentIndex = 0;
      this.notesPlayed = 0;
      this.correctNotesPlayed = 0;
      this.accuracy = 100;
      this.updateStats();
      this.highlightTargetNote();
      
      this.isTempoPlaying = true;
      this.tempoModeMetronomeStep();
    }
  }

  stopMetronome() {
    this.isMetronomePlaying = false;
    this.isTempoPlaying = false;
    if (this.tempoTimer) {
      clearTimeout(this.tempoTimer);
      this.tempoTimer = null;
    }
  }

  restartMetronomeTimer() {
    if (this.tempoTimer) clearTimeout(this.tempoTimer);
    if (this.mode === "wait") {
      this.waitModeMetronomeStep();
    } else {
      this.tempoModeMetronomeStep();
    }
  }

  // Wait Mode Metronome: steady background ticking only, no progression
  waitModeMetronomeStep() {
    if (!this.isMetronomePlaying || this.mode !== "wait") return;
    
    const isStrong = (this.metronomeTickCount % 4 === 0);
    this.playClickSound(isStrong);
    
    if (this.onMetronomeTick) {
      this.onMetronomeTick(this.metronomeTickCount);
    }
    
    this.metronomeTickCount++;
    const intervalMs = 60000 / this.tempoBPM;
    
    this.tempoTimer = setTimeout(() => {
      this.waitModeMetronomeStep();
    }, intervalMs);
  }

  // Tempo Mode Metronome: steady ticking AND automatic sheet music note progression
  tempoModeMetronomeStep() {
    if (!this.isMetronomePlaying || !this.isTempoPlaying || this.mode !== "tempo") return;

    if (this.currentIndex >= this.notes.length) {
      this.stopMetronome();
      if (this.onSongFinished) {
        this.onSongFinished({
          accuracy: this.accuracy,
          totalNotes: this.notes.length
        });
      }
      return;
    }

    const targetNote = this.notes[this.currentIndex];
    
    const isStrong = (this.currentIndex % 4 === 0);
    this.playClickSound(isStrong);
    
    if (this.onMetronomeTick) {
      this.onMetronomeTick(this.currentIndex);
    }
    
    this.noteWindowPlayed = false;
    this.notesPlayed++; // missed is counted

    // Beat length timing window
    const durationMs = (targetNote.duration * 60000) / this.tempoBPM;
    
    this.tempoTimer = setTimeout(() => {
      if (!this.noteWindowPlayed) {
        this.markNoteElement("wrong");
      }
      
      this.currentIndex++;
      this.updateStats();
      this.highlightTargetNote();
      
      this.tempoModeMetronomeStep();
    }, durationMs);
  }

  // --- AUTO-PLAY DEMO ENGINE ---
  startDemoPlay() {
    this.stopMetronome();
    this.stopDemoPlay();
    
    this.isDemoPlaying = true;
    this.currentIndex = 0;
    this.notesPlayed = 0;
    this.correctNotesPlayed = 0;
    this.accuracy = 100;
    
    this.updateStats();
    this.highlightTargetNote();
    
    this.demoPlayStep();
  }

  stopDemoPlay() {
    this.isDemoPlaying = false;
    if (this.tempoTimer) {
      clearTimeout(this.tempoTimer);
      this.tempoTimer = null;
    }
    if (this.cursorEl) {
      this.cursorEl.classList.remove("active");
    }
  }

  demoPlayStep() {
    if (!this.isDemoPlaying) return;
    
    if (this.currentIndex >= this.notes.length) {
      this.stopDemoPlay();
      if (this.onSongFinished) {
        this.onSongFinished({
          accuracy: 100,
          totalNotes: this.notes.length,
          isDemo: true
        });
      }
      return;
    }

    const targetNote = this.notes[this.currentIndex];
    const isStrong = (this.currentIndex % 4 === 0);
    this.playClickSound(isStrong);
    
    if (this.onMetronomeTick) {
      this.onMetronomeTick(this.currentIndex);
    }
    
    const durationMs = (targetNote.duration * 60000) / this.tempoBPM;

    // Trigger demo play callback to main.js for virtual piano rolls
    if (this.onDemoPlayNote) {
      this.onDemoPlayNote(targetNote.midi, durationMs);
    }
    
    this.markNoteElement("correct"); // Visual neon green correct tick in demo
    
    this.tempoTimer = setTimeout(() => {
      this.currentIndex++;
      this.updateStats();
      this.highlightTargetNote();
      this.demoPlayStep();
    }, durationMs);
  }
}
