/**
 * PuniCodex — The Möbius Ribbon (PC/FX scene, /lexicon/)
 *
 * Ninety glyphs from the lexicon's script traditions flow along a Möbius
 * strip — the one-sided surface. Parametrization (R = 1, half-width w):
 *   x = (R + v·cos(u/2))·cos u
 *   y = (R + v·cos(u/2))·sin u
 *   z = v·sin(u/2)          u ∈ [0, 2π), v ∈ [-w, w]
 * Each glyph keeps its own v while u advances with time; because the strip
 * is single-sided, a glyph that completes the circuit returns flipped onto
 * the "other" face — the twist is the exhibit. Hairline boundary curves at
 * v = ±w (plus a faint centre seam) trace the surface itself.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const R_STRIP = 1;
  const HALF_W = 0.35;
  const FLOW = 90;
  const SCALE = 1 / (R_STRIP + HALF_W); // normalize extents to ±1
  const PHI_FRAC = 0.6180339887498949;
  const BUCKET_ALPHA = [0.18, 0.45, 1];

  // A cross-section of the lexicon's scripts for the flowing river.
  const FLOW_SETS = [
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

  function stripPoint(u, v) {
    const c = Math.cos(u / 2);
    const s = Math.sin(u / 2);
    const rr = R_STRIP + v * c;
    return {
      x: rr * Math.cos(u) * SCALE,
      y: rr * Math.sin(u) * SCALE,
      z: v * s * SCALE,
    };
  }

  // Depth-graded hairline polyline (same bucketing as the council scene).
  function strokeGraded(ctx, project, pts, cx, cy, orbit, baseAlpha) {
    let prev = null;
    let bucket = -1;
    let drawing = false;
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const pr = project(pts[i].x, pts[i].y, pts[i].z, cx, cy, orbit);
      const d = Math.max(0, Math.min(1, (pr.z + 0.85) / 1.7));
      const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
      if (!drawing) {
        ctx.beginPath();
        ctx.moveTo(pr.sx, pr.sy);
        bucket = b;
        drawing = true;
      } else if (b !== bucket) {
        ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(prev.sx, prev.sy);
        ctx.lineTo(pr.sx, pr.sy);
        bucket = b;
      } else {
        ctx.lineTo(pr.sx, pr.sy);
      }
      prev = pr;
    }
    if (drawing) {
      ctx.strokeStyle = `rgba(212,175,55,${baseAlpha * BUCKET_ALPHA[bucket]})`;
      ctx.stroke();
    }
  }

  function attach(canvas) {
    const glyphs = PCFX.buildAtlas(
      FLOW_SETS.map((key) => PCFX.SCRIPTS[key]),
      TINTS,
      SPRITE
    );
    if (glyphs.length === 0) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // The river: fixed v per glyph, u advancing with time. Deterministic
    // picks so the reduced-motion still is a stable composition.
    const members = [];
    for (let j = 0; j < FLOW; j++) {
      members.push({
        u0: (j / FLOW) * Math.PI * 2,
        v: HALF_W * 0.92 * (2 * ((j * PHI_FRAC) % 1) - 1),
        glyph: glyphs[((j * 89) % glyphs.length + glyphs.length) % glyphs.length],
        size: 0.6 + (((j * 11) % 10) / 10) * 0.55,
        phase: (((j * 13) % 20) / 20) * Math.PI * 2,
        twinkle: 0.7 + ((j % 7) / 7) * 1.2,
      });
    }

    // Boundary curves (v = ±w) and the centre seam (v = 0), 160 points each.
    const EDGE_PTS = 160;
    const edges = [HALF_W, -HALF_W, 0].map((v) => {
      const pts = [];
      for (let s = 0; s <= EDGE_PTS; s++) pts.push(stripPoint((s / EDGE_PTS) * Math.PI * 2, v));
      return pts;
    });

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 12500,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.46;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.07 + state.pointer.x * 0.3;
        const rotX = 0.6 + Math.sin(t * 0.07) * 0.05 + state.pointer.y * 0.18;
        const project = PCFX.makeProjector(rotY, rotX, 3.4);

        // Ambient core glow.
        const nebR = R * 0.85;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // The surface itself: two boundary curves, then the fainter seam.
        strokeGraded(ctx, project, edges[0], CX, CY, R, 0.62);
        strokeGraded(ctx, project, edges[1], CX, CY, R, 0.62);
        strokeGraded(ctx, project, edges[2], CX, CY, R, 0.16);

        // Glyphs flowing along the strip, depth-sorted back to front.
        const projected = members
          .map((m) => {
            const p = stripPoint(m.u0 + t * 0.12, m.v);
            return { m, pr: project(p.x, p.y, p.z, CX, CY, R) };
          })
          .sort((a, b) => a.pr.z - b.pr.z);
        for (const { m, pr } of projected) {
          const depth = Math.max(0, Math.min(1, (pr.z + 0.85) / 1.7));
          const tier = depth > 0.58 ? 0 : depth > 0.36 ? 1 : 2;
          const tw = 0.82 + 0.18 * Math.sin(t * m.twinkle + m.phase);
          const alpha = (0.14 + depth * depth * 0.92) * tw;
          const size = SPRITE * m.size * pr.scale * 0.34;
          if (pr.z > 0.4) {
            const gSize = size * 3.8;
            ctx.globalAlpha = (pr.z - 0.4) * 0.7 * tw;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(m.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-mobius').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
