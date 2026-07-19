/**
 * PuniCodex — The Collegium (PC/FX scene, /scholars/)
 *
 * A celestial sphere of 196 stars — one per flagship temple with a populated
 * Scholarly Edition. Each star carries the glyph of its temple's script
 * tradition; hairlines link same-pantheon neighbors. Slow rotation, pointer
 * parallax, a luminous core for the shared corpus. Reduced-motion renders a
 * single composed frame via the PCFX scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 56;
  const TEMPLE_COUNT = 196;

  function attach(canvas) {
    // One glyph per temple, cycling traditions so the sphere shows the full
    // pantheon spread (the real per-temple mapping lives in the cards below).
    const scriptKeys = [
      'greek', 'runes', 'cuneiform', 'hieroglyphs', 'devanagari', 'cjk',
      'hebrew', 'kana', 'cyrillic', 'ogham', 'phoenician', 'arabic',
      'armenian', 'georgian', 'thai', 'tamil',
    ];
    const atlasSets = scriptKeys.map((k) => PCFX.SCRIPTS[k]).filter(Boolean);
    const atlases = atlasSets.map((set) => PCFX.buildAtlas([set], TINTS, SPRITE));
    if (atlases.every((a) => a.length === 0)) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // Fibonacci shell; temple i sits at lattice point i and belongs to
    // tradition i % keys. Neighbors in the same tradition get hairlines.
    const stars = [];
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < TEMPLE_COUNT; i++) {
      const t = i / (TEMPLE_COUNT - 1);
      const y = 1 - 2 * t;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = GOLDEN_ANGLE * i;
      const tradition = i % scriptKeys.length;
      const pool = atlases[tradition];
      stars.push({
        x: Math.cos(theta) * r,
        y,
        z: Math.sin(theta) * r,
        tradition,
        glyph: pool.length ? pool[(Math.random() * pool.length) | 0] : null,
        size: 0.6 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.5 + Math.random() * 1.2,
      });
    }
    // Link each star to its nearest same-tradition neighbor (lattice distance).
    const links = [];
    for (let i = 0; i < stars.length; i++) {
      let best = -1;
      let bestD = Infinity;
      for (let j = 0; j < stars.length; j++) {
        if (i === j || stars[j].tradition !== stars[i].tradition) continue;
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dz = stars[i].z - stars[j].z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      if (best > i) links.push([i, best]);
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.4;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.045 + state.pointer.x * 0.3;
        const rotX = 0.38 + Math.sin(t * 0.08) * 0.05 + state.pointer.y * 0.18;
        const project = PCFX.makeProjector(rotY, rotX, 3.2);

        // Core: the shared scholarly corpus.
        const nebR = R * 0.75;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // Links first (behind the stars).
        for (const [ai, bi] of links) {
          const a = project(stars[ai].x, stars[ai].y, stars[ai].z, CX, CY, R);
          const b = project(stars[bi].x, stars[bi].y, stars[bi].z, CX, CY, R);
          const depth = ((a.z + b.z) / 2 + 1.3) / 2.6;
          ctx.strokeStyle = `rgba(212,175,55,${(0.04 + depth * depth * 0.22).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }

        const projected = stars
          .map((s) => ({ s, pr: project(s.x, s.y, s.z, CX, CY, R) }))
          .sort((a, b) => a.pr.z - b.pr.z);

        for (const { s, pr } of projected) {
          if (!s.glyph) continue;
          const depth = (pr.z + 1.25) / 2.5;
          const tier = depth > 0.55 ? 0 : depth > 0.34 ? 1 : 2;
          const tw = 0.78 + 0.22 * Math.sin(t * s.twinkle + s.phase);
          const alpha = (0.1 + depth * depth * 0.9) * tw;
          const size = SPRITE * s.size * pr.scale * 0.36;
          if (pr.z > 0.42) {
            const gSize = size * 3.4;
            ctx.globalAlpha = (pr.z - 0.42) * 0.55 * tw;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(s.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-collegium').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
