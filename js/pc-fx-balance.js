/**
 * PuniCodex — The Golden Balance (PC/FX scene, /appraise/)
 *
 * A beam balance drawn as a brass-instrument wireframe: truss pillar on a
 * plinth, twin-hairline beam, pans on hairline chains. The beam rings down
 * in damped harmonic oscillation, re-energized every seven seconds:
 *   θ(t) = A · e^(−λτ) · cos(ωτ),   τ = t mod 7
 *   A = 12° (0.209 rad), λ = 0.55, ω = 2π/1.9
 * The pans hang plumb but sway with a phase-lagged pendulum term and
 * counter-rotate a fraction of the beam angle, the way real pans steady
 * themselves. The left pan holds a glowing φ — the golden ratio, the only
 * true measure of worth; the right a little stack of calibration weights.
 * A needle on the beam sweeps a fixed ticked arc at the pivot.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame (beam near full amplitude); pointer parallax from the core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const TINTS = PCFX.TINTS;
  const SPRITE = 64;
  const GOLD = '212,175,55';
  const IVORY = '245,227,168';
  const A = 0.209; // 12° amplitude
  const LAMBDA = 0.55;
  const OMEGA = (2 * Math.PI) / 1.9;
  const PERIOD = 7; // re-energize interval (s)

  function attach(canvas) {
    // φ from the Greek set, in the three shared tints.
    const phi = PCFX.buildAtlas(
      [{ font: PCFX.SCRIPTS.greek.font, chars: 'φ' }],
      TINTS,
      SPRITE
    );
    if (phi.length === 0) return;
    const glow = PCFX.makeGlowSprite(GOLD);

    let W = 0;
    let H = 0;
    let S = 0;

    function line(ctx, x0, y0, x1, y1, rgb, alpha, width) {
      ctx.strokeStyle = `rgba(${rgb},${alpha})`;
      ctx.lineWidth = width || 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    function circle(ctx, x, y, r, rgb, alpha, width) {
      ctx.strokeStyle = `rgba(${rgb},${alpha})`;
      ctx.lineWidth = width || 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // A pan: rim ellipse + bowl arc + chains to its beam hook, tilted by
    // the counter-rotation angle. Returns the pan centre.
    function drawPan(ctx, hook, chain, rimW, tilt, swayX) {
      const px = hook.x + swayX;
      const py = hook.y + chain;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const rot = (dx, dy) => ({ x: px + dx * ct - dy * st, y: py + dx * st + dy * ct });
      // Chains: hook → both rim ends.
      const rl = rot(-rimW / 2, 0);
      const rr = rot(rimW / 2, 0);
      line(ctx, hook.x, hook.y, rl.x, rl.y, GOLD, 0.55);
      line(ctx, hook.x, hook.y, rr.x, rr.y, GOLD, 0.55);
      line(ctx, hook.x, hook.y - 0.012 * S, hook.x, hook.y, GOLD, 0.6);
      // Rim (flattened ellipse, front arc brighter) + bowl below.
      ctx.strokeStyle = `rgba(${GOLD},0.75)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(px, py, rimW / 2, rimW * 0.15, tilt, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${GOLD},0.5)`;
      ctx.beginPath();
      ctx.ellipse(px, py, rimW / 2, rimW * 0.15, tilt, 0.25, Math.PI - 0.25);
      ctx.stroke();
      // Bowl: half-ellipse bulging below the rim.
      ctx.strokeStyle = `rgba(${GOLD},0.6)`;
      ctx.beginPath();
      ctx.ellipse(px, py, rimW / 2, rimW * 0.42, tilt, 0.12, Math.PI - 0.12);
      ctx.stroke();
      return { x: px, y: py, rot, tilt };
    }

    // A small calibration weight: cylinder + knob, upright on its pan.
    function drawWeight(ctx, base, w, h, tilt) {
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const rot = (dx, dy) => ({ x: base.x + dx * ct - dy * st, y: base.y + dx * st + dy * ct });
      const bl = rot(-w / 2, 0);
      const br = rot(w / 2, 0);
      const tl = rot(-w / 2, -h);
      const tr = rot(w / 2, -h);
      const tc = rot(0, -h);
      const knob = rot(0, -h - w * 0.4);
      line(ctx, bl.x, bl.y, br.x, br.y, GOLD, 0.7);
      line(ctx, bl.x, bl.y, tl.x, tl.y, GOLD, 0.7);
      line(ctx, br.x, br.y, tr.x, tr.y, GOLD, 0.7);
      ctx.strokeStyle = `rgba(${GOLD},0.7)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(tc.x, tc.y, w / 2, w * 0.18, tilt, Math.PI, Math.PI * 2);
      ctx.stroke();
      line(ctx, tc.x, tc.y, knob.x, knob.y, GOLD, 0.7);
      circle(ctx, knob.x, knob.y, w * 0.14, GOLD, 0.7);
    }

    PCFX.createScene({
      canvas,
      reducedT: 150, // just after the kick — beam near full amplitude
      onResize(state) {
        W = state.w;
        H = state.h;
        S = Math.min(W, H);
      },
      onFrame(state, t) {
        const { ctx } = state;
        t = Math.max(0, t); // the first rAF timestamp can precede scene start
        ctx.clearRect(0, 0, W, H);

        // Damped oscillation, re-energized every PERIOD seconds.
        const tau = t % PERIOD;
        const env = Math.exp(-LAMBDA * tau);
        const theta = A * env * Math.cos(OMEGA * tau);
        const sway = 0.035 * S * env * Math.sin(OMEGA * tau - 1.1);
        const counter = -theta * 0.4 + 0.05 * env * Math.sin(OMEGA * tau - 1.4);

        const cx = W / 2 + state.pointer.x * -5;
        const pivotY = H * 0.3 + state.pointer.y * -3;
        const groundY = H * 0.88;
        const beamL = S * 0.33;
        const chain = S * 0.17;
        const rimW = S * 0.15;

        // Ground: faint line + soft pool of light under the plinth.
        line(ctx, cx - S * 0.34, groundY, cx + S * 0.34, groundY, GOLD, 0.14);
        const gp = S * 0.5;
        ctx.globalAlpha = 0.26;
        ctx.drawImage(glow, cx - gp / 2, groundY - gp / 8, gp, gp / 4);
        ctx.globalAlpha = 1;

        // Plinth: shallow trapezoid with an inner seam.
        const pbHalf = S * 0.1;
        const ptHalf = S * 0.055;
        const plinthH = S * 0.045;
        line(ctx, cx - pbHalf, groundY, cx + pbHalf, groundY, GOLD, 0.6);
        line(ctx, cx - pbHalf, groundY, cx - ptHalf, groundY - plinthH, GOLD, 0.6);
        line(ctx, cx + pbHalf, groundY, cx + ptHalf, groundY - plinthH, GOLD, 0.6);
        line(ctx, cx - ptHalf, groundY - plinthH, cx + ptHalf, groundY - plinthH, GOLD, 0.6);
        line(ctx, cx - pbHalf * 0.8, groundY, cx - ptHalf * 0.8, groundY - plinthH, GOLD, 0.25);

        // Truss pillar: tapered sides + crossbars + one diagonal brace.
        const topY = pivotY;
        const botY = groundY - plinthH;
        const pillarBotHalf = S * 0.05;
        const pillarTopHalf = S * 0.011;
        line(ctx, cx - pillarBotHalf, botY, cx - pillarTopHalf, topY, GOLD, 0.55);
        line(ctx, cx + pillarBotHalf, botY, cx + pillarTopHalf, topY, GOLD, 0.55);
        for (let k = 1; k <= 3; k++) {
          const f = k / 4;
          const yy = botY + (topY - botY) * f;
          const hh = pillarBotHalf + (pillarTopHalf - pillarBotHalf) * f;
          line(ctx, cx - hh, yy, cx + hh, yy, GOLD, 0.4);
          if (k < 3) {
            const f2 = (k + 1) / 4;
            const y2 = botY + (topY - botY) * f2;
            const h2 = pillarBotHalf + (pillarTopHalf - pillarBotHalf) * f2;
            line(ctx, cx - hh, yy, cx + h2, y2, GOLD, 0.22);
          }
        }

        // Pivot boss + glow.
        circle(ctx, cx, pivotY, S * 0.012, IVORY, 0.85);
        const pvGlow = S * 0.11;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(glow, cx - pvGlow / 2, pivotY - pvGlow / 2, pvGlow, pvGlow);
        ctx.globalAlpha = 1;

        // The beam: twin hairlines rotated by theta, with end caps.
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        const beam = (dx, dy) => ({ x: cx + dx * ct - dy * st, y: pivotY + dx * st + dy * ct });
        const bOff = S * 0.006;
        const bl1 = beam(-beamL, 0);
        const br1 = beam(beamL, 0);
        const bl2 = beam(-beamL, -bOff);
        const br2 = beam(beamL, -bOff);
        line(ctx, bl1.x, bl1.y, br1.x, br1.y, IVORY, 0.85);
        line(ctx, bl2.x, bl2.y, br2.x, br2.y, GOLD, 0.45);
        line(ctx, bl1.x, bl1.y, bl2.x, bl2.y, GOLD, 0.55);
        line(ctx, br1.x, br1.y, br2.x, br2.y, GOLD, 0.55);
        // Finial knobs at the beam ends.
        circle(ctx, bl1.x, bl1.y, S * 0.006, GOLD, 0.7);
        circle(ctx, br1.x, br1.y, S * 0.006, GOLD, 0.7);

        // The needle sweeping a fixed ticked arc above the pivot.
        const arcR = S * 0.11;
        for (let k = -2; k <= 2; k++) {
          const a = -Math.PI / 2 + k * 0.105;
          const x0 = cx + Math.cos(a) * (arcR - S * 0.009);
          const y0 = pivotY + Math.sin(a) * (arcR - S * 0.009);
          const x1 = cx + Math.cos(a) * (arcR + S * 0.005);
          const y1 = pivotY + Math.sin(a) * (arcR + S * 0.005);
          line(ctx, x0, y0, x1, y1, GOLD, k === 0 ? 0.7 : 0.4);
        }
        const nAng = -Math.PI / 2 + theta;
        const nx = cx + Math.cos(nAng) * arcR;
        const ny = pivotY + Math.sin(nAng) * arcR;
        line(ctx, cx, pivotY, nx, ny, IVORY, 0.8);

        // Hooks at the beam ends; pans hang plumb beneath them.
        const hookL = beam(-beamL, 0);
        const hookR = beam(beamL, 0);
        const panL = drawPan(ctx, hookL, chain, rimW, counter, sway);
        const panR = drawPan(ctx, hookR, chain, rimW, counter, sway);

        // Left pan: the glowing φ, resting above the bowl.
        const phiPulse = 0.85 + 0.15 * Math.sin(t * 1.3);
        const phiSize = S * 0.095;
        const pRot = panL.rot(0, -rimW * 0.28);
        const pg = phiSize * 2.6;
        ctx.globalAlpha = 0.55 * phiPulse;
        ctx.drawImage(glow, pRot.x - pg / 2, pRot.y - pg / 2, pg, pg);
        ctx.globalAlpha = Math.min(1, phiPulse);
        ctx.drawImage(phi[0].sprites[0], pRot.x - phiSize / 2, pRot.y - phiSize / 2, phiSize, phiSize);
        ctx.globalAlpha = 1;

        // Right pan: a small stack of calibration weights.
        const wBaseY = -rimW * 0.05;
        drawWeight(ctx, panR.rot(-rimW * 0.22, wBaseY), S * 0.032, S * 0.05, panR.tilt);
        drawWeight(ctx, panR.rot(rimW * 0.05, wBaseY), S * 0.026, S * 0.04, panR.tilt);
        drawWeight(ctx, panR.rot(rimW * 0.27, wBaseY), S * 0.02, S * 0.032, panR.tilt);
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-balance').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
