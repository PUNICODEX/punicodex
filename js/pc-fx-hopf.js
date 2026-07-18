/**
 * PuniCodex — The Hopf Fibration (PC/FX scene, /connections/)
 *
 * Fourteen Villarceau circles on a torus (R = 1, r = 0.55): the Hopf
 * fibration's signature, where every pair of circles links exactly once.
 * Each circle is the (1,1) curve q = p + c on the torus —
 *   x = (R + r·cos(p + c))·cos p
 *   y = (R + r·cos(p + c))·sin p
 *   z = r·sin(p + c)            p ∈ [0, 2π), c = circle phase
 * — a closed planar circle; two circles out of phase never touch yet are
 * inseparable. Two featured circles burn brighter (the Hopf link itself);
 * a faint torus meridian cage gives the eye a depth reference.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TORUS_R = 1;
  const TORUS_r = 0.55;
  const CIRCLES = 14;
  const CIRCLE_PTS = 96;
  const MERIDIANS = 10;
  const MERIDIAN_PTS = 48;
  const SCALE = 1 / (TORUS_R + TORUS_r); // normalize extents to ±1
  const BUCKET_ALPHA = [0.18, 0.45, 1];
  const FEATURED = new Set([0, 7]); // opposite phases — the featured link

  function torusPoint(p, q) {
    const rr = TORUS_R + TORUS_r * Math.cos(q);
    return {
      x: rr * Math.cos(p) * SCALE,
      y: rr * Math.sin(p) * SCALE,
      z: TORUS_r * Math.sin(q) * SCALE,
    };
  }

  // Depth-graded hairline polyline (same bucketing as the other scenes).
  function strokeGraded(ctx, project, pts, cx, cy, orbit, rgb, baseAlpha, width) {
    let prev = null;
    let bucket = -1;
    let drawing = false;
    ctx.lineWidth = width || 1;
    for (let i = 0; i < pts.length; i++) {
      const pr = project(pts[i].x, pts[i].y, pts[i].z, cx, cy, orbit);
      const d = Math.max(0, Math.min(1, (pr.z + 1.06) / 2.12));
      const b = d > 0.62 ? 2 : d > 0.38 ? 1 : 0;
      if (!drawing) {
        ctx.beginPath();
        ctx.moveTo(pr.sx, pr.sy);
        bucket = b;
        drawing = true;
      } else if (b !== bucket) {
        ctx.strokeStyle = `rgba(${rgb},${baseAlpha * BUCKET_ALPHA[bucket]})`;
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
      ctx.strokeStyle = `rgba(${rgb},${baseAlpha * BUCKET_ALPHA[bucket]})`;
      ctx.stroke();
    }
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');

    // The fourteen circles, each a closed 96-point polyline (first point
    // repeated at the end so the loop has no seam).
    const circles = [];
    for (let i = 0; i < CIRCLES; i++) {
      const c = (i / CIRCLES) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= CIRCLE_PTS; s++) {
        const p = (s / CIRCLE_PTS) * Math.PI * 2;
        pts.push(torusPoint(p, p + c));
      }
      circles.push({ pts, featured: FEATURED.has(i) });
    }

    // The faint meridian cage (fixed p, q sweeping the tube).
    const meridians = [];
    for (let k = 0; k < MERIDIANS; k++) {
      const p = (k / MERIDIANS) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= MERIDIAN_PTS; s++) {
        pts.push(torusPoint(p, (s / MERIDIAN_PTS) * Math.PI * 2));
      }
      meridians.push(pts);
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 3800, // rotY ≈ 0.3 rad — the weave reads most clearly here
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.42;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = t * 0.08 + state.pointer.x * 0.25;
        const rotX = 0.6 + Math.sin(t * 0.05) * 0.04 + state.pointer.y * 0.15;
        const project = PCFX.makeProjector(rotY, rotX, 3.4);

        // Ambient core glow.
        const nebR = R * 0.75;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
        ctx.globalAlpha = 1;

        // Depth reference: the torus meridian cage, barely there.
        for (const meridian of meridians) {
          strokeGraded(ctx, project, meridian, CX, CY, R, '212,175,55', 0.07, 1);
        }

        // The fibration: dim circles first, the featured link on top.
        for (const circle of circles) {
          if (circle.featured) continue;
          strokeGraded(ctx, project, circle.pts, CX, CY, R, '212,175,55', 0.4, 1);
        }
        for (const circle of circles) {
          if (!circle.featured) continue;
          strokeGraded(ctx, project, circle.pts, CX, CY, R, '245,227,168', 0.95, 1.2);
          // A small glow at each featured circle's front-most point.
          let best = null;
          for (const pt of circle.pts) {
            const pr = project(pt.x, pt.y, pt.z, CX, CY, R);
            if (!best || pr.z > best.z) best = pr;
          }
          if (best) {
            const gSize = R * 0.34;
            ctx.globalAlpha = 0.5;
            ctx.drawImage(glow, best.sx - gSize / 2, best.sy - gSize / 2, gSize, gSize);
            ctx.globalAlpha = 1;
          }
        }
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-hopf').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
