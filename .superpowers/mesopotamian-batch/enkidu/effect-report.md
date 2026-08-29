# Enkidu Hero Canvas Effect — Standardization Report

## What changed

- Rewrote `effect.js` from an exported `EnkiduEffect` object into a self-executing IIFE that auto-initializes on the temple page.
- Canvas is now retrieved with `document.getElementById('enkidu-hero-canvas')` instead of being passed in from the consumer.
- Added `readColor()` helper that reads `data-primary` / `data-secondary` attributes from the canvas element, with theme-matching hex fallbacks (`#8B5A2B` and `#C4A77D`).
- Mapped primary/secondary colors onto the existing visual elements:
  - **Primary (#8B5A2B)** → clay motes, twin-pulse heartbeat dots.
  - **Secondary (#C4A77D)** → watering-hole ripples, twin-pulse bond line, gazelles.
- Preserved the original atmosphere colors (night-steppe sky gradient, dark water, starlight, reed silhouettes).
- Kept `prefers-reduced-motion` support: animation loop runs one frame only when reduced motion is requested.
- Kept DPR scaling (capped at 2×) and a window resize listener that re-seeds the scene.
- Removed `module.exports`; the script now runs standalone and calls `requestAnimationFrame(draw)` itself.
- Added `effect-registry.json` identifying the canvas ID for the Enkidu flagship.

## Verification

- `node --check .superpowers/mesopotamian-batch/enkidu/effect.js` passed.
