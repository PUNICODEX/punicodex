/**
 * PuniCodex — The Bifröst Stair (PC/FX scene, /realms/)
 *
 * A luminous bridge-staircase ascending into the void between worlds.
 * Forty step-quads ride a parametric arc that rises, recedes, and bends
 * gently away; the whole flight flows slowly forward (each step's arc
 * parameter cycles, so the spacing stays even). Particles climb the same
 * arc. The colour stays inside the brand's warm spectrum — amber to gold
 * to ivory, drifting subtly by arc position and time; never a rainbow.
 *
 *   P(s) = ( 0.5·sin(0.945πs) − 0.05,  0.6 − 1.2s,  0.4 − 1.9s )
 *
 * Steps are flat quads built from the arc's tangent frame; the far end of
 * the bridge dissolves into a slow-pulsing void glow.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const STEPS = 40;
  const MOTES = 60;
  const STEP_W = 0.34;
  const STEP_D = 0.075;
  const FLOW = 0.022; // arc-fraction per second — slow forward flow
  const PHI_FRAC = 0.6180339887498949;

  function frac(x) {
    return x - Math.floor(x);
  }
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }
  function smooth(x) {
    const u = clamp01(x);
    return u * u * (3 - 2 * u);
  }

  function pathPoint(s) {
    return {
      x: 0.5 * Math.sin(s * Math.PI * 0.945) - 0.22,
      y: 0.6 - s * 1.2,
      z: 0.4 - s * 1.9,
    };
  }

  // Tangent frame in the XZ plane (the stair's walking direction/width).
  function pathFrame(s) {
    const e = 0.004;
    const a = pathPoint(Math.max(0, s - e));
    const b = pathPoint(Math.min(1, s + e));
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    return { tx, tz, nx: -tz, nz: tx };
  }

  // Warm brand spectrum only: amber → gold → ivory.
  function warm(tone) {
    const A = [184, 134, 11];
    const G = [212, 175, 55];
    const I = [245, 227, 168];
    const t2 = clamp01(tone);
    const [c0, c1, u] = t2 < 0.5 ? [A, G, t2 * 2] : [G, I, (t2 - 0.5) * 2];
    return [
      Math.round(c0[0] + (c1[0] - c0[0]) * u),
      Math.round(c0[1] + (c1[1] - c0[1]) * u),
      Math.round(c0[2] + (c1[2] - c0[2]) * u),
    ];
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');

    const motes = [];
    for (let i = 0; i < MOTES; i++) {
      motes.push({
        s0: frac(i * PHI_FRAC),
        speed: 0.6 + frac(i * 0.7548776662) * 0.9,
        ox: (frac(i * 0.3180339887 + 0.41) - 0.5) * 0.3,
        oy: (frac(i * 0.5698402909 + 0.07) - 0.5) * 0.16,
        phase: frac(i * 0.9196433771) * Math.PI * 2,
        size: 0.005 + frac(i * 0.4426976731) * 0.008,
      });
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 4000, // steps evenly spread, colour drift mid-cycle
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.56;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const rotY = -0.12 + Math.sin(t * 0.05) * 0.03 + state.pointer.x * 0.16;
        const rotX = 0.34 + state.pointer.y * 0.1;
        const project = PCFX.makeProjector(rotY, rotX, 3.2);

        // The void the stair ascends into.
        const top = pathPoint(0.98);
        const topPr = project(top.x, top.y, top.z, CX, CY, R);
        const vR = R * (0.5 + 0.06 * Math.sin(t * 0.4));
        ctx.globalAlpha = 0.5;
        ctx.drawImage(glow, topPr.sx - vR, topPr.sy - vR, vR * 2, vR * 2);
        ctx.globalAlpha = 1;

        // The forty steps, drawn far to near.
        const quads = [];
        for (let i = 0; i < STEPS; i++) {
          const s = frac(i / STEPS + t * FLOW);
          const p = pathPoint(s);
          const f = pathFrame(s);
          const hw = STEP_W / 2;
          const hd = STEP_D / 2;
          const corners = [
            { x: p.x - f.nx * hw - f.tx * hd, y: p.y, z: p.z - f.nz * hw - f.tz * hd },
            { x: p.x + f.nx * hw - f.tx * hd, y: p.y, z: p.z + f.nz * hw - f.tz * hd },
            { x: p.x + f.nx * hw + f.tx * hd, y: p.y, z: p.z + f.nz * hw + f.tz * hd },
            { x: p.x - f.nx * hw + f.tx * hd, y: p.y, z: p.z - f.nz * hw + f.tz * hd },
          ];
          const pr = corners.map((c) => project(c.x, c.y, c.z, CX, CY, R));
          const zAvg = pr.reduce((acc, q) => acc + q.z, 0) / 4;
          quads.push({ pr, zAvg, s });
        }
        quads.sort((a, b) => a.zAvg - b.zAvg);
        for (const quad of quads) {
          const depth = clamp01((quad.zAvg + 1.6) / 2.4);
          const endFade = smooth(quad.s / 0.07) * smooth((1 - quad.s) / 0.1);
          const tone = clamp01(0.3 + 0.45 * (0.5 + 0.5 * Math.sin(quad.s * 5.2 - t * 0.22)) + quad.s * 0.25);
          const [r, g, b] = warm(tone);
          const alpha = (0.1 + depth * depth * 0.75) * endFade;
          if (alpha <= 0.01) continue;
          ctx.beginPath();
          ctx.moveTo(quad.pr[0].sx, quad.pr[0].sy);
          for (let k = 1; k < 4; k++) ctx.lineTo(quad.pr[k].sx, quad.pr[k].sy);
          ctx.closePath();
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.22})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.95})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Near steps carry a faint tread light.
          if (depth > 0.82 && endFade > 0.5) {
            const cxp = (quad.pr[0].sx + quad.pr[2].sx) / 2;
            const cyp = (quad.pr[0].sy + quad.pr[2].sy) / 2;
            const gSize = R * 0.09;
            ctx.globalAlpha = (depth - 0.82) * 2.2 * endFade * 0.35;
            ctx.drawImage(glow, cxp - gSize / 2, cyp - gSize / 2, gSize, gSize);
            ctx.globalAlpha = 1;
          }
        }

        // Particles climbing the arc.
        for (const mote of motes) {
          const s = frac(mote.s0 + t * FLOW * mote.speed);
          const p = pathPoint(s);
          const wobble = Math.sin(t * 0.5 + mote.phase) * 0.02;
          const pr = project(p.x + mote.ox + wobble, p.y + mote.oy, p.z, CX, CY, R);
          const depth = clamp01((pr.z + 1.6) / 2.4);
          const endFade = smooth(s / 0.06) * smooth((1 - s) / 0.12);
          const alpha = (0.1 + depth * depth * 0.8) * endFade * (0.7 + 0.3 * Math.sin(t * 0.8 + mote.phase));
          if (alpha <= 0.01) continue;
          const size = Math.max(1, mote.size * R * pr.scale);
          if (depth > 0.72) {
            const gSize = size * 6;
            ctx.globalAlpha = alpha * 0.4;
            ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(pr.sx, pr.sy, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#F5E3A8';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-bifrost').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
