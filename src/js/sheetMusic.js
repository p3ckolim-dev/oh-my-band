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
    
    // Tempo Mode Metronome
    this.isTempoPlaying = false;
    this.tempoBPM = 80;
    this.tempoTimer = null;
    this.mode = "wait"; // 'wait' or 'tempo'
    
    // Track note window in Tempo Mode
    this.noteWindowPlayed = false;
    this.playedNotesInWindow = [];
  }

  setMode(mode) {
    this.mode = mode;
    this.stopTempoMode();
  }

  setBPM(bpm) {
    this.tempoBPM = Number(bpm);
    if (this.isTempoPlaying) {
      this.restartTempoTimer();
    }
  }

  render(abcString) {
    this.stopTempoMode();
    this.abcString = abcString;
    this.currentIndex = 0;
    this.notesPlayed = 0;
    this.correctNotesPlayed = 0;
    this.accuracy = 100;

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
              // midipitch contains standard MIDI note number (60 for middle C)
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
  // Triggered when user plays a note (from Mic or MIDI or Click)
  // returns: { isMatch, targetNote }
  checkPlayedNote(midiNote) {
    if (this.notes.length === 0 || this.currentIndex >= this.notes.length) return null;

    const target = this.notes[this.currentIndex];
    
    if (this.mode === "wait") {
      this.notesPlayed++;
      
      if (midiNote === target.midi) {
        // Correct pitch matching!
        this.correctNotesPlayed++;
        this.markNoteElement("correct");
        
        this.currentIndex++;
        this.updateStats();
        
        if (this.currentIndex >= this.notes.length) {
          // Finished!
          this.highlightTargetNote(); // clear
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
        // Wrong note!
        this.markNoteElement("wrong");
        this.updateStats();
        return { isMatch: false, targetNote: target };
      }
    } 
    else if (this.mode === "tempo" && this.isTempoPlaying) {
      // Tempo mode checks if note is correct during its active window
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
    // Reset all notes
    const svgNotes = document.querySelectorAll(`#${this.containerId} .abcjs-note`);
    svgNotes.forEach(el => {
      el.classList.remove("abcjs-target");
    });

    if (this.currentIndex < this.notes.length) {
      const target = this.notes[this.currentIndex];
      
      // Select the SVG note elements in the page
      // Note index mapping works 1:1 for basic melodies
      if (svgNotes[this.currentIndex]) {
        svgNotes[this.currentIndex].classList.add("abcjs-target");
        
        // Auto scroll to active note if sheet music is long and overflows
        svgNotes[this.currentIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
      
      if (this.onTargetChanged) {
        this.onTargetChanged(target);
      }
    } else {
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
        
        // Remove wrong flash after a brief interval so user can try again
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

  // --- TEMPO MODE METRONOME ENGINE ---
  startTempoMode() {
    if (this.mode !== "tempo") return;
    this.currentIndex = 0;
    this.notesPlayed = 0;
    this.correctNotesPlayed = 0;
    this.accuracy = 100;
    this.updateStats();
    
    this.isTempoPlaying = true;
    this.highlightTargetNote();
    this.restartTempoTimer();
  }

  stopTempoMode() {
    this.isTempoPlaying = false;
    if (this.tempoTimer) {
      clearTimeout(this.tempoTimer);
      this.tempoTimer = null;
    }
  }

  restartTempoTimer() {
    if (this.tempoTimer) clearTimeout(this.tempoTimer);
    this.tempoStep();
  }

  tempoStep() {
    if (!this.isTempoPlaying || this.currentIndex >= this.notes.length) {
      this.stopTempoMode();
      if (this.currentIndex >= this.notes.length && this.onSongFinished) {
        this.onSongFinished({
          accuracy: this.accuracy,
          totalNotes: this.notes.length
        });
      }
      return;
    }

    const targetNote = this.notes[this.currentIndex];
    
    // Metronome tick callback for visual pulse
    if (this.onMetronomeTick) {
      this.onMetronomeTick(this.currentIndex);
    }
    
    // Reset window flags
    this.noteWindowPlayed = false;
    this.notesPlayed++; // Note counted as played (even if missed)

    // Calculate duration in ms: (duration * 60000) / BPM
    const durationMs = (targetNote.duration * 60000) / this.tempoBPM;
    
    this.tempoTimer = setTimeout(() => {
      // If user failed to play the note in this window, mark it as missed
      if (!this.noteWindowPlayed) {
        this.markNoteElement("wrong");
      }
      
      this.currentIndex++;
      this.updateStats();
      this.highlightTargetNote();
      
      this.tempoStep();
    }, durationMs);
  }
}
