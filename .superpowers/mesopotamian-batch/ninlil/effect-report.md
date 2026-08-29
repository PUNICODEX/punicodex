# Ninlil Hero Effect Standardization Report

## Changes Made
- Rewrote `effect.js` from a UMD module (`init`/`resize`/`draw`/`destroy` exports) to a self-executing IIFE that auto-initializes, matching the production pattern used by `templates/flagship/effects/angrboda.js`.
- Canvas is now selected with `document.getElementById('ninlil-hero-canvas')`.
- Reads `data-primary` and `data-secondary` attributes from the canvas with hex fallbacks (`#d8c6a0` warm sand, `#a8c4d9` cool air/moonlight).
- Preserved the visual theme: warm Sumerian twilight gradient, drifting wind-ribbons, grain-seed motes, cuneiform breath-glyphs, and reed sheaves.
- Retained DPR/resize handling and `prefers-reduced-motion` support (renders one static frame when reduced motion is requested).
- Removed the exported API surface; the effect no longer returns anything.

## Files
- `.superpowers/mesopotamian-batch/ninlil/effect.js` — rewritten IIFE.
- `.superpowers/mesopotamian-batch/ninlil/effect-registry.json` — registry mapping `ninlil` to `ninlil-hero-canvas`.
