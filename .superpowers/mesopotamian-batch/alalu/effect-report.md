# Alalu Hero Effect Standardization

## What changed

- Rewrote `.superpowers/mesopotamian-batch/alalu/effect.js` from an exported
  `init/resize/draw/destroy` API into a self-executing IIFE that boots on load,
  matching the production pattern in `templates/flagship/effects/angrboda.js`.
- Canvas lookup now uses `document.getElementById('alalu-hero-canvas')`.
- Added `data-primary` / `data-secondary` color reads with fallbacks
  `#d4af37` (gold) and `#8a7fb5` (muted purple), preserving the celestial
  throne palette.
- Added DPR handling, `ctx.setTransform`, and `canvas.style.width/height` sizing
  on resize.
- `prefers-reduced-motion: reduce` now renders one static frame and stops the
  animation loop.
- The effect no longer exports anything; it starts itself with `draw()`.
- Added a cleanup listener on `beforeunload`.

## Preserved

- Rising golden/warm motes, drifting cuneiform-style glyphs, faint throne
  silhouette, central pole-star glow, and ambient indigo radial gradient.
- Entity counts, speeds, alphas, and the overall primordial-sovereignty mood.

## Artifacts

- `.superpowers/mesopotamian-batch/alalu/effect.js` — standardized canvas effect
- `.superpowers/mesopotamian-batch/alalu/effect-registry.json` —
  `{"alalu": {"canvasId": "alalu-hero-canvas"}}`
- Syntax verified with `node --check`.
