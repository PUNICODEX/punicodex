/**
 * PuniCodex — The Triad Ziggurat (PC/FX scene, /tiers/)
 *
 * Three stacked box frustums (truncated-pyramid rings) form the stepped
 * ziggurat of the tier doctrine: Tier 2 at the base, Tier 1 above, the
 * Dual-Tier at the summit. Each frustum is a gold hairline wireframe —
 * 4 base edges, 4 top edges, 4 slant edges, plus a brighter inset cap
 * plate — depth-graded like the other scenes. Every level carries its tier
 * marker as a glowing glyph at its four top corners (Ⅱ, Ⅰ, and the dual
 * Ⅰ–Ⅱ at the summit — the tier that carries both marks), and a hairline
 * golden spiral ascends the steps, hugging the silhouette:
 *   θ(s) = 1 turn · s,  y(s) = base→summit,  r(s) = halfWidth(y)·1.05
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const FONT = '"Cormorant Garamond", serif';
  const SPRITE = 64;
  const BUCKET_ALPHA = [0.18, 0.45, 1];

  // The three steps (y grows downward on screen; base has the largest y).
  // Near-vertical walls + wide ledges so the steps read as a ziggurat,
  // not a smooth pyramid; a slight taper keeps each ring a frustum.
  const LEVELS = [
    { yBot: 0.44, yTop: 0.17, halfBot: 0.86, halfTop: 0.78, marker: 'Ⅱ', fall: 'II' },
    { yBot: 0.15, yTop: -0.11, halfBot: 0.6, halfTop: 0.52, marker: 'Ⅰ', fall: 'I' },
    { yBot: -0.13, yTop: -0.39, halfBot: 0.34, halfTop: 0.26, marker: 'Ⅰ–Ⅱ', fall: 'I–II' },
  ];
  const CAP_INSET = 0.66; // cap plate square, fraction of halfTop
  const SPIRAL_PTS = 240;
  const SPIRAL_TURNS = 1;
  const SPIRAL_LIFT = 1.05; // spiral rides just proud of the silhouette

  // A text sprite (multi-char safe) in one tint — mirrors the core's
  // makeGlyphSprite but takes a string so the dual ⅠⅡ marker renders whole.
  function makeTextSprite(text, color, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.font = `${size * (text.length > 1 ? 0.4 : 0.62)}px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = color;
    x.fillText(text, size / 2, size / 2 + size * 0.03);
    return c;
  }

  // Marker text with per-char fallback to plain Latin when the serif face
  // lacks the Roman numeral glyphs (the renderability probe decides).
  function markerText(level) {
    let out = '';
    for (const ch of level.marker) {
      if (PCFX.isRenderable(ch, FONT)) out += ch;
    }
    return out.length === level.marker.length ? level.marker : level.fall;
  }

  // Silhouette half-width at height y: linear along each face, stepping
  // inward across the ledge gap between one level's top and the next's base.
  function halfWidthAt(y) {
    for (let i = 0; i < LEVELS.length; i++) {
      const L = LEVELS[i];
      if (y <= L.yBot && y >= L.yTop) {
        const s = (L.yBot - y) / (L.yBot - L.yTop);
        return L.halfBot + (L.halfTop - L.halfBot) * s;
      }
      const next = LEVELS[i + 1];
      if (next && y < L.yTop && y > next.yBot) {
        const s = (L.yTop - y) / (L.yTop - next.yBot);
        return L.halfTop + (next.halfBot - L.halfTop) * s;
      }
    }
    return y > LEVELS[0].yBot ? LEVELS[0].halfBot : LEVELS[2].halfTop;
  }

  function cornerSquare(half, y) {
    return [
      { x: -half, y, z: -half },
      { x: half, y, z: -half },
      { x: half, y, z: half },
      { x: -half, y, z: half },
    ];
  }

  // Depth bucket of a segment midpoint → gold hairline stroke.
  function strokeSeg(ctx, project, a, b, cx, cy, orbit, baseAlpha, rgb) {
    const pa = project(a.x, a.y, a.z, cx, cy, orbit);
    const pb = project(b.x, b.y, b.z, cx, cy, orbit);
    const zm = (pa.z + pb.z) / 2;
    const d = Math.max(0, Math.min(1, (zm + 0.9) / 1.8));
    const bucket = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
    ctx.strokeStyle = `rgba(${rgb || '212,175,55'},${baseAlpha * BUCKET_ALPHA[bucket]})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.stroke();
    return { pa, pb };
  }

  // Depth-graded hairline polyline (same bucketing as the other scenes).
  function strokeGraded(ctx, project, pts, cx, cy, orbit, baseAlpha, rgb) {
    let prev = null;
    let bucket = -1;
    let drawing = false;
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const pr = project(pts[i].x, pts[i].y, pts[i].z, cx, cy, orbit);
      const d = Math.max(0, Math.min(1, (pr.z + 0.9) / 1.8));
      const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
      if (!drawing) {
        ctx.beginPath();
        ctx.moveTo(pr.sx, pr.sy);
        bucket = b;
        drawing = true;
      } else if (b !== bucket) {
        ctx.strokeStyle = `rgba(${rgb || '212,175,55'},${baseAlpha * BUCKET_ALPHA[bucket]})`;
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
      ctx.strokeStyle = `rgba(${rgb || '212,175,55'},${baseAlpha * BUCKET_ALPHA[bucket]})`;
      ctx.stroke();
    }
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');

    // Marker sprites in the three shared tints.
    const markers = LEVELS.map((level) => {
      const text = markerText(level);
      return TINTS.map((tint) => makeTextSprite(text, tint.color, SPRITE));
    });

    // The ascending spiral, anchored to the silhouette.
    const spiral = [];
    const yBase = LEVELS[0].yBot + 0.02;
    const ySummit = LEVELS[2].yTop + 0.01;
    for (let s = 0; s <= SPIRAL_PTS; s++) {
      const f = s / SPIRAL_PTS;
      const y = yBase + (ySummit - yBase) * f;
      const th = f * SPIRAL_TURNS * Math.PI * 2;
      const r = halfWidthAt(y) * SPIRAL_LIFT;
      spiral.push({ x: r * Math.cos(th), y, z: r * Math.sin(th) });
    }

    // Per-level geometry: corner squares + markers at the four top corners
    // (spread a touch outward so they clear the edges they crown).
    const levels = LEVELS.map((L, i) => ({
      bot: cornerSquare(L.halfBot, L.yBot),
      top: cornerSquare(L.halfTop, L.yTop),
      cap: cornerSquare(L.halfTop * CAP_INSET, L.yTop),
      markerSprites: markers[i],
      markerPts: cornerSquare(L.halfTop * 1.07, L.yTop - 0.035),
    }));

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 4000, // rotY ≈ 0.55 rad — the steps read in clear 3/4 view
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.45;
      },
      onFrame(state, t) {
        const { ctx } = state;
        t = Math.max(0, t); // the first rAF timestamp can precede scene start
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.14 + state.pointer.x * 0.3;
        const rotX = 0.46 + Math.sin(t * 0.06) * 0.03 + state.pointer.y * 0.15;
        const project = PCFX.makeProjector(rotY, rotX, 3.4);

        // Grounding glow beneath the base, then a faint ambient core.
        const ground = project(0, 0.52, 0, CX, CY, R);
        const gW = R * 1.5;
        ctx.globalAlpha = 0.28;
        ctx.drawImage(glow, ground.sx - gW / 2, ground.sy - gW / 6, gW, gW / 3);
        const nebR = R * 0.8;
        ctx.globalAlpha = 0.15;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // The three frustums: base square, top square, slants, cap plate.
        for (const L of levels) {
          for (let k = 0; k < 4; k++) {
            strokeSeg(ctx, project, L.bot[k], L.bot[(k + 1) % 4], CX, CY, R, 0.55);
            strokeSeg(ctx, project, L.top[k], L.top[(k + 1) % 4], CX, CY, R, 0.72);
            strokeSeg(ctx, project, L.bot[k], L.top[k], CX, CY, R, 0.62);
            strokeSeg(ctx, project, L.cap[k], L.cap[(k + 1) % 4], CX, CY, R, 0.85, '245,227,168');
          }
        }

        // The golden spiral ascending the steps, with a travelling ember.
        strokeGraded(ctx, project, spiral, CX, CY, R, 0.65, '245,227,168');
        const climb = (t * 0.05) % 1;
        const ci = Math.min(SPIRAL_PTS, Math.floor(climb * SPIRAL_PTS));
        const cp = project(spiral[ci].x, spiral[ci].y, spiral[ci].z, CX, CY, R);
        const eSize = R * 0.16;
        ctx.globalAlpha = 0.75;
        ctx.drawImage(glow, cp.sx - eSize / 2, cp.sy - eSize / 2, eSize, eSize);
        ctx.globalAlpha = 1;

        // Tier markers at each level's four top corners, depth-sorted.
        const projected = [];
        levels.forEach((L, li) => {
          for (const pt of L.markerPts) {
            projected.push({ li, pr: project(pt.x, pt.y, pt.z, CX, CY, R) });
          }
        });
        projected.sort((a, b) => a.pr.z - b.pr.z);
        for (const { li, pr } of projected) {
          const depth = Math.max(0, Math.min(1, (pr.z + 0.9) / 1.8));
          const tier = depth > 0.58 ? 0 : depth > 0.36 ? 1 : 2;
          const size = R * 0.16 * pr.scale * (LEVELS[li].marker.length > 1 ? 1.55 : 1);
          const alpha = 0.16 + depth * depth * 0.84;
          if (pr.z > 0.3) {
            const gSize = size * 3.4;
            ctx.globalAlpha = (pr.z - 0.3) * 0.55;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = Math.min(1, alpha);
          ctx.drawImage(
            levels[li].markerSprites[tier],
            pr.sx - size / 2,
            pr.sy - size / 2,
            size,
            size
          );
        }

        // Summit finial: a slim hairline flame over the dual cap.
        const apex = { x: 0, y: LEVELS[2].yTop - 0.02, z: 0 };
        const tip = { x: 0, y: LEVELS[2].yTop - 0.14, z: 0 };
        strokeSeg(ctx, project, apex, tip, CX, CY, R, 0.9, '245,227,168');
        const fp = project(tip.x, tip.y, tip.z, CX, CY, R);
        const fSize = R * (0.2 + 0.04 * Math.sin(t * 1.4));
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow, fp.sx - fSize / 2, fp.sy - fSize / 2, fSize, fSize);
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-ziggurat').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
