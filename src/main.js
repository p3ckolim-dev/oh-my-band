// Let's Piano - Main UI Orchestrator
import '../src/css/main.css'; // Vite css imports
import { PRESET_SONGS, validateAndFormatABC } from './js/songs.js';
import { PianoRoll } from './js/pianoRoll.js';
import { AudioDetector } from './js/audioDetector.js';
import { MidiInterface } from './js/midiInterface.js';
import { AudioVisualizer } from './js/visualizer.js';
import { SheetMusicController } from './js/sheetMusic.js';

// Oh My Band Imports
import { DRUM_SONGS } from './js/drumSongs.js';
import { DrumAudio } from './js/drumAudio.js';
import { DrumEngine } from './js/drumEngine.js';

class App {
  constructor() {
    this.currentSong = null;
    this.inputSource = "mic"; // 'mic' or 'midi'
    this.practiceMode = "wait"; // 'wait' or 'tempo'
    this.isMetronomeSoundOn = true;
    
    // Oh My Band properties
    this.currentInstrument = "piano"; // "piano" or "drum"
    this.drumAudio = new DrumAudio();
    this.drumEngine = null;
    
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

    // Set default instrument theme class
    document.body.classList.add("piano-mode");
    document.body.classList.remove("drum-mode");

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
    
    // Setup Drum engine with callbacks
    this.drumEngine = new DrumEngine("drum-canvas", this.drumAudio, {
      onTargetChanged: (targetNote) => this.handleTargetNoteChanged(targetNote),
      onStatsChanged: (acc, progStr, progPercent) => this.handleStatsChanged(acc, progStr, progPercent),
      onSongFinished: (stats) => this.handleSongFinished(stats),
      onMetronomeTick: (tick) => this.handleMetronomeTick(tick)
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

    // Result Modal
    this.resultModal = document.getElementById("result-modal");
    this.modalCrown = this.resultModal.querySelector(".modal-crown");
    this.modalSongComposer = document.getElementById("modal-song-composer");
    this.modalRank = document.getElementById("modal-rank");
    this.modalSongTitle = document.getElementById("modal-song-title");
    this.modalAccuracy = document.getElementById("modal-accuracy");
    this.modalProgress = document.getElementById("modal-progress");
    this.modalPracticeMode = document.getElementById("modal-practice-mode");
    this.btnModalRetry = document.getElementById("btn-modal-retry");
    this.btnModalLobby = document.getElementById("btn-modal-lobby");

    // Changelog Modal
    this.changelogModal = document.getElementById("changelog-modal");
    this.btnChangelogClose = document.getElementById("btn-changelog-close");

    // Sheet Music Centered Header
    this.sheetSongTitle = document.getElementById("sheet-song-title");
    this.sheetSongComposer = document.getElementById("sheet-song-composer");

    // Oh My Band UI Elements
    this.instrumentTabs = document.querySelector(".instrument-cards");
    this.customSongBox = document.querySelector(".custom-song-box");
    this.pianoPracticeArea = document.querySelector(".sheet-music-outer");
    this.pianoRollCard = document.querySelector(".piano-roll-card");
    this.drumPracticeArea = document.getElementById("drum-practice-area");
    this.drumTipsGroup = document.getElementById("drum-tips-group");
  }

  initViews() {
    this.lobbyView.classList.remove("hidden");
    this.practiceView.classList.remove("active");
  }

  bindEvents() {
    // Oh My Band: Instrument switching cards listener
    if (this.instrumentTabs) {
      this.instrumentTabs.addEventListener("click", (e) => {
        const card = e.target.closest(".instrument-card");
        if (!card) return;
        
        this.instrumentTabs.querySelectorAll(".instrument-card").forEach(el => el.classList.remove("active"));
        card.classList.add("active");
        
        this.currentInstrument = card.dataset.instrument;
        this.handleInstrumentChanged();
      });
    }

    // Oh My Band: Virtual Drum Kit pad clicks
    const drumKit = document.getElementById("interactive-drum-kit");
    if (drumKit) {
      drumKit.addEventListener("mousedown", (e) => {
        const pad = e.target.closest(".drum-pad");
        if (!pad) return;
        const type = pad.dataset.drum;
        this.handleDrumHit(type);
      });
    }

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
      if (this.sheetController) this.sheetController.setBPM(bpm);
      if (this.drumEngine) this.drumEngine.bpm = Number(bpm);
    });

    // Audio Metronome Sound Toggle
    this.btnMetronomeSoundToggle.addEventListener("click", () => {
      this.isMetronomeSoundOn = !this.isMetronomeSoundOn;
      if (this.sheetController) this.sheetController.setMetronomeSound(this.isMetronomeSoundOn);
      if (this.drumEngine) this.drumEngine.isMetronomeSoundOn = this.isMetronomeSoundOn;
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

    // Keyboard keys mappings for Drum and Piano practice
    window.addEventListener("keydown", (e) => {
      if (!this.practiceView.classList.contains("active")) return;
      
      const isResultOpen = this.resultModal && !this.resultModal.classList.contains("hidden");
      const isChangelogOpen = this.changelogModal && !this.changelogModal.classList.contains("hidden");
      if (isResultOpen || isChangelogOpen) {
        return; // Ignore keys when modal is showing
      }

      if (this.currentInstrument === "drum") {
        // Drum keys map
        const drumKeys = {
          "Space": "kick",
          "KeyS": "hihat",
          "KeyD": "snare",
          "KeyJ": "tom",
          "KeyK": "crash"
        };
        
        if (drumKeys[e.code] !== undefined) {
          e.preventDefault();
          this.handleDrumHit(drumKeys[e.code]);
        } else if (e.code === "Enter") {
          e.preventDefault();
          this.toggleMetronome();
        }
      } else {
        // Piano: Space triggers metronome play/pause
        if (e.code === "Space") {
          e.preventDefault();
          this.toggleMetronome();
        }
      }
    });

    // Result Modal buttons
    this.btnModalRetry.addEventListener("click", () => {
      this.resultModal.classList.add("hidden");
      if (this.currentSong) {
        this.startPractice(this.currentSong);
      }
    });

    this.btnModalLobby.addEventListener("click", () => {
      this.resultModal.classList.add("hidden");
      this.stopPractice();
    });

    // Changelog Modal Toggle
    if (this.headerVersion) {
      this.headerVersion.addEventListener("click", () => {
        if (this.changelogModal) {
          this.changelogModal.classList.remove("hidden");
        }
      });
    }

    if (this.btnChangelogClose) {
      this.btnChangelogClose.addEventListener("click", () => {
        this.changelogModal.classList.add("hidden");
      });
    }

    if (this.changelogModal) {
      this.changelogModal.addEventListener("click", (e) => {
        if (e.target === this.changelogModal) {
          this.changelogModal.classList.add("hidden");
        }
      });
    }
  }

  loadPresetSongsList() {
    this.songsListContainer.innerHTML = "";
    
    const songs = this.currentInstrument === "piano" ? PRESET_SONGS : DRUM_SONGS;
    document.getElementById("song-count-badge").textContent = `${songs.length} 곡 로드됨`;
    
    songs.forEach(song => {
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

  handleInstrumentChanged() {
    // Stop all active sessions
    this.stopPractice();
    
    // Rebuild songs list
    this.loadPresetSongsList();

    const lobbyView = document.getElementById("lobby-view");
    if (this.currentInstrument === "piano") {
      if (lobbyView) {
        lobbyView.classList.add("piano-mode");
        lobbyView.classList.remove("drum-mode");
      }
      document.body.classList.add("piano-mode");
      document.body.classList.remove("drum-mode");
    } else {
      if (lobbyView) {
        lobbyView.classList.add("drum-mode");
        lobbyView.classList.remove("piano-mode");
      }
      document.body.classList.add("drum-mode");
      document.body.classList.remove("piano-mode");
    }

    const titleLogo = document.querySelector(".logo-text");
    if (this.currentInstrument === "piano") {
      if (titleLogo) titleLogo.textContent = "Oh My Band";
      this.customSongBox.style.display = "block";
      this.sourceSelector.parentElement.style.display = "block";
      this.drumTipsGroup.style.display = "none";
      
      // Update visualizer color
      if (this.visualizer) this.visualizer.setGlowColor(this.inputSource);

      if (this.inputSource === "mic") {
        this.micConfigGroup.style.display = "flex";
        this.midiConfigGroup.style.display = "none";
        this.setupMicrophone(true);
      } else {
        this.micConfigGroup.style.display = "none";
        this.midiConfigGroup.style.display = "flex";
        this.setupMidi();
      }
    } else {
      // Drum mode
      if (titleLogo) titleLogo.textContent = "Oh My Band";
      this.customSongBox.style.display = "none";
      this.sourceSelector.parentElement.style.display = "none";
      this.micConfigGroup.style.display = "none";
      this.midiConfigGroup.style.display = "none";
      this.drumTipsGroup.style.display = "block";
      
      if (this.visualizer) this.visualizer.setGlowColor("drum");

      // Initialize/Preload Drum Samples
      this.drumAudio.preloadSamples();
      
      // Keep MIDI connection active for Electronic Drums!
      this.setupMidi();
    }
  }

  handleDrumHit(type) {
    if (this.drumEngine) {
      this.drumEngine.hit(type);
    }
    
    // Trigger visual highlight on the virtual pad
    const pad = document.querySelector(`.drum-pad.pad-${type}`);
    if (pad) {
      pad.classList.add("active");
      setTimeout(() => pad.classList.remove("active"), 80);
    }
  }

  // --- Input Setup & Control ---

  async setupMicrophone(isManual = false) {
    // Pre-check permission state via Permissions API before attempting getUserMedia.
    // This prevents automatic (non-gesture) calls from triggering browser blocks.
    const permState = await AudioDetector.checkPermission();
    
    if (!isManual) {
      // For automatic/silent calls (song start, lobby return, etc.):
      // Only proceed if permission is already granted. Otherwise, do nothing —
      // the user will need to explicitly click the mic button to trigger the prompt.
      if (permState === 'denied') {
        this.statusDot.className = "status-dot";
        this.statusText.textContent = "마이크 권한 거부됨 (브라우저 설정에서 허용 필요)";
        return;
      }
      if (permState === 'prompt' || permState === 'unknown') {
        // Permission not yet granted — don't auto-request (would be blocked without gesture)
        this.statusDot.className = "status-dot";
        this.statusText.textContent = "🎤 마이크 입력을 사용하려면 소스 설정에서 클릭해 주세요";
        return;
      }
      // permState === 'granted' → safe to proceed silently
    } else {
      // Manual trigger: if explicitly denied, inform user about browser settings
      if (permState === 'denied') {
        this.statusDot.className = "status-dot";
        this.statusText.textContent = "마이크 권한 거부됨";
        alert("마이크 권한이 브라우저에서 차단되었습니다.\n\n주소창 왼쪽의 🔒 아이콘 → 사이트 설정에서\n마이크를 '허용'으로 변경한 후 새로고침해 주세요.");
        return;
      }
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
      this.statusDot.className = "status-dot listening";
      this.statusText.textContent = "마이크 듣는 중 (소리를 내보세요)";
      this.visualizer.start(this.audioDetector.analyser);
    } catch (e) {
      console.warn("setupMicrophone failed:", e);
      const isRealDenial = e.name === "NotAllowedError" || e.name === "PermissionDeniedError" || (e.message && e.message.includes("Permission"));
      
      if (isRealDenial) {
        this.statusDot.className = "status-dot";
        this.statusText.textContent = "마이크 권한 거부됨";
      } else {
        this.statusDot.className = "status-dot";
        this.statusText.textContent = "마이크 초기화 실패";
      }
      
      // Only prompt blocker alert if user manually triggered it
      if (isManual) {
        if (isRealDenial) {
          alert("마이크 권한이 브라우저에서 차단되었습니다.\n\n주소창 왼쪽의 🔒 아이콘 → 사이트 설정에서\n마이크를 '허용'으로 변경한 후 새로고침해 주세요.");
        } else {
          alert("마이크를 시작할 수 없습니다. 다른 탭이나 앱에서 마이크를 사용 중인지 확인해 주세요.");
        }
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
    if (this.currentInstrument === "drum") {
      const midiDrumMap = {
        35: "kick", 36: "kick",
        38: "snare", 40: "snare",
        42: "hihat", 44: "hihat", 46: "hihat",
        41: "tom", 43: "tom", 45: "tom", 47: "tom", 48: "tom",
        49: "crash", 57: "crash"
      };
      const drumType = midiDrumMap[noteNumber];
      if (drumType) {
        this.handleDrumHit(drumType);
      }
    } else {
      this.pianoRoll.playSynthSound(noteNumber);
      this.handlePlayedNote(noteNumber);
    }
  }

  handleMidiNoteOff(noteNumber) {
    if (this.currentInstrument === "piano") {
      this.pianoRoll.stopSynthSound(noteNumber);
      this.pianoRoll.releasePlay(noteNumber);
    }
  }

  // --- Sheet Music callbacks ---

  handleTargetNoteChanged(targetNote) {
    if (this.currentInstrument === "drum") {
      if (targetNote) {
        this.targetNoteName.textContent = targetNote.name;
        this.targetNoteInfo.textContent = "(단축키 연주)";
      } else {
        this.targetNoteName.textContent = "곡 완료! 🎉";
        this.targetNoteInfo.textContent = "";
      }
    } else {
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
    // Reset play buttons text and icons
    if (stats.isDemo) {
      this.btnDemoAutoplay.textContent = "▶ 악보 자동 연주";
      this.btnDemoAutoplay.className = "btn btn-secondary";
      this.btnDemoAutoplay.style.color = "var(--accent-cyan)";
      this.btnDemoAutoplay.style.borderColor = "var(--accent-cyan)";
    } else {
      this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 연습 시작 (Space)" : "▶ 연습 시작 (Space)";
      this.btnPlayPauseTempo.className = "btn btn-primary";
    }

    // Stop microphone, metronome, and playbacks immediately to prevent background sound/processing
    this.sheetController.stopMetronome();
    this.sheetController.stopDemoPlay();
    this.stopMicrophone();
    this.pianoRoll.clearTargets();

    // Trigger the premium glassmorphic modal instead of native alert()
    this.showResultModal(stats);
  }

  showResultModal(stats) {
    const accuracy = stats.accuracy;
    const totalNotes = stats.totalNotes;
    const isDemo = stats.isDemo || false;

    // Determine Rating Rank based on exact accuracy thresholds
    let rank = "D";
    let rankClass = "rank-d";
    let accuracyColorClass = "stat-val-num text-red";

    if (accuracy >= 95) {
      rank = "S";
      rankClass = "rank-s";
      accuracyColorClass = "stat-val-num text-green";
    } else if (accuracy >= 90) {
      rank = "A";
      rankClass = "rank-a";
      accuracyColorClass = "stat-val-num text-green";
    } else if (accuracy >= 75) {
      rank = "B";
      rankClass = "rank-b";
      accuracyColorClass = "stat-val-num text-orange";
    } else if (accuracy >= 60) {
      rank = "C";
      rankClass = "rank-c";
      accuracyColorClass = "stat-val-num text-cyan";
    }

    // Display appropriate high-fidelity crown emoji/glow
    if (rank === "S") {
      this.modalCrown.textContent = "👑";
      this.modalCrown.style.display = "inline-block";
    } else if (rank === "A" || rank === "B") {
      this.modalCrown.textContent = "✨";
      this.modalCrown.style.display = "inline-block";
    } else {
      this.modalCrown.style.display = "none";
    }

    // Setup visual header text content
    const titleText = isDemo ? "연주 감상 완료!" : "연습 완료! 🎉";
    this.resultModal.querySelector(".modal-header h2").textContent = titleText;

    if (this.currentSong) {
      this.modalSongTitle.textContent = this.currentSong.title;
      this.modalSongComposer.textContent = `Composer: ${this.currentSong.composer || "Unknown"}`;
    } else {
      this.modalSongTitle.textContent = "나의 커스텀 연습곡";
      this.modalSongComposer.textContent = "나의 피아노 연습";
    }

    // Dynamic rating badge
    this.modalRank.textContent = rank;
    this.modalRank.className = `rank-badge ${rankClass}`;
    
    // Exact accuracy level display
    this.modalAccuracy.textContent = `${accuracy}%`;
    this.modalAccuracy.className = accuracyColorClass;

    // Correct hit note mapping
    const correctCount = Math.round((accuracy / 100) * totalNotes);
    this.modalProgress.textContent = `${correctCount} / ${totalNotes}`;

    // Mode specific display
    const modeText = this.practiceMode === "wait" ? "대기 연습 (Wait)" : "템포 연습 (Tempo)";
    this.modalPracticeMode.textContent = isDemo ? "자동 연주 (Demo)" : modeText;

    // Open Modal Overlay
    this.resultModal.classList.remove("hidden");
  }

  handleMetronomeTick(tickIndex) {
    this.metroLight.classList.add("tick");
    setTimeout(() => {
      this.metroLight.classList.remove("tick");
    }, 150);

    // If in drum mode and metronome sound is enabled, play synthesized tick sound
    if (this.currentInstrument === "drum" && this.isMetronomeSoundOn) {
      try {
        const audioCtx = this.drumAudio.ctx;
        if (audioCtx) {
          if (audioCtx.state === "suspended") {
            audioCtx.resume();
          }
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          // Triplets/shuffle beats will have fractions, we round index to check strong beat
          const isStrong = (Math.round(tickIndex) % 4 === 0);
          osc.frequency.setValueAtTime(isStrong ? 1000 : 700, audioCtx.currentTime);
          
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.06);
        }
      } catch (err) {
        console.warn("Failed to play metronome audio tick:", err);
      }
    }
  }

  // --- Practice Session Transitions ---
 
  startPractice(song) {
    this.currentSong = song;
    
    if (this.currentInstrument === "piano" && this.inputSource === "mic") {
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
    
    if (this.currentInstrument === "drum") {
      // Hide Piano, Show Drum Practice Area
      this.pianoPracticeArea.style.display = "none";
      this.pianoRollCard.style.display = "none";
      this.drumPracticeArea.classList.add("active");
      if (this.btnDemoAutoplay) this.btnDemoAutoplay.style.display = "none";

      // Set play buttons text appropriately (Enter is used for drums instead of Space)
      this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Enter)" : "▶ 연습 시작 (Enter)";
      this.btnPlayPauseTempo.className = "btn btn-primary";

      // Start drum rendering
      this.drumEngine.loadSong(song, this.practiceMode, song.tempo, this.isMetronomeSoundOn);
    } else {
      // Show Piano, Hide Drum Practice Area
      this.pianoPracticeArea.style.display = "block";
      this.pianoRollCard.style.display = "block";
      this.drumPracticeArea.classList.remove("active");
      if (this.btnDemoAutoplay) this.btnDemoAutoplay.style.display = "inline-block";

      // Set play buttons text appropriately
      this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Space)" : "▶ 연습 시작 (Space)";
      this.btnPlayPauseTempo.className = "btn btn-primary";

      // Update Centered Sheet Music Header
      if (this.sheetSongTitle) this.sheetSongTitle.textContent = song.title;
      if (this.sheetSongComposer) this.sheetSongComposer.textContent = song.composer || "Traditional";

      // Start piano practice rendering
      this.sheetController.setMode(this.practiceMode);
      this.sheetController.setBPM(song.tempo);
      this.sheetController.setMetronomeSound(this.isMetronomeSoundOn);
      this.sheetController.render(song.abc);
    }
  }

  stopPractice() {
    if (this.sheetController) {
      this.sheetController.stopMetronome();
      this.sheetController.stopDemoPlay();
    }
    if (this.drumEngine) {
      this.drumEngine.stop();
    }
    this.stopMicrophone();
    if (this.pianoRoll) {
      this.pianoRoll.stopAll();
    }
    
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
    
    if (this.currentInstrument === "piano") {
      if (this.inputSource === "mic") {
        this.setupMicrophone(false); // Silent check when returning to lobby
      } else {
        this.setupMidi();
      }
    } else {
      this.setupMidi(); // Keep MIDI listening active in Lobby
    }
  }

  toggleMetronome() {
    if (this.currentInstrument === "drum") {
      if (this.drumEngine.isPlaying) {
        this.drumEngine.pause();
        this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "▶ 메트로놈 시작 (Enter)" : "▶ 연습 시작 (Enter)";
        this.btnPlayPauseTempo.className = "btn btn-primary";
      } else {
        // Resume AudioContext in case of browser restrictions
        this.drumAudio.resume();
        this.drumEngine.start();
        this.btnPlayPauseTempo.textContent = this.practiceMode === "wait" ? "⏸ 메트로놈 정지 (Enter)" : "⏸ 연습 정지 (Enter)";
        this.btnPlayPauseTempo.className = "btn btn-secondary";
      }
    } else {
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
