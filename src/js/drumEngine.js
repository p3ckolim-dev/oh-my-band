// Oh My Band - Scrolling 5-Lane Drum Rhythm Game Engine
// Manages notes scrolling, dual practice modes (Wait / Tempo), collisions, and canvas drawing.

const LANE_COLORS = {
  crash: "#8a2be2", // Purple
  hihat: "#ff7b00", // Orange
  tom: "#39ff14",   // Neon Green
  snare: "#ff3366", // Neon Red
  kick: "#00f0ff"   // Neon Cyan
};

const LANES_ORDER = ["crash", "hihat", "tom", "snare", "kick"];

export class DrumEngine {
  constructor(canvasId, drumAudio, callbacks) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.drumAudio = drumAudio;
    
    // Callbacks
    this.onTargetChanged = callbacks.onTargetChanged || (() => {});
    this.onStatsChanged = callbacks.onStatsChanged || (() => {});
    this.onSongFinished = callbacks.onSongFinished || (() => {});
    this.onMetronomeTick = callbacks.onMetronomeTick || (() => {});

    // State variables
    this.song = null;
    this.practiceMode = "wait"; // "wait" or "tempo"
    this.bpm = 90;
    this.isMetronomeSoundOn = true;
    this.isPlaying = false;
    
    // Game loop timing
    this.currentBeat = 0;
    this.lastTime = 0;
    this.pixelsPerBeat = 180; // horizontal speed
    this.judgmentLineX = 120; // X position where notes must be hit
    
    // Game stats
    this.score = 0;
    this.notesList = []; // flat list of note events
    this.playedNotesCount = 0;
    this.totalNotesCount = 0;
    this.accuracySum = 0;
    
    // Last metronome beat tracked
    this.lastMetronomeBeat = -1;
    
    // Ratings DOM cache
    this.ratingTextEl = document.getElementById("drum-rating-text");
    this.ratingTimeout = null;

    // Handle high DPI displays
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = 240 * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `240px`;
  }

  loadSong(song, practiceMode, bpm, isMetronomeSoundOn) {
    this.song = song;
    this.practiceMode = practiceMode;
    this.bpm = bpm || song.tempo;
    this.isMetronomeSoundOn = isMetronomeSoundOn;
    
    this.currentBeat = 1.0; // Start at beat 1
    this.lastMetronomeBeat = 0;
    this.playedNotesCount = 0;
    this.accuracySum = 0;
    this.isPlaying = false;

    // Build notes list from song
    this.notesList = song.notes.map((n, index) => ({
      id: index,
      beat: n.beat,
      type: n.type,
      played: false,
      rating: null, // "perfect", "great", "good", "miss"
      color: LANE_COLORS[n.type]
    }));
    
    this.totalNotesCount = this.notesList.length;
    this.updateStatsHUD();
    this.draw();
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.drumAudio.resume();
    
    // Update Play Button State
    const btnPlay = document.getElementById("btn-play-pause-tempo");
    if (btnPlay) {
      btnPlay.textContent = "⏸ 연습 일시정지 (Space)";
      btnPlay.className = "btn btn-primary btn-play active";
    }

    this.gameLoop();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    
    // Update Play Button State
    const btnPlay = document.getElementById("btn-play-pause-tempo");
    if (btnPlay) {
      btnPlay.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Space)" : "▶ 연습 시작 (Space)";
      btnPlay.className = "btn btn-primary btn-play";
    }
  }

  gameLoop() {
    if (!this.isPlaying) return;
    
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000; // seconds elapsed
    this.lastTime = now;
    
    this.update(dt);
    this.draw();
    
    requestAnimationFrame(() => this.gameLoop());
  }

  update(dt) {
    if (this.practiceMode === "wait") {
      // WAIT MODE
      // Find the first unplayed note
      const firstUnplayed = this.notesList.find(n => !n.played);
      
      if (firstUnplayed) {
        // Broadcast the currently expected drum hit
        this.onTargetChanged({ name: firstUnplayed.type.toUpperCase(), midi: firstUnplayed.type });

        // Scroll forward toward the note's beat
        if (this.currentBeat < firstUnplayed.beat) {
          const beatsPerSecond = this.bpm / 60;
          this.currentBeat += dt * beatsPerSecond;
          
          // Keep it capped exactly at the note's beat so it pauses
          if (this.currentBeat >= firstUnplayed.beat) {
            this.currentBeat = firstUnplayed.beat;
          }
        }
      } else {
        // No unplayed notes left, finish the song!
        this.currentBeat += dt * (this.bpm / 60);
        if (this.currentBeat >= this.song.maxBeat) {
          this.finish();
        }
      }
    } else {
      // TEMPO MODE: continuous scrolling based on BPM
      const beatsPerSecond = this.bpm / 60;
      this.currentBeat += dt * beatsPerSecond;
      
      // Auto-miss notes that passed the judgment line too far
      this.notesList.forEach(n => {
        if (!n.played && n.beat < this.currentBeat - 0.35) {
          n.played = true;
          n.rating = "miss";
          this.triggerRating("miss");
          this.playedNotesCount++;
          this.updateStatsHUD();
        }
      });

      // Update next expected notes
      const nextNote = this.notesList.find(n => !n.played);
      if (nextNote) {
        this.onTargetChanged({ name: nextNote.type.toUpperCase(), midi: nextNote.type });
      } else {
        this.onTargetChanged(null);
      }

      // Check if song has completed
      if (this.currentBeat >= this.song.maxBeat) {
        this.finish();
      }
    }

    // Metronome tick logic
    const currentIntBeat = Math.floor(this.currentBeat);
    if (currentIntBeat > this.lastMetronomeBeat) {
      this.lastMetronomeBeat = currentIntBeat;
      this.onMetronomeTick(currentIntBeat);
    }
  }

  // Handle a user hit event (keyboard, mouse or MIDI)
  hit(type) {
    if (!this.isPlaying || !this.song) {
      // Play sound even if not playing for sandbox feeling
      this.drumAudio.play(type);
      return;
    }

    // Always play sound
    this.drumAudio.play(type);

    if (this.practiceMode === "wait") {
      // WAIT MODE collision
      // Find the first unplayed note
      const targetNote = this.notesList.find(n => !n.played);
      if (targetNote) {
        if (targetNote.type === type) {
          // HIT!
          targetNote.played = true;
          targetNote.rating = "perfect";
          this.triggerRating("perfect");
          this.playedNotesCount++;
          this.accuracySum += 100;
          this.updateStatsHUD();
        } else {
          // Miss/Wrong hit (we don't count wrong drum hit as miss to avoid double penalty, just let them retry)
        }
      }
    } else {
      // TEMPO MODE collision
      // Find the closest unplayed note in this specific lane
      const laneNotes = this.notesList.filter(n => n.type === type && !n.played);
      if (laneNotes.length > 0) {
        // Sort by proximity to current beat
        laneNotes.sort((a, b) => Math.abs(a.beat - this.currentBeat) - Math.abs(b.beat - this.currentBeat));
        const closestNote = laneNotes[0];
        const diff = Math.abs(closestNote.beat - this.currentBeat);
        
        if (diff <= 0.35) {
          closestNote.played = true;
          this.playedNotesCount++;
          
          let scorePercent = 0;
          if (diff <= 0.1) {
            closestNote.rating = "perfect";
            scorePercent = 100;
          } else if (diff <= 0.22) {
            closestNote.rating = "great";
            scorePercent = 85;
          } else {
            closestNote.rating = "good";
            scorePercent = 60;
          }
          
          this.accuracySum += scorePercent;
          this.triggerRating(closestNote.rating);
          this.updateStatsHUD();
        }
      }
    }
  }

  triggerRating(rating) {
    if (!this.ratingTextEl) return;
    
    // Cancel previous transitions
    this.ratingTextEl.className = "drum-rating-text";
    void this.ratingTextEl.offsetWidth; // Reflow to reset animation
    
    this.ratingTextEl.textContent = rating.toUpperCase();
    this.ratingTextEl.classList.add(`rating-${rating}`, "show");
    
    if (this.ratingTimeout) clearTimeout(this.ratingTimeout);
    this.ratingTimeout = setTimeout(() => {
      this.ratingTextEl.classList.remove("show");
    }, 550);
  }

  getOverallAccuracy() {
    if (this.playedNotesCount === 0) return 100;
    // Calculate accuracy including auto-misses
    const played = this.notesList.filter(n => n.played);
    if (played.length === 0) return 100;
    
    const sum = played.reduce((acc, note) => {
      if (note.rating === "perfect") return acc + 100;
      if (note.rating === "great") return acc + 85;
      if (note.rating === "good") return acc + 60;
      return acc; // miss is 0
    }, 0);

    return Math.round(sum / this.totalNotesCount);
  }

  updateStatsHUD() {
    const accuracy = this.getOverallAccuracy();
    const progressString = `${this.playedNotesCount}/${this.totalNotesCount}`;
    const progressPercent = this.totalNotesCount > 0 ? (this.playedNotesCount / this.totalNotesCount) * 100 : 0;
    
    this.onStatsChanged(accuracy, progressString, progressPercent);
  }

  draw() {
    if (!this.canvas) return;
    
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, w, h);
    
    // Draw lane lines background
    const laneHeight = h / LANES_ORDER.length;
    
    // Draw vertical timeline bars (grid lines for beats)
    const beatsInView = w / this.pixelsPerBeat;
    const startBeat = Math.max(1, Math.floor(this.currentBeat - 1));
    const endBeat = Math.ceil(this.currentBeat + beatsInView);
    
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    this.ctx.lineWidth = 1;
    for (let b = startBeat; b <= endBeat; b++) {
      const x = this.judgmentLineX + (b - this.currentBeat) * this.pixelsPerBeat;
      if (x > this.judgmentLineX && x < w) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
        
        // Draw beat number indicator on top
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.font = "9px monospace";
        this.ctx.fillText(`${b}`, x + 4, 12);
      }
    }

    // Draw horizontal lane dividing tracks
    for (let i = 0; i <= LANES_ORDER.length; i++) {
      this.ctx.strokeStyle = i === 0 || i === LANES_ORDER.length ? "rgba(255,255,255,0.12)" : "rgba(255, 255, 255, 0.06)";
      this.ctx.lineWidth = i === 0 || i === LANES_ORDER.length ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * laneHeight);
      this.ctx.lineTo(w, i * laneHeight);
      this.ctx.stroke();
    }

    // Draw Lane names labels on the left background
    LANES_ORDER.forEach((lane, index) => {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      this.ctx.font = "bold 11px 'Outfit', sans-serif";
      this.ctx.fillText(lane.toUpperCase(), 12, index * laneHeight + laneHeight / 2 + 4);
    });

    // Draw scrolling notes
    this.notesList.forEach(note => {
      if (note.played && this.practiceMode === "tempo") return; // hide hit notes in tempo mode
      
      const laneIndex = LANES_ORDER.indexOf(note.type);
      const x = this.judgmentLineX + (note.beat - this.currentBeat) * this.pixelsPerBeat;
      const y = laneIndex * laneHeight + laneHeight / 2;
      
      // Only draw visible notes
      if (x > -30 && x < w + 30) {
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = note.color;
        
        // Draw note pill shape
        this.ctx.fillStyle = note.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 11, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner core white glow for realistic arcade look
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // Draw vertical judgment line (판정선) on top
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "rgba(0, 240, 255, 0.6)";
    this.ctx.strokeStyle = "#00f0ff";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.judgmentLineX, 0);
    this.ctx.lineTo(this.judgmentLineX, h);
    this.ctx.stroke();
    
    // Draw target ring indicator at judgment intersections for upcoming notes
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i < LANES_ORDER.length; i++) {
      this.ctx.beginPath();
      this.ctx.arc(this.judgmentLineX, i * laneHeight + laneHeight / 2, 13, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  finish() {
    this.isPlaying = false;
    
    const accuracy = this.getOverallAccuracy();
    let rank = "D";
    if (accuracy >= 95) rank = "S";
    else if (accuracy >= 85) rank = "A";
    else if (accuracy >= 70) rank = "B";
    else if (accuracy >= 50) rank = "C";

    this.onSongFinished({
      isDemo: false,
      accuracy: accuracy,
      rank: rank,
      progressString: `${this.playedNotesCount} / ${this.totalNotesCount}`,
      playedCount: this.playedNotesCount,
      totalCount: this.totalNotesCount
    });
  }

  stop() {
    this.isPlaying = false;
  }
}
