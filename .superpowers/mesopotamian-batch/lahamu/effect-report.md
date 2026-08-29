# Lahamu Hero Effect Standardization

## Changes

- Rewrote `effect.js` from a CommonJS module (`module.exports { init, resize, draw, destroy }`) into a self-executing IIFE that auto-initializes, matching the production pattern used by `templates/flagship/effects/angrboda.js`.
- Now fetches the canvas with `document.getElementById('lahamu-hero-canvas')`.
- Reads `data-primary` / `data-secondary` hex colors from the canvas with theme-matching fallbacks (`#6a8a94` and `#c4b6a0`).
- Added DPR-aware resize handling (`devicePixelRatio` capped at 2, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`).
- Reseeds strands and motes on resize so density stays proportional to viewport size.
- Respects `prefers-reduced-motion: reduce` by rendering one frame and skipping `requestAnimationFrame` loops.
- Removed exported lifecycle functions and `destroy()` cleanup; the effect self-starts and runs for the lifetime of the page.

## Preserved

- Deep primordial gradient background (`#14202b` → `#0f1a24` → `#0a1219`).
- T upward-drifting hair-like strands with tapered sine-wave undulation.
- Suspended golden/teal motes with slow vertical drift and horizontal wobble.
- Strand depth sorting, secondary highlight strand, and original motion speeds.

## Artifacts Added

- `effect-registry.json`: maps `lahamu` to `lahamu-hero-canvas`.
- `effect-report.md`: this file.
