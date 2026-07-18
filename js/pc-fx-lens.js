/**
 * PuniCodex — The Lens (PC/FX scene, /search.html)
 *
 * Scrutiny over the Unicode namespace: a field of small glyphs from every
 * indexed script tradition drifts slowly behind a circular lens. The lens
 * roams the field on a Lissajous path —
 *   cx = CX + 0.16·W·sin(0.23·t + 1.2)
 *   cy = CY + 0.14·H·sin(0.37·t)
 * Glyphs inside the circle render ~1.8× larger and brighter, displaced
 * radially outward by a fake-refraction bulge m(d) = 1 + 0.14·(1 − (d/R)²)
 * (strongest at the centre, zero at the rim, so the field stays continuous
 * across the boundary). The rim is a hairline gold circle with a subtle
 * chromatic edge — warm and cool ghosts offset either side.
 *
 * 2D canvas built on window.PCFX (js/pc-fx-core.js). The search page
 * re-renders its empty state via innerHTML, so this module also exposes
 * PCFX.initLens(root) for re-attachment and stops its loop if its canvas
 * is removed from the document. Reduced motion renders one static frame.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const FIELD = 150;
  const PHI_FRAC = 0.6180339887498949;
  const MAGNIFY = 1.8;
  const BULGE = 0.14;

  // A cross-section of the index — same spirit as the lexicon river.
  const FIELD_SETS = [
    'greek',
    'runes',
    'hieroglyphs',
    'cuneiform',
    'devanagari',
    'hebrew',
    'arabic',
    'cjk',
    'kana',
    'cyrillic',
    'ogham',
    'phoenician',
  ];

  function attach(canvas) {
    if (canvas.__pcfxLensAttached) return;
    canvas.__pcfxLensAttached = true;
    const glyphs = PCFX.buildAtlas(
      FIELD_SETS.map((key) => PCFX.SCRIPTS[key]),
      TINTS,
      SPRITE
    );
    if (glyphs.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // Deterministic field: positions, drift velocities, sizes, tints.
    const members = [];
    for (let i = 0; i < FIELD; i++) {
      const h1 = (i * PHI_FRAC) % 1;
      const h2 = (i * PHI_FRAC * 1.517) % 1;
      const h3 = (i * PHI_FRAC * 2.291) % 1;
      const h4 = (i * PHI_FRAC * 3.097) % 1;
      members.push({
        glyph: glyphs[(i * 53 + ((h3 * 191) | 0)) % glyphs.length],
        x0: h1,
        y0: h2,
        vx: (h3 - 0.5) * 0.022, // fractions of stage size per second
        vy: (h4 - 0.5) * 0.017,
        size: 0.55 + h4 * 0.5,
        tint: h1 < 0.4 ? 1 : 2, // dim gold or slate outside the lens
        tw: 0.6 + h2 * 0.8, // twinkle rate
        ph: h3 * Math.PI * 2,
      });
    }

    let W = 0;
    let H = 0;

    PCFX.createScene({
      canvas,
      // t = 4.2s: the lens rests lower-right of centre with a crowd of
      // glyphs inside — the still reads as an inspection in progress.
      reducedT: 4200,
      onResize(state) {
        W = state.w;
        H = state.h;
      },
      onFrame(state, t) {
        const { ctx } = state;
        // The empty state re-renders via innerHTML; a detached canvas
        // stops its own loop instead of drawing into the void.
        if (!canvas.isConnected) {
          state.running = false;
          return;
        }
        ctx.clearRect(0, 0, W, H);

        const CX = W / 2;
        const CY = H / 2;
        const RL = Math.min(W, H) * 0.31;
        // Roam amplitudes keep the whole rim inside the stage on any screen.
        const lx = CX + W * 0.16 * Math.sin(0.23 * t + 1.2);
        const ly = CY + H * 0.14 * Math.sin(0.37 * t);
        const baseSize = (Math.min(W, H) / 300) * SPRITE * 0.27;

        // Faint sheen inside the lens.
        const sheen = RL * 2;
        ctx.globalAlpha = 0.1;
        ctx.drawImage(glow, lx - sheen / 2, ly - sheen / 2, sheen, sheen);
        ctx.globalAlpha = 1;

        for (const m of members) {
          // Drift with wraparound (positions in stage fractions).
          const fx = (((m.x0 + m.vx * t) % 1) + 1) % 1;
          const fy = (((m.y0 + m.vy * t) % 1) + 1) % 1;
          const x = fx * W;
          const y = fy * H;
          const dx = x - lx;
          const dy = y - ly;
          const d = Math.hypot(dx, dy);
          const twinkle = 0.8 + 0.2 * Math.sin(t * m.tw + m.ph);

          if (d < RL) {
            // Inside: refracted — pushed radially outward, magnified, lit.
            const mFactor = 1 + BULGE * (1 - (d / RL) ** 2);
            const rx = lx + dx * mFactor;
            const ry = ly + dy * mFactor;
            const size = baseSize * m.size * MAGNIFY;
            ctx.globalAlpha = Math.min(1, (0.7 + 0.3 * (1 - d / RL)) * twinkle);
            ctx.drawImage(m.glyph.sprites[0], rx - size / 2, ry - size / 2, size, size);
          } else {
            const size = baseSize * m.size;
            ctx.globalAlpha = 0.45 * twinkle;
            ctx.drawImage(m.glyph.sprites[m.tint], x - size / 2, y - size / 2, size, size);
          }
        }
        ctx.globalAlpha = 1;

        // The rim: chromatic ghosts first, then the hairline gold circle.
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(245,227,168,0.3)';
        ctx.beginPath();
        ctx.arc(lx + 1.4, ly + 1.0, RL, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(126,150,210,0.25)';
        ctx.beginPath();
        ctx.arc(lx - 1.4, ly - 1.0, RL, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(212,175,55,0.85)';
        ctx.beginPath();
        ctx.arc(lx, ly, RL, 0, Math.PI * 2);
        ctx.stroke();
      },
    });
  }

  function init(root) {
    (root || document).querySelectorAll('canvas.pc-fx-lens').forEach(attach);
  }
  // The search page re-injects its empty state; let it re-attach the scene.
  PCFX.initLens = init;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
