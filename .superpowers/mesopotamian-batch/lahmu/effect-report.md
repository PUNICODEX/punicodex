# Lahmu Hero Canvas Effect Standardization

## What changed

- Converted `.superpowers/mesopotamian-batch/lahmu/effect.js` from a CommonJS module (`module.exports = { init, ... }`) into a self-executing IIFE matching the production pattern used by `templates/flagship/effects/angrboda.js`.
- The effect now auto-initializes on `document.getElementById('lahmu-hero-canvas')` and calls `requestAnimationFrame(draw)` itself.
- Reads theme colors from canvas attributes:
  - `data-primary` (fallback `#c98a4b` — ochre / warm clay)
  - `data-secondary` (fallback `#e3b268` — gold / silt highlight)
- Preserved the original visual theme: warm radial background, top shadow fall, swaying hair-like strands, guarded gate silhouette, and rising silt motes.
- Kept mouse-driven wind influence for non-touch pointers.
- Added `prefers-reduced-motion` support: a single static frame is rendered when reduced motion is preferred.
- Added DPR-aware resize handling with `canvas.style.width/height` sizing.
- Removed the exported API surface (`init`, `resize`, `draw`, `destroy`, `metadata`); the file no longer exports anything.

## Files touched

- `.superpowers/mesopotamian-batch/lahmu/effect.js` (rewritten)
- `.superpowers/mesopotamian-batch/lahmu/effect-registry.json` (new)
- `.superpowers/mesopotamian-batch/lahmu/effect-report.md` (new)
