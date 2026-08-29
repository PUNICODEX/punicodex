# Nergal hero canvas effect refactor

## What changed

- Rewrote `.superpowers/mesopotamian-batch/nergal/effect.js` as a self-executing IIFE that auto-starts on `document.getElementById('nergal-hero-canvas')`, matching the production pattern used by `templates/flagship/effects/angrboda.js`.
- Removed the UMD wrapper and public `init`/`destroy`/`metadata` API; the script no longer exports anything.
- Reads the canvas `data-primary` and `data-secondary` attributes with fallback colors `#C25E00` (furnace orange) and `#8B2E2E` (underworld crimson) and derives effect colors from them.
- Preserved the original visual layers:
  - Subterranean furnace radial glow
  - Drifting smoke
  - Faint cuneiform glyphs
  - Pulsing lion eyes
  - Rising embers
- Retained `prefers-reduced-motion` support: renders one frame and skips `requestAnimationFrame` when reduced motion is requested.
- Retained DPR-aware canvas sizing and a window resize listener that reseeds particles for the new viewport.
- Added `effect-registry.json` mapping `nergal` to `nergal-hero-canvas`.

## Verification

- `node --check .superpowers/mesopotamian-batch/nergal/effect.js` passes.
