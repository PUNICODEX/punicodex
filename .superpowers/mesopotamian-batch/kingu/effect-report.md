# Kingu Hero Canvas Effect — Standardization Report

## What changed

Rewrote `.superpowers/mesopotamian-batch/kingu/effect.js` to match the project's production flagship-canvas pattern (see `templates/flagship/effects/angrboda.js`).

- **Self-executing IIFE**: removed the exported `{ init, resize, draw, destroy, metadata }` API and the `global.kinguEffect` / `module.exports` branches. The effect now starts automatically when the script loads.
- **Canvas id**: changed from `kingu-canvas` to `kingu-hero-canvas`, accessed with `document.getElementById('kingu-hero-canvas')`.
- **Theme-aware colors**: reads `data-primary` (fallback `#8a1c1c`) and `data-secondary` (fallback `#c9a227`) via hex-to-RGB helpers, matching the crimson/gold Blood-Nebula palette.
- **DPR + resize**: now uses `window.devicePixelRatio` capped at 2, sets backing-store size and `ctx.setTransform(dpr, …)`, and rebuilds the dragon on resize.
- **Reduced motion**: honours `prefers-reduced-motion`; reduced mode renders a static tablet and 30 ember stars.
- **Animation loop**: calls `requestAnimationFrame(draw)` internally; initial `draw()` is invoked directly.

## Preserved visuals

- Slow-drifting crimson nebula background.
- Coiling dragon silhouette built from glowing vertebrae segments.
- Pulsing golden Tablet of Destinies at the center with cuneiform wedge marks.
- Falling blood droplets that ignite into tiny human-shaped stars.
- Background ember stars.

## New registry

Added `.superpowers/mesopotamian-batch/kingu/effect-registry.json`:

```json
{"kingu": {"canvasId": "kingu-hero-canvas"}}
```

## Verification

Syntax checked with `node --check .superpowers/mesopotamian-batch/kingu/effect.js`.
