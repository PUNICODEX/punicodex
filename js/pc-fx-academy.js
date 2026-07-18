/**
 * PuniCodex — The Academy (PC/FX scene, /university-sponsorship/)
 *
 * A wireframe temple facade assembling itself the way an institution is
 * built: three stylobate steps first, six fluted columns rising centre-out,
 * the architrave, then the pediment and its boss. Each edge is drawn in
 * with a stroke-progress reveal (~6s), after which the finished order
 * holds with a gentle breathing glow.
 *
 * The facade is genuinely 3D — columns are tapered cylinders with entasis,
 * the steps/architrave/pediment carry depth returns to a back plane — but
 * the camera stays nearly frontal, so the drawing reads as an elevation.
 * Column order and every jitter are deterministic, so the reduced-motion
 * still is the fully assembled facade.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const BASE_Y = 0.42; // column base (screen-down is +y)
  const TOP_Y = -0.18; // capital bed
  const R_BASE = 0.052;
  const R_TOP = 0.042;
  const COL_X = [-0.625, -0.375, -0.125, 0.125, 0.375, 0.625];
  const BUILD_END = 6.3;

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }
  function smooth(x) {
    const u = clamp01(x);
    return u * u * (3 - 2 * u);
  }

  function circlePts(cx, y, cz, r, n) {
    const pts = [];
    for (let s = 0; s <= n; s++) {
      const a = (s / n) * Math.PI * 2;
      pts.push({ x: cx + r * Math.cos(a), y, z: cz + r * Math.sin(a) });
    }
    return pts;
  }

  function buildFacade() {
    const els = []; // { lines: [ [{x,y,z}...], ... ], begin, dur }

    // 1. Stylobate: three steps, widest first, each a U of top edges with
    //    a depth return to the back plane.
    const stepY = [0.58, 0.525, 0.47];
    const stepW = [0.92, 0.85, 0.78];
    for (let i = 0; i < 3; i++) {
      const y = stepY[i];
      const w = stepW[i];
      els.push({
        begin: i * 0.28,
        dur: 0.65,
        lines: [
          [
            { x: -w, y, z: 0 },
            { x: w, y, z: 0 },
            { x: w, y, z: -0.26 },
            { x: -w, y, z: -0.26 },
          ],
          // the riser shadow line at the front foot of the step above
          ...(i < 2
            ? [
                [
                  { x: -stepW[i + 1], y: stepY[i + 1], z: 0 },
                  { x: -stepW[i + 1], y, z: 0 },
                  { x: stepW[i + 1], y, z: 0 },
                  { x: stepW[i + 1], y: stepY[i + 1], z: 0 },
                ],
              ]
            : []),
        ],
      });
    }

    // 2. Six columns, centre-out, each a tapered fluted cylinder.
    const order = [2, 3, 1, 4, 0, 5];
    order.forEach((colIdx, k) => {
      const cx = COL_X[colIdx];
      const lines = [];
      lines.push(circlePts(cx, BASE_Y, 0, R_BASE, 24));
      for (let f = 0; f < 6; f++) {
        const a = (f / 6) * Math.PI * 2 + Math.PI / 6;
        const pts = [];
        for (let s = 0; s <= 9; s++) {
          const u = s / 9;
          const entasis = 1 + 0.05 * Math.sin(Math.PI * u);
          const r = (R_BASE + (R_TOP - R_BASE) * u ** 0.8) * entasis;
          pts.push({
            x: cx + r * Math.cos(a),
            y: BASE_Y + (TOP_Y - BASE_Y) * u,
            z: r * Math.sin(a),
          });
        }
        lines.push(pts);
      }
      lines.push(circlePts(cx, TOP_Y, 0, R_TOP * 1.18, 24)); // echinus flare
      lines.push([
        { x: cx - 0.075, y: TOP_Y - 0.035, z: 0 },
        { x: cx + 0.075, y: TOP_Y - 0.035, z: 0 },
        { x: cx + 0.075, y: TOP_Y - 0.035, z: -0.05 },
        { x: cx - 0.075, y: TOP_Y - 0.035, z: -0.05 },
      ]); // abacus
      els.push({ begin: 1.05 + k * 0.3, dur: 1.05, lines });
    });

    // 3. Architrave: two courses spanning the colonnade, back return below.
    els.push({
      begin: 3.6,
      dur: 0.75,
      lines: [
        [
          { x: -0.78, y: -0.245, z: 0 },
          { x: 0.78, y: -0.245, z: 0 },
        ],
        [
          { x: -0.78, y: -0.29, z: 0 },
          { x: 0.78, y: -0.29, z: 0 },
          { x: 0.78, y: -0.29, z: -0.26 },
          { x: -0.78, y: -0.29, z: -0.26 },
        ],
      ],
    });

    // 4. Pediment: outer rakes, inner tympanum, back face + connectors.
    els.push({
      begin: 4.4,
      dur: 0.85,
      lines: [
        [
          { x: -0.84, y: -0.29, z: 0 },
          { x: 0, y: -0.6, z: 0 },
          { x: 0.84, y: -0.29, z: 0 },
        ],
        [
          { x: -0.7, y: -0.335, z: 0 },
          { x: 0, y: -0.55, z: 0 },
          { x: 0.7, y: -0.335, z: 0 },
        ],
      ],
    });
    els.push({
      begin: 5.05,
      dur: 0.7,
      lines: [
        [
          { x: -0.84, y: -0.29, z: -0.3 },
          { x: 0, y: -0.6, z: -0.3 },
          { x: 0.84, y: -0.29, z: -0.3 },
        ],
        [
          { x: -0.84, y: -0.29, z: 0 },
          { x: -0.84, y: -0.29, z: -0.3 },
        ],
        [
          { x: 0, y: -0.6, z: 0 },
          { x: 0, y: -0.6, z: -0.3 },
        ],
        [
          { x: 0.84, y: -0.29, z: 0 },
          { x: 0.84, y: -0.29, z: -0.3 },
        ],
      ],
    });

    // 5. The boss: a small ring in the tympanum — the restored mark.
    els.push({ begin: 5.6, dur: 0.5, lines: [circlePts(0, -0.4, 0.01, 0.034, 20)] });

    return els;
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');
    const elements = buildFacade();

    let CX = 0;
    let CY = 0;
    let R = 0;

    // Stroke one polyline up to fraction p, interpolating the cut point.
    function strokePartial(ctx, project, pts, p, alpha, rgb, width) {
      if (p <= 0 || pts.length < 2) return;
      const total = pts.length - 1;
      const upto = p * total;
      const full = Math.floor(upto);
      const rem = upto - full;
      ctx.beginPath();
      let meanZ = 0;
      let count = 0;
      let prev = null;
      const take = Math.min(full + (rem > 0 ? 1 : 0), total);
      for (let i = 0; i <= take; i++) {
        let pt = pts[i];
        if (i === take && rem > 0 && i < pts.length && full < total) {
          const a = pts[full];
          const b = pts[full + 1];
          pt = { x: a.x + (b.x - a.x) * rem, y: a.y + (b.y - a.y) * rem, z: a.z + (b.z - a.z) * rem };
        }
        const pr = project(pt.x, pt.y, pt.z, CX, CY, R);
        meanZ += pr.z;
        count++;
        if (!prev) ctx.moveTo(pr.sx, pr.sy);
        else ctx.lineTo(pr.sx, pr.sy);
        prev = pr;
      }
      const depth = clamp01((meanZ / count + 0.45) / 0.6);
      ctx.strokeStyle = `rgba(${rgb},${alpha * (0.3 + 0.7 * depth)})`;
      ctx.lineWidth = width || 1;
      ctx.stroke();
    }

    PCFX.createScene({
      canvas,
      reducedT: 7000, // fully assembled, mid-breath
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2 + state.h * 0.01;
        R = Math.min(state.w, state.h) * 0.67;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = 0.11 + Math.sin(t * 0.05) * 0.018 + state.pointer.x * 0.09;
        const rotX = 0.05 + state.pointer.y * 0.045;
        const project = PCFX.makeProjector(rotY, rotX, 3.8);

        const assembled = smooth((t - BUILD_END) / 0.8);
        const breathe = 0.5 + 0.5 * Math.sin((t - BUILD_END) * 0.55);

        // Glow in the tympanum, swelling with the build, then breathing.
        const gR = R * 0.85;
        const boss = project(0, -0.4, 0, CX, CY, R);
        ctx.globalAlpha = 0.06 + 0.15 * smooth(t / BUILD_END) + 0.09 * assembled * breathe;
        ctx.drawImage(glow, boss.sx - gR / 2, boss.sy - gR / 2, gR, gR);
        ctx.globalAlpha = 1;

        // The facade, edge by edge.
        const lineAlpha = 0.72 + 0.12 * assembled * breathe;
        for (const el of elements) {
          const p = smooth((t - el.begin) / el.dur);
          if (p <= 0) continue;
          const fadeIn = smooth(p * 3);
          for (const line of el.lines) {
            strokePartial(ctx, project, line, p, lineAlpha * fadeIn, '212,175,55', 1);
          }
        }

        // The boss ring burns a little brighter once it exists.
        const bossP = smooth((t - 5.6) / 0.5);
        if (bossP > 0) {
          const ring = circlePts(0, -0.4, 0.01, 0.034, 20);
          strokePartial(
            ctx,
            project,
            ring,
            bossP,
            0.55 + 0.25 * assembled * breathe,
            '245,227,168',
            1.2
          );
        }
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-academy').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
