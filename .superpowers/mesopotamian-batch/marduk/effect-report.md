# Marduk Hero Effect Standardization Report

## What changed

- Rewrote `.superpowers/mesopotamian-batch/marduk/effect.js` to match the PuniCodex production pattern used by `templates/flagship/effects/angrboda.js`.
- Converted from a UMD factory (`module.exports` / `root.mardukEffect`) with an external `init()` API to a self-executing IIFE that starts automatically.
- Canvas is now fetched with `document.getElementById('marduk-hero-canvas')`.
- Reads `data-primary` (fallback `#1a3a5c` — lapis) and `data-secondary` (fallback `#d4af37` — gold) from the canvas element.
- Added DPR-aware resize: `devicePixelRatio` capped at 2, CSS pixel sizing via `setTransform`.
- Replaced the old reduced-motion behavior (hiding the canvas) with the production pattern: render one static frame and skip `requestAnimationFrame`.
- Preserved the original visual elements:
  - Deep lapis radial background with Babylonian city silhouette.
  - Winged solar disc with pulsing halo and downward gold beam.
  - Four rotating wind streams.
  - Drifting cuneiform glyph sparks.
  - Occasional storm flashes.
  - Twinkling star field.
  - Subtle pointer parallax (mouse only).
  - Tab visibility pause/resume.
- Created `.superpowers/mesopotamian-batch/marduk/effect-registry.json` mapping `marduk` to `marduk-hero-canvas`.
- Verified syntax with `node --check .superpowers/mesopotamian-batch/marduk/effect.js`.
