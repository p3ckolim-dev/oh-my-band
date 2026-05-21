// HTML5 Canvas Audio Waveform and Spectrum Visualizer

export class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.animationFrameId = null;
    this.analyser = null;
    this.isPlaying = false;
    
    // Aesthetic settings
    this.glowColor = "rgba(0, 240, 255, 0.8)";
    this.lineColor = "#00f0ff";
    
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      // Set display width based on parent sizing
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = 100 * window.devicePixelRatio; // match height in css
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  setGlowColor(theme) {
    if (theme === "mic") {
      this.glowColor = "rgba(255, 123, 0, 0.6)";
      this.lineColor = "#ff7b00";
    } else {
      this.glowColor = "rgba(0, 240, 255, 0.6)";
      this.lineColor = "#00f0ff";
    }
  }

  start(analyserNode) {
    this.analyser = analyserNode;
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.draw();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Clear canvas and draw flat line
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    this.ctx.clearRect(0, 0, w, h);
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, h / 2);
    this.ctx.lineTo(w, h / 2);
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  draw() {
    if (!this.isPlaying || !this.analyser) return;

    this.animationFrameId = requestAnimationFrame(() => this.draw());

    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    
    this.ctx.clearRect(0, 0, w, h);
    
    // Retrieve FFT data (frequency bands)
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Let's create a beautiful neon bar spectrum visualizer!
    // We only display the low/mid range (up to 150 frequency bands out of 1024)
    const activeBands = Math.min(100, bufferLength);
    const barWidth = (w / activeBands) * 0.8;
    const gap = (w / activeBands) * 0.2;
    
    // Dynamic background grid lines for premium aesthetic
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }

    // Set high-end glow shadow settings
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = this.lineColor;
    
    // Create soft gradient for bars
    const gradient = this.ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, "rgba(26, 29, 48, 0.1)");
    gradient.addColorStop(0.5, this.glowColor);
    gradient.addColorStop(1, this.lineColor);

    this.ctx.fillStyle = gradient;

    for (let i = 0; i < activeBands; i++) {
      // Scale bar height exponentially for better dynamic range response
      const value = dataArray[i];
      const percent = value / 255;
      const barHeight = Math.pow(percent, 1.5) * h * 0.85;

      const x = i * (barWidth + gap);
      const y = h - barHeight - 2;

      // Draw beautiful rounded bars
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight + 5, [4, 4, 0, 0]);
      this.ctx.fill();
    }

    // Reset shadow
    this.ctx.shadowBlur = 0;
  }
}
