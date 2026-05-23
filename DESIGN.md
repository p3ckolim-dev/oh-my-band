# Oh My Band 🥁🎹 - Design System Specification (Stitch Style Guide)

This document serves as the single source of truth for the **Oh My Band** styling system. It outlines the design tokens, layouts, interface standards, and interaction rules that are automatically enforced across all pages and views to deliver a cohesive, premium, high-fidelity dark glassmorphic studio experience.

---

## 1. Color Tokens (HSL Palette)

To establish an interactive and responsive instrument-aware atmosphere, we employ a dynamic theme coordination strategy that adjusts color tokens based on the active instrument.

### 1.1 Base Theme (Deep Cosmic Void)
- **Background Primary (`--bg-primary`)**: `#05060b` (Deep Space Dark)
- **Background Secondary (`--bg-secondary`)**: `#0b0d18` (Nebula Midnight)
- **Background Tertiary (`--bg-tertiary`)**: `#121526` (Cosmic Obsidian)
- **Glass Panel Surface (`--glass-bg`)**: `rgba(18, 21, 38, 0.45)` (Unified translucent canvas)
- **Glass Border (`--glass-border`)**: `rgba(255, 255, 255, 0.06)` (Ultra-thin crisp boundary)

### 1.2 Interactive Accent Families
Depending on the active mode tag (`piano-mode` or `drum-mode` on the wrapper container), the system accents automatically transition.

| Token | HSL / Hex | Purpose | Accent Glow / Shadow |
| :--- | :--- | :--- | :--- |
| **`--accent-cyan`** | `hsl(180, 100%, 50%)` / `#00f0ff` | Classic Piano Accent, primary HUD | `0 0 20px rgba(0, 240, 255, 0.45)` |
| **`--accent-red`** | `hsl(343, 100%, 59%)` / `#ff3366` | Energetic Drum Accent, rhythm tags | `0 0 20px rgba(255, 51, 102, 0.45)` |
| **`--accent-purple`** | `hsl(271, 76%, 53%)` / `#8a2be2` | secondary decorative, text gradients | `0 0 20px rgba(138, 43, 226, 0.35)` |
| **`--accent-orange`** | `hsl(29, 100%, 50%)` / `#ff7b00` | Metronome, Warning warnings, Medium songs | `0 0 15px rgba(255, 123, 0, 0.4)` |
| **`--accent-green`** | `hsl(102, 100%, 54%)` / `#39ff14` | Accuracy badge, Perfect hits, Easy songs | `0 0 15px rgba(57, 255, 20, 0.4)` |

---

## 2. Glassmorphism & Depth Specs

All container panels must use the unified `.glass-card` styling rules to achieve a modern premium texture:
- **Opacity & Blur**: `backdrop-filter: blur(20px)` with `-webkit-backdrop-filter: blur(20px)`.
- **Double-Layer Border**: A thin light border (`1px solid rgba(255,255,255,0.06)`) that shifts to colored glowing borders on active focus.
- **Physical Shadows**: `box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5)`.
- **Glossy Overlay Gradient**: A top-down subtle gradient overlay (`linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%)`).

---

## 3. Typography & Gradients

- **Font Family**: `font-family: 'Outfit', 'Inter', -apple-system, sans-serif;`
  - *Outfit* is used for titles, logo, stats, and primary HUD badges to emphasize high-tech rhythm vibes.
  - *Inter* is used for body paragraphs, descriptions, song listings, and configurations to guarantee perfect readability.
- **Logo Gradient**: `linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-purple) 50%, var(--accent-red) 100%)`.
- **Heading Gradients**: Headings are decorated with high-contrast, double-layered gradients matching the selected instrument theme.

---

## 4. Tactile Virtual Instruments Specification

### 4.1 Realistic Virtual Piano (Piano Roll)
- **White Key Bevels**: White keys are rendered with glossy 3D keycaps, using vertical borders (`border-right: 2px solid rgba(0,0,0,0.25)`) and bottom 3D beveled edges (`border-bottom: 6px solid #b5b5b5`).
- **Tactile Depress Action**: Hitting a key sinks it physically (`border-bottom-width: 1px`, `transform: translateY(4px)`) and sweeps a radial gradient highlight from the center of the key.
- **Black Key Caps**: Black keys are raised with three-dimensional side shadows, high-contrast neon top borders, and scale on press.

### 4.2 Realistic Virtual Drum Kit (3D Mockup)
- **Drum Heads**: Overhauled snare, kick, and tom pads into circular glossy shapes representing genuine drum skins.
- **Metallic Cymbals**: Crash and Hi-Hat pads styled with gold/brass gradient sweeps and subtle concentric ring details.
- **Dynamic Vibrancy**: Striking a drum triggers a quick, responsive scale action (`transform: scale(0.96)`) and spawns a massive radial accent halo (`box-shadow: 0 0 35px var(--accent-color)`).

---

## 5. Micro-Interactions & Animation Guide

- **Hover Scales**: Interactive items (instrument cards, song entries, header actions) must scale up (`transform: scale(1.02) translateY(-4px)`) with smooth transitions (`cubic-bezier(0.4, 0, 0.2, 1)`).
- **Metronome Organic Pulsing**: The metronome heartbeat indicator beats with a scaling radial neon pulse to accurately translate timing guides.
- **Diagonal Zebra Progress Lines**: The practice progress bars slide with elegant diagonal neon stripes that glide forward when practice runs.
- **Floating Judgment Rating popups**: Rhythm hitting results (`PERFECT`, `GREAT`, `GOOD`, `MISS`) float upwards with customized scale bursts, glowing letters, and ease-out opacity shifts.
