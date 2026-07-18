/**
 * PuniCodex — The Council of Twenty-Two (PC/FX scene, /pantheon/)
 *
 * One sphere, twenty-two seats: the sphere is partitioned into 22 longitude
 * wedges and each wedge holds a small constellation of glyphs drawn from a
 * single script tradition (Greek capitals, runes, hieroglyphs, cuneiform,
 * devanagari, kana, CJK, Hebrew, Arabic, Cyrillic, Armenian, Georgian, Thai,
 * Tamil, Ogham, Phoenician, Latin, …). Repeated scripts are sliced into
 * disjoint subsets so no two neighbouring wedges share an inventory.
 * Hairline meridians separate the wedges at very low alpha; the whole
 * assembly rotates slowly with a gentle per-cluster shimmer.
 *
 * Built on window.PCFX (js/pc-fx-core.js) — same engine as the home orrery
 * and the temple halos. Reduced motion renders a single static frame.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const WEDGES = 22;
  const CLUSTER = 12;
  const PHI_FRAC = 0.6180339887498949;
  const BUCKET_ALPHA = [0.18, 0.45, 1]; // far / mid / near, × baseAlpha

  function codePoints(str) {
    return Array.from(str);
  }
  function subset(set, a, b) {
    return { font: set.font, chars: codePoints(set.chars).slice(a, b) };
  }

  // Stable wedge → script ordering (index = seat number). Sourced from
  // PCFX.SCRIPTS plus the Latin set registered in PCFX.PANTHEON_SCRIPTS.
  function wedgeSets() {
    const S = PCFX.SCRIPTS;
    return [
      subset(S.greek, 0, 24), // Greek — capitals
      S.runes, // Norse
      S.hieroglyphs, // Egyptian
      subset(S.devanagari, 0, 20), // Sanskrit
      S.hebrew, // Hebrew
      subset(S.cjk, 0, 12), // Chinese
      S.kana, // Japanese
      subset(S.cyrillic, 0, 14), // Slavic
      S.armenian, // Armenian
      S.thai, // Thai
      S.ogham, // Celtic
      S.phoenician, // Phoenician
      subset(S.cuneiform, 0, 8), // Mesopotamian
      PCFX.PANTHEON_SCRIPTS.latin, // Latin traditions
      S.arabic, // Arabian / Avestan
      S.georgian, // Georgian
      S.tamil, // Tamil
      subset(S.greek, 24), // Greek minuscules + accents
      subset(S.cuneiform, 8), // Hittite
      subset(S.cjk, 12), // Taoist / block glyphs
      subset(S.cyrillic, 14), // Baltic
      subset(S.devanagari, 20), // Buddhist
    ];
  }

  // Depth-graded hairline polyline: consecutive same-bucket segments are
  // stroked as one path so wedge lines read as continuous curves.
  function strokeGraded(ctx, project, pts, cx, cy, orbit, baseAlpha) {
    let prev = null;
    let bucket = -1;
    let drawing = false;
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const pr = project(pts[i].x, pts[i].y, pts[i].z, cx, cy, orbit);
      const d = (pr.z + 1) / 2;
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
    const pools = wedgeSets().map((set) => PCFX.buildAtlas([set], TINTS, SPRITE));
    if (pools.every((pool) => pool.length === 0)) return;
    const glow = PCFX.makeGlowSprite('212,175,55');

    // Cluster members: a small golden-angle patch inside each wedge, kept
    // clear of the poles and the meridian lines. Placement is deterministic
    // so the reduced-motion still is always the same composition.
    const members = [];
    const wedgeW = (Math.PI * 2) / WEDGES;
    for (let i = 0; i < WEDGES; i++) {
      const pool = pools[i];
      if (pool.length === 0) continue;
      for (let k = 0; k < CLUSTER; k++) {
        const y = (1 - (2 * (k + 0.5)) / CLUSTER) * 0.86;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const lon = i * wedgeW + wedgeW * (0.16 + 0.68 * ((k * 3 + i) * PHI_FRAC % 1));
        members.push({
          x: Math.cos(lon) * r,
          y,
          z: Math.sin(lon) * r,
          glyph: pool[(k * 7 + i * 3) % pool.length],
          size: 0.62 + (((k * 11 + i * 5) % 10) / 10) * 0.5,
          phase: (((k * 13 + i * 7) % 20) / 20) * Math.PI * 2,
          twinkle: 0.7 + (((k * 3 + i) % 7) / 7) * 1.2,
          wedgePhase: (i / WEDGES) * Math.PI * 2,
        });
      }
    }
    if (members.length === 0) return;

    // Wedge-separating meridians + one equator, on the unit sphere.
    const MERIDIAN_PTS = 40;
    const meridians = [];
    for (let i = 0; i < WEDGES; i++) {
      const lon = i * wedgeW;
      const pts = [];
      for (let s = 0; s <= MERIDIAN_PTS; s++) {
        const lat = -Math.PI / 2 + (s / MERIDIAN_PTS) * Math.PI;
        pts.push({
          x: Math.cos(lat) * Math.cos(lon),
          y: Math.sin(lat),
          z: Math.cos(lat) * Math.sin(lon),
        });
      }
      meridians.push(pts);
    }
    const equator = [];
    for (let s = 0; s <= 96; s++) {
      const a = (s / 96) * Math.PI * 2;
      equator.push({ x: Math.cos(a), y: 0, z: Math.sin(a) });
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 12500,
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.43;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.06 + state.pointer.x * 0.3;
        const rotX = 0.38 + Math.sin(t * 0.09) * 0.04 + state.pointer.y * 0.18;
        const project = PCFX.makeProjector(rotY, rotX, 3.2);

        // Ambient core glow.
        const nebR = R * 0.95;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // Hairline cage: meridians + equator, far fainter than the glyphs.
        for (const meridian of meridians) strokeGraded(ctx, project, meridian, CX, CY, R, 0.1);
        strokeGraded(ctx, project, equator, CX, CY, R, 0.15);

        // Glyph constellations, depth-sorted back to front.
        const projected = members
          .map((m) => ({ m, pr: project(m.x, m.y, m.z, CX, CY, R) }))
          .sort((a, b) => a.pr.z - b.pr.z);
        for (const { m, pr } of projected) {
          const depth = (pr.z + 1) / 2;
          const tier = depth > 0.58 ? 0 : depth > 0.36 ? 1 : 2;
          const tw = 0.82 + 0.18 * Math.sin(t * m.twinkle + m.phase);
          const shim = 0.86 + 0.14 * Math.sin(t * 0.4 + m.wedgePhase);
          const alpha = (0.1 + depth * depth * 0.9) * tw * shim;
          const size = SPRITE * m.size * pr.scale * 0.34;
          if (pr.z > 0.45) {
            const gSize = size * 3.8;
            ctx.globalAlpha = (pr.z - 0.45) * 0.5 * tw;
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
    document.querySelectorAll('canvas.pc-fx-council').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
