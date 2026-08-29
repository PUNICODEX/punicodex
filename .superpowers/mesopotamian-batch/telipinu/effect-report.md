# Telipinu Hero Canvas Effect Refactor

## What changed

- Rewrote `.superpowers/mesopotamian-batch/telipinu/effect.js` to match the PuniCodex flagship production pattern (`templates/flagship/effects/angrboda.js`).
- Converted from a CommonJS module (`module.exports = { init, resize, draw, destroy, metadata }`) to a self-executing IIFE that auto-initializes.
- Updated canvas lookup to `document.getElementById('telipinu-hero-canvas')`.
- Added `data-primary` / `data-secondary` color reads with hex-to-RGB conversion and theme-matching fallbacks:
  - primary: `#c9a227` (fertile gold)
  - secondary: `#4a7c59` (Anatolian green)
- Applied the read colors to the divine sun-glow so temple CSS can influence the palette without editing the script.
- Preserved the existing visual theme: dark Anatolian sky, breathing grain field, swaying stalks, wandering path-motes, and bee-messenger with trail.
- Kept `prefers-reduced-motion` support: when enabled, a single static frame is drawn and `requestAnimationFrame` is not requeued.
- Kept DPR-aware canvas sizing and a resize listener; added `canvas.style.width/height` sizing to match the production pattern.
- Removed the exported API, the metadata object, and the explicit `destroy()` / `init()` entry points; the effect now starts itself when the script loads.
- Added `effect-registry.json` mapping `telipinu` to `telipinu-hero-canvas`.

## Verification

- Syntax checked with `node --check .superpowers/mesopotamian-batch/telipinu/effect.js` — passes.
