# Ninurta Hero Canvas Effect — Standardization Report

## What changed

- Rewrote `.superpowers/mesopotamian-batch/ninurta/effect.js` to match the PuniCodex flagship production pattern (see `templates/flagship/effects/angrboda.js`).
- Converted from a UMD factory exporting `init/destroy/draw/metadata` into a self-executing IIFE that starts itself.
- Canvas lookup now uses `document.getElementById('ninurta-hero-canvas')`.
- Reads `data-primary` / `data-secondary` hex colors from the canvas element with fallbacks:
  - Primary: `#8c5e2e` (bronze)
  - Secondary: `#6b7d8f` (storm)
- Preserved the original visual theme: slow cyclone, central bronze mace, drifting Kur stones settling into furrows, ambient motes.
- Added DPR-aware canvas sizing and resize listener (matches the angrboda template).
- Kept `prefers-reduced-motion` support: animation renders one frame when reduced motion is requested.
- Removed all exports; the effect is now self-contained.

## Files created/updated

- `.superpowers/mesopotamian-batch/ninurta/effect.js` — rewritten
- `.superpowers/mesopotamian-batch/ninurta/effect-registry.json` — new
- `.superpowers/mesopotamian-batch/ninurta/effect-report.md` — new

## Verification

- `node --check .superpowers/mesopotamian-batch/ninurta/effect.js` passes.
