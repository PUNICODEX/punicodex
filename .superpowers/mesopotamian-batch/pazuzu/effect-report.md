# Pazuzu Hero Canvas Effect — Standardization Report

## Changes
- Rewrote `effect.js` from a CommonJS module (`module.exports = { init, resize, draw, destroy, metadata }`) into a self-executing IIFE that matches the project's production flagship effect pattern (e.g. `templates/flagship/effects/angrboda.js`).
- Canvas is now acquired with `document.getElementById('pazuzu-hero-canvas')`.
- Primary and secondary theme colors are read from `data-primary` / `data-secondary` attributes with fallbacks `#a86f4b` (terracotta/bronze sigil) and `#c9a85c` (bronze glints).
- The effect self-starts by calling `draw()` and schedules frames with `requestAnimationFrame(draw)`; nothing is exported.
- Preserved the existing visual theme: dark desert-wind gradient, faint primary haze, horned apotropaic sigil, 140 drifting dust motes, and occasional bronze amulet glints.
- Added `prefers-reduced-motion` support: one static frame is rendered; particle motion and glint spawning are paused, matching the angrboda pattern.
- DPR-aware resize handling is retained and bound to `window.resize`.

## Files touched
- `.superpowers/mesopotamian-batch/pazuzu/effect.js` — rewritten in place.
- `.superpowers/mesopotamian-batch/pazuzu/effect-registry.json` — created.
- `.superpowers/mesopotamian-batch/pazuzu/effect-report.md` — created.

## Verification
- `node --check .superpowers/mesopotamian-batch/pazuzu/effect.js` passed.
