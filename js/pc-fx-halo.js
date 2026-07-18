/**
 * PuniCodex — Temple Glyph Halo (PC/FX scene)
 *
 * Per-temple procedural emblem: a ring of glyphs drawn from the deity's own
 * script tradition, orbiting behind the hero mascot. Greek temples get Greek
 * letters, Norse temples get runes, Mesopotamian get cuneiform, and so on —
 * resolved from the canvas's data-pantheon attribute. A second, smaller ring
 * counter-rotates inside for depth. Mascots stay untouched: the halo renders
 * behind them (z-index handled by CSS) and is aria-hidden.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;

  function scriptSetFor(pantheon) {
    const mapped = PCFX.PANTHEON_SCRIPTS[pantheon] || PCFX.PANTHEON_SCRIPTS.greek;
    if (typeof mapped === 'string') return PCFX.SCRIPTS[mapped] || PCFX.SCRIPTS.greek;
    return mapped;
  }

  function attach(canvas) {
    const pantheon = canvas.dataset.pantheon || 'greek';
    const set = scriptSetFor(pantheon);
    const glyphs = PCFX.buildAtlas([set], TINTS, SPRITE);
    if (glyphs.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    const OUTER = 52;
    const INNER = 26;
    const outer = [];
    const inner = [];
    for (let i = 0; i < OUTER; i++) {
      outer.push({
        angle: (i / OUTER) * Math.PI * 2,
        glyph: glyphs[(Math.random() * glyphs.length) | 0],
        size: 0.7 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.7 + Math.random() * 1.3,
      });
    }
    for (let i = 0; i < INNER; i++) {
      inner.push({
        angle: (i / INNER) * Math.PI * 2,
        glyph: glyphs[(Math.random() * glyphs.length) | 0],
        size: 0.5 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.7 + Math.random() * 1.3,
      });
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h * 0.34; // the mascot lives in the canvas's top third
        R = Math.min(state.w, state.h) * 0.46;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.22 + state.pointer.x * 0.25;
        const tilt = 1.12 + Math.sin(t * 0.1) * 0.03 + state.pointer.y * 0.08;
        const project = PCFX.makeProjector(rotY, tilt, 3.4);

        // Ambient core glow behind the mascot.
        const nebR = R * 0.9;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        function drawRing(members, radius, dir, sizeBase) {
          const sorted = members
            .map((m) => {
              const a = m.angle + t * 0.22 * dir;
              const pr = project(Math.cos(a) * radius, Math.sin(a) * radius, 0, CX, CY, R);
              return { m, pr };
            })
            .sort((x, y) => x.pr.z - y.pr.z);
          for (const { m, pr } of sorted) {
            const depth = (pr.z + 1.3) / 2.6;
            const tier = depth > 0.55 ? 0 : depth > 0.34 ? 1 : 2;
            const tw = 0.8 + 0.2 * Math.sin(t * m.twinkle + m.phase);
            const alpha = (0.08 + depth * depth * 0.92) * tw;
            const size = SPRITE * m.size * pr.scale * sizeBase;
            if (pr.z > 0.4) {
              const gSize = size * 3.6;
              ctx.globalAlpha = (pr.z - 0.4) * 0.55 * tw;
              ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
            }
            ctx.globalAlpha = Math.min(1, alpha);
            ctx.drawImage(m.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
          }
          ctx.globalAlpha = 1;
        }

        drawRing(outer, 1.0, 1, 0.42);
        drawRing(inner, 0.66, -1.35, 0.3);
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.temple-halo').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
