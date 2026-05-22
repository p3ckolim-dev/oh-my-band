// Let's Piano - Main UI Orchestrator
import '../src/css/main.css'; // Vite css imports
import { PRESET_SONGS, validateAndFormatABC } from './js/songs.js';
import { PianoRoll } from './js/pianoRoll.js';
import { AudioDetector } from './js/audioDetector.js';
import { MidiInterface } from './js/midiInterface.js';
import { AudioVisualizer } from './js/visualizer.js';
import { SheetMusicController } from './js/sheetMusic.js';

class App {
  constructor() {
    this.currentSong = null;
    this.inputSource = "mic"; // 'mic' or 'midi'
    this.practiceMode = "wait"; // 'wait' or 'tempo'
    this.isMetronomeSoundOn = true;
    this.micPermissionDenied = false; // Track mic permission state to prevent loops
    
    // Components
    this.pianoRoll = null;
    this.audioDetector = null;
    this.midiInterface = null;
    this.visualizer = null;
    this.sheetController = null;
    
    // UI state
    this.midiNoteOffTimeouts = {};
    
    // Launch initialization
    document.addEventListener("DOMContentLoaded", () => this.init());
  }

  init() {
    this.cacheElements();

    // Initialize Theme
    this.isLightTheme = localStorage.getItem("theme") === "light";
    if (this.isLightTheme) {
      document.body.classList.add("light-theme");
      const themeIcon = this.btnThemeToggle.querySelector(".theme-toggle-icon");
      if (themeIcon) themeIcon.textContent = "☀️";
    }

    this.initViews();
    this.bindEvents();
    this.loadPresetSongsList();
    
    // Pre-initialize non-audio modules
    this.pianoRoll = new PianoRoll("piano-keys-container", (note) => this.handlePlayedNote(note));
    this.visualizer = new AudioVisualizer("mic-visualizer");
    this.visualizer.setGlowColor("mic"); // Default mic glow (orange)

    // Setup Sheet music controller with callbacks
    this.sheetController = new SheetMusicController("sheet-music-container", {
      onTargetChanged: (targetNote) => this.handleTargetNoteChanged(targetNote),
      onStatsChanged: (acc, progStr, progPercent) => this.handleStatsChanged(acc, progStr, progPercent),
      onSongFinished: (stats) => this.handleSongFinished(stats),
      onMetronomeTick: (tick) => this.handleMetronomeTick(tick),
      onDemoPlayNote: (midi, durationMs) => this.handleDemoPlayNote(midi, durationMs)
    });
    
    // MIDI device updates
    this.midiInterface = new MidiInterface(
      (note, vel) => this.handleMidiNoteOn(note, vel),
      (note) => this.handleMidiNoteOff(note),
      (devices) => this.handleMidiDevicesChanged(devices)
    );
    
    // Prompt MIDI connection on load (non-intrusive)
    this.midiInterface.requestAccess();
  }

  cacheElements() {
    // Views
    this.lobbyView = document.getElementById("lobby-view");
    this.practiceView = document.getElementById("practice-view");
    
    // Header elements
    this.statusDot = document.getElementById("status-dot");
    this.statusText = document.getElementById("status-text");
    this.headerVersion = document.getElementById("header-version");
    this.headerSongTitle = document.getElementById("header-song-title");
    this.headerModeBadge = document.getElementById("header-mode-badge");
    this.btnThemeToggle = document.getElementById("btn-theme-toggle");
    this.logoHomeTrigger = document.getElementById("logo-home-trigger");
    
    // Forms & Controls
    this.songsListContainer = document.getElementById("songs-list");
    this.customAbcInput = document.getElementById("custom-abc-input");
    this.btnLoadCustom = document.getElementById("btn-load-custom");
    this.modeSelector = document.getElementById("mode-selector");
    this.sourceSelector = document.getElementById("source-selector");
    this.micConfigGroup = document.getElementById("mic-config-group");
    this.midiConfigGroup = document.getElementById("midi-config-group");
    
    // Microphone details
    this.volumeVal = document.getElementById("volume-val");
    this.volumeBar = document.getElementById("volume-bar");
    this.micSensitivity = document.getElementById("mic-sensitivity");
    this.sensitivityVal = document.getElementById("sensitivity-val");
    this.midiDevicesList = document.getElementById("midi-devices-list");
    
    // Practice arena HUD details
    this.btnBackLobby = document.getElementById("btn-back-lobby");
    this.btnFullscreen = document.getElementById("btn-header-fullscreen");
    this.practiceSongTitle = document.getElementById("header-song-title");
    this.practiceModeBadge = document.getElementById("header-mode-badge");
    this.statAccuracy = document.getElementById("stat-accuracy");
    this.statProgress = document.getElementById("stat-progress");
    this.progressBar = document.getElementById("practice-progress-bar");
    
    // Feedback bar
    this.targetNoteName = document.getElementById("target-note-name");
    this.targetNoteInfo = document.getElementById("target-note-info");
    this.playedNoteName = document.getElementById("played-note-name");
    
    // Tempo practice
    this.tempoControlPanel = document.getElementById("tempo-control-panel");
    this.bpmVal = document.getElementById("bpm-val");
    this.tempoBPM = document.getElementById("tempo-bpm");
    this.btnMetronomeSoundToggle = document.getElementById("btn-metronome-sound-toggle");
    this.btnDemoAutoplay = document.getElementById("btn-demo-autoplay");
    this.btnPlayPauseTempo = document.getElementById("btn-play-pause-tempo");
    this.metroLight = document.getElementById("metro-light");
  }

  initViews() {
    this.lobbyView.classList.remove("hidden");
    this.practiceView.classList.remove("active");
  }

  bindEvents() {
    // Mode switcher (Wait vs Tempo)
    this.modeSelector.addEventListener("click", (e) => {
      const option = e.target.closest(".selector-option");
      if (!option) return;
      
      this.modeSelector.querySelectorAll(".selector-option").forEach(el => el.classList.remove("active"));
      option.classList.add("active");
      
      this.practiceMode = option.dataset.mode;
      
      const desc = document.getElementById("mode-desc");
      if (this.practiceMode === "wait") {
        desc.innerHTML = "* **대기 연습**: 올바른 건반을 연주할 때까지 악보가 멈추고 기다려줍니다. 초보자에게 완벽합니다.";
      } else {
        desc.innerHTML = "* **템포 연습**: 메트로놈 템포 속도에 맞춰 실시간으로 악보가 흘러갑니다. 정확한 타이밍 연주를 연습합니다.";
      }
      
      // Update text on play button dynamically
      if (!this.sheetController?.isMetronomePlaying) {
        this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Space)" : "▶ 연습 시작 (Space)";
      }
    });

    // Input Source switcher (Mic vs MIDI)
    this.sourceSelector.addEventListener("click", async (e) => {
      const option = e.target.closest(".selector-option");
      if (!option) return;
      
      this.sourceSelector.querySelectorAll(".selector-option").forEach(el => el.classList.remove("active"));
      option.classList.add("active");
      
      this.inputSource = option.dataset.source;
      
      if (this.inputSource === "mic") {
        this.micConfigGroup.style.display = "flex";
        this.midiConfigGroup.style.display = "none";
        this.visualizer.setGlowColor("mic");
        this.setupMicrophone(true); // User explicitly clicked, count as manual intent
      } else {
        this.micConfigGroup.style.display = "none";
        this.midiConfigGroup.style.display = "flex";
        this.visualizer.setGlowColor("midi");
        this.stopMicrophone();
        this.setupMidi();
      }
    });

    // Mic sensitivity slider
    this.micSensitivity.addEventListener("input", (e) => {
      const val = e.target.value;
      this.sensitivityVal.textContent = val;
      if (this.audioDetector) {
        this.audioDetector.setSensitivity(val);
      }
    });

    // Custom ABC song loader
    this.btnLoadCustom.addEventListener("click", () => {
      const rawAbc = this.customAbcInput.value;
      if (!rawAbc.trim()) {
        alert("ABC 표기법 악보 내용을 입력해 주세요.");
        return;
      }
      const validatedAbc = validateAndFormatABC("나의 커스텀 연습곡", rawAbc);
      if (validatedAbc) {
        this.startPractice({
          title: "나의 커스텀 연습곡",
          difficulty: "medium",
          tempo: 80,
          abc: validatedAbc
        });
      } else {
        alert("올바르지 않은 악보 포맷입니다.");
      }
    });

    // Theme Toggle
    this.btnThemeToggle.addEventListener("click", () => {
      this.isLightTheme = !this.isLightTheme;
      const themeIcon = this.btnThemeToggle.querySelector(".theme-toggle-icon");
      if (this.isLightTheme) {
        document.body.classList.add("light-theme");
        if (themeIcon) themeIcon.textContent = "☀️";
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("light-theme");
        if (themeIcon) themeIcon.textContent = "🌙";
        localStorage.setItem("theme", "dark");
      }
    });

    // Logo click goes back to lobby (home)
    if (this.logoHomeTrigger) {
      this.logoHomeTrigger.addEventListener("click", () => {
        if (this.practiceView.classList.contains("active")) {
          this.stopPractice();
        }
      });
    }

    // Back to lobby
    this.btnBackLobby.addEventListener("click", () => {
      this.stopPractice();
    });

    // Fullscreen Mode Toggle
    this.btnFullscreen.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Detect escaping fullscreen to sync button label
    document.addEventListener("fullscreenchange", () => {
      const icon = this.btnFullscreen.querySelector(".fullscreen-icon");
      if (document.fullscreenElement) {
        if (icon) icon.textContent = "📺";
        this.btnFullscreen.title = "창 화면";
      } else {
        if (icon) icon.textContent = "🖥️";
        this.btnFullscreen.title = "전체화면";
      }
    });

    // Tempo BPM slider
    this.tempoBPM.addEventListener("input", (e) => {
      const bpm = e.target.value;
      this.bpmVal.textContent = `${bpm} BPM`;
      this.sheetController.setBPM(bpm);
    });

    // Audio Metronome Sound Toggle
    this.btnMetronomeSoundToggle.addEventListener("click", () => {
      this.isMetronomeSoundOn = !this.isMetronomeSoundOn;
      this.sheetController.setMetronomeSound(this.isMetronomeSoundOn);
      this.btnMetronomeSoundToggle.textContent = this.isMetronomeSoundOn ? "🔊" : "🔇";
      this.btnMetronomeSoundToggle.className = this.isMetronomeSoundOn ? "btn-icon-toggle" : "btn-icon-toggle muted";
    });

    // Demo auto play toggle in practice
    this.btnDemoAutoplay.addEventListener("click", () => {
      this.toggleDemoAutoplay();
    });

    // Metronome toggle play/pause in practice
    this.btnPlayPauseTempo.addEventListener("click", () => {
      this.toggleMetronome();
    });

    // Keyboard space bar triggers play/pause metronome
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && this.practiceView.classList.contains("active")) {
        e.preventDefault();
        this.toggleMetronome();
      }
    });
  }

  loadPresetSongsList() {
    this.songsListContainer.innerHTML = "";
    document.getElementById("song-count-badge").textContent = `${PRESET_SONGS.length} 곡 로드됨`;
    
    PRESET_SONGS.forEach(song => {
      const item = document.createElement("div");
      item.classList.add("song-item");
      item.addEventListener("click", () => this.startPractice(song));
      
      item.innerHTML = `
        <div class="song-info">
          <span class="song-title">${song.title}</span>
          <div class="song-meta">
            <span>👤 ${song.composer}</span>
            <span>⚡ ${song.tempo} BPM</span>
            <span class="difficulty-badge diff-${song.difficulty}">${song.difficulty}</span>
          </div>
        </div>
        <button class="play-btn">▶</button>
      `;
      this.songsListContainer.appendChild(item);
    });
  }

  // --- Input Setup & Control ---

  async setupMicrophone(isManual = false) {
    // If permission was already denied, skip background auto-reconnects to prevent loop
    if (this.micPermissionDenied && !isManual) {
      this.statusDot.className = "status-dot";
      this.statusText.textContent = "마이크 권한 거부됨";
      return;
    }

    this.statusText.textContent = "마이크 사용 승인 요청 중...";
    this.midiInterface.stop();
    
    if (!this.audioDetector) {
      this.audioDetector = new AudioDetector(
        (note) => this.handlePlayedNote(note),
        (rms) => this.handleVolumeChanged(rms)
      );
    }
    
    this.audioDetector.setSensitivity(this.micSensitivity.value);

    try {
      await this.audioDetector.start();
      this.micPermissionDenied = false; // Reset on success
      this.statusDot.className = "status-dot listening";
      this.statusText.textContent = "마이크 듣는 중 (소리를 내보세요)";
      this.visualizer.start(this.audioDetector.analyser);
    } catch (e) {
      this.micPermissionDenied = true; // Mark as denied to prevent automatic loops
      this.statusDot.className = "status-dot";
      this.statusText.textContent = "마이크 권한 거부됨";
      
      // Only prompt blocker alert if user manually triggered it
      if (isManual) {
        alert("마이크 입력 권한이 필요합니다. 설정에서 마이크를 허용해 주세요!");
      }
    }
  }

  stopMicrophone() {
    if (this.audioDetector) {
      this.audioDetector.stop();
    }
    this.visualizer.stop();
    this.volumeBar.style.width = "0%";
    this.volumeBar.classList.remove("gate-open");
    this.volumeVal.textContent = "0%";
  }

  async setupMidi() {
    this.statusText.textContent = "MIDI 권한 확인 중...";
    this.stopMicrophone();
    
    const success = await this.midiInterface.requestAccess();
    if (success) {
      this.statusDot.className = "status-dot active";
      this.statusText.textContent = "MIDI 연결 활성화됨";
    } else {
      this.statusDot.className = "status-dot";
      this.statusText.textContent = "MIDI 지원 안 됨";
    }
  }

  // --- Real-time Event Handlers ---

  handleVolumeChanged(rmsPercentage) {
    this.volumeVal.textContent = `${rmsPercentage}%`;
    this.volumeBar.style.width = `${rmsPercentage}%`;
    
    const sensitivity = Number(this.micSensitivity.value);
    const threshold = 5 + (sensitivity / 100) * 15;
    
    if (rmsPercentage > threshold) {
      this.volumeBar.classList.add("gate-open");
    } else {
      this.volumeBar.classList.remove("gate-open");
    }
  }

  handleMidiDevicesChanged(deviceNames) {
    if (deviceNames.length > 0) {
      this.midiDevicesList.innerHTML = deviceNames
        .map(name => `🟢 <strong>${name}</strong> 이 연결되었습니다.`)
        .join("<br>");
      this.statusText.textContent = `MIDI 연결 완료 (${deviceNames.length}개 기기)`;
      this.statusDot.className = "status-dot active";
    } else {
      this.midiDevicesList.innerHTML = "❌ 연결된 MIDI 기기가 없습니다. 기기를 켜거나 컴퓨터에 USB로 연결해 주세요.";
      if (this.inputSource === "midi") {
        this.statusText.textContent = "연결된 MIDI 기기 없음";
        this.statusDot.className = "status-dot";
      }
    }
  }

  handlePlayedNote(noteNumber) {
    if (!this.practiceView.classList.contains("active")) return;
    
    this.playedNoteName.textContent = PianoRoll.getNoteName(noteNumber);
    const result = this.sheetController.checkPlayedNote(noteNumber);
    
    if (result) {
      const { isMatch } = result;
      this.pianoRoll.highlightPlay(noteNumber, isMatch ? "correct" : "wrong");
      
      if (this.midiNoteOffTimeouts[noteNumber]) clearTimeout(this.midiNoteOffTimeouts[noteNumber]);
      this.midiNoteOffTimeouts[noteNumber] = setTimeout(() => {
        this.pianoRoll.releasePlay(noteNumber);
      }, 350);
    } else {
      this.pianoRoll.highlightPlay(noteNumber, null);
      if (this.midiNoteOffTimeouts[noteNumber]) clearTimeout(this.midiNoteOffTimeouts[noteNumber]);
      this.midiNoteOffTimeouts[noteNumber] = setTimeout(() => {
        this.pianoRoll.releasePlay(noteNumber);
      }, 350);
    }
  }

  handleMidiNoteOn(noteNumber, velocity) {
    this.pianoRoll.playSynthSound(noteNumber);
    this.handlePlayedNote(noteNumber);
  }

  handleMidiNoteOff(noteNumber) {
    this.pianoRoll.stopSynthSound(noteNumber);
    this.pianoRoll.releasePlay(noteNumber);
  }

  // --- Sheet Music callbacks ---

  handleTargetNoteChanged(targetNote) {
    if (targetNote) {
      this.targetNoteName.textContent = targetNote.name;
      this.targetNoteInfo.textContent = `(MIDI 번호: ${targetNote.midi})`;
      this.pianoRoll.highlightTarget(targetNote.midi);
    } else {
      this.targetNoteName.textContent = "곡 완료! 🎉";
      this.targetNoteInfo.textContent = "";
      this.pianoRoll.clearTargets();
    }
  }

  handleStatsChanged(accuracy, progressString, progressPercent) {
    this.statAccuracy.textContent = `${accuracy}%`;
    this.statProgress.textContent = progressString;
    this.progressBar.style.width = `${progressPercent}%`;
    
    if (accuracy >= 90) {
      this.statAccuracy.className = "stat-val text-green";
    } else if (accuracy >= 70) {
      this.statAccuracy.className = "stat-val text-orange";
    } else {
      this.statAccuracy.className = "stat-val text-red";
    }
  }

  handleSongFinished(stats) {
    if (stats.isDemo) {
      this.btnDemoAutoplay.textContent = "▶ 악보 자동 연주";
      this.btnDemoAutoplay.className = "btn btn-secondary";
      this.btnDemoAutoplay.style.color = "var(--accent-cyan)";
      this.btnDemoAutoplay.style.borderColor = "var(--accent-cyan)";
      
      alert("🎉 곡 자동 연주(데모)가 완료되었습니다!");
      this.stopPractice();
      return;
    }

    this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 연습 시작 (Space)" : "▶ 연습 시작 (Space)";
    this.btnPlayPauseTempo.className = "btn btn-primary";
    
    alert(`🎉 곡을 모두 연주하셨습니다!\n최종 정확도: ${stats.accuracy}%`);
    this.stopPractice();
  }

  handleMetronomeTick(tickIndex) {
    this.metroLight.classList.add("tick");
    setTimeout(() => {
      this.metroLight.classList.remove("tick");
    }, 150);
  }

  // --- Practice Session Transitions ---
 
  startPractice(song) {
    this.currentSong = song;
    
    if (this.inputSource === "mic") {
      this.setupMicrophone(false); // Automated/silent retry on song start
    } else {
      this.setupMidi();
    }

    this.practiceSongTitle.textContent = song.title;
    
    const badgeText = this.practiceMode === "wait" ? "대기 연습" : "템포 연습";
    const badgeClass = this.practiceMode === "wait" ? "mode-chip wait" : "mode-chip tempo";
    this.practiceModeBadge.textContent = badgeText;
    this.practiceModeBadge.className = badgeClass;
    
    // Toggle header mode/song visibility
    if (this.headerVersion) this.headerVersion.style.display = "none";
    if (this.practiceSongTitle) this.practiceSongTitle.style.display = "inline-block";
    if (this.practiceModeBadge) this.practiceModeBadge.style.display = "inline-block";
    
    this.lobbyView.classList.add("hidden");
    this.practiceView.classList.add("active");
    
    this.tempoBPM.value = song.tempo;
    this.bpmVal.textContent = `${song.tempo} BPM`;
    
    // Set play buttons text appropriately
    this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Space)" : "▶ 연습 시작 (Space)";
    this.btnPlayPauseTempo.className = "btn btn-primary";

    // Start practice rendering
    this.sheetController.setMode(this.practiceMode);
    this.sheetController.setBPM(song.tempo);
    this.sheetController.setMetronomeSound(this.isMetronomeSoundOn);
    this.sheetController.render(song.abc);
  }

  stopPractice() {
    this.sheetController.stopMetronome();
    this.sheetController.stopDemoPlay();
    this.stopMicrophone();
    this.pianoRoll.clearTargets();
    
    if (this.btnDemoAutoplay) {
      this.btnDemoAutoplay.textContent = "▶ 악보 자동 연주";
      this.btnDemoAutoplay.className = "btn btn-secondary";
      this.btnDemoAutoplay.style.color = "var(--accent-cyan)";
      this.btnDemoAutoplay.style.borderColor = "var(--accent-cyan)";
    }
    
    this.targetNoteName.textContent = "준비 중";
    this.targetNoteInfo.textContent = "(키보드 안내를 보세요)";
    this.playedNoteName.textContent = "연주 대기";
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    // Toggle header mode/song visibility back to lobby
    if (this.headerVersion) this.headerVersion.style.display = "inline-block";
    if (this.practiceSongTitle) this.practiceSongTitle.style.display = "none";
    if (this.practiceModeBadge) this.practiceModeBadge.style.display = "none";
    
    this.practiceView.classList.remove("active");
    this.lobbyView.classList.remove("hidden");
    
    if (this.inputSource === "mic") {
      this.setupMicrophone(false); // Silent check when returning to lobby
    } else {
      this.setupMidi();
    }
  }

  toggleMetronome() {
    if (this.sheetController.isDemoPlaying) {
      this.toggleDemoAutoplay();
    }
    
    if (this.sheetController.isMetronomePlaying) {
      this.sheetController.stopMetronome();
      this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Space)" : "▶ 연습 시작 (Space)";
      this.btnPlayPauseTempo.className = "btn btn-primary";
    } else {
      // Lazy init AudioContext inside virtual keyboard to avoid browser blocking
      this.pianoRoll.lazyInitAudio();
      
      this.sheetController.startMetronome();
      this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "⏸ 메트로놈 정지 (Space)" : "⏸ 연습 정지 (Space)";
      this.btnPlayPauseTempo.className = "btn btn-secondary";
    }
  }

  toggleFullscreen() {
    const icon = this.btnFullscreen.querySelector(".fullscreen-icon");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen request failed:", err);
      });
      if (icon) icon.textContent = "📺";
      this.btnFullscreen.title = "창 화면";
    } else {
      document.exitFullscreen();
      if (icon) icon.textContent = "🖥️";
      this.btnFullscreen.title = "전체화면";
    }
  }

  handleDemoPlayNote(midi, durationMs) {
    // Play synthesized piano sound
    this.pianoRoll.playSynthSound(midi);
    this.pianoRoll.highlightPlay(midi, "correct");
    
    // Stop the note sound and release physical key bed animation after duration
    setTimeout(() => {
      this.pianoRoll.stopSynthSound(midi);
      this.pianoRoll.releasePlay(midi);
    }, durationMs - 50); // 50ms gap to separate contiguous identical notes
  }

  toggleDemoAutoplay() {
    if (this.sheetController.isDemoPlaying) {
      this.sheetController.stopDemoPlay();
      this.btnDemoAutoplay.textContent = "▶ 악보 자동 연주";
      this.btnDemoAutoplay.className = "btn btn-secondary";
      this.btnDemoAutoplay.style.color = "var(--accent-cyan)";
      this.btnDemoAutoplay.style.borderColor = "var(--accent-cyan)";
    } else {
      // Lazy init audio context
      this.pianoRoll.lazyInitAudio();
      
      // Stop metronome if active
      if (this.sheetController.isMetronomePlaying) {
        this.toggleMetronome();
      }
      
      this.sheetController.startDemoPlay();
      this.btnDemoAutoplay.textContent = "⏸ 자동 연주 정지";
      this.btnDemoAutoplay.className = "btn btn-secondary text-orange";
      this.btnDemoAutoplay.style.color = "var(--accent-orange)";
      this.btnDemoAutoplay.style.borderColor = "var(--accent-orange)";
    }
  }
}

// Instantiate App
new App();
