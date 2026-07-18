/**
 * PuniCodex — The Nib (PC/FX scene, /scholars/apply/)
 *
 * A calligraphy nib drawing an endless flourish: a small stylized pen
 * travels a precomputed lemniscate of Bernoulli —
 *
 *   x = a·cosθ / (1 + sin²θ),   y = a·sinθ·cosθ / (1 + sin²θ),  θ ∈ [0, 2π)
 *
 * — trailing ink that fades after ~3s. The trail is stateless: each frame
 * re-derives the last 3 seconds of curve from the parameter, so the
 * reduced-motion still is the exact same composition. Line weight follows
 * the nib's true speed along the curve — it dwells and swells at the
 * crossing, the way a real nib loads — and an occasional shimmer runs
 * through the fresh ink.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const PERIOD = 9; // seconds per loop
  const TRAIL = 3; // seconds of living ink
  const SEGS = 90; // trail segments per frame
  const LOOP_PTS = 512;

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');

    // The precomputed loop (unit scale; fitted to the stage on resize).
    const loop = [];
    let maxV = 0;
    for (let i = 0; i <= LOOP_PTS; i++) {
      const th = (i / LOOP_PTS) * Math.PI * 2;
      const d = 1 + Math.sin(th) ** 2;
      loop.push({ x: Math.cos(th) / d, y: (Math.sin(th) * Math.cos(th)) / d });
    }
    for (let i = 0; i < LOOP_PTS; i++) {
      const a = loop[i];
      const b = loop[i + 1];
      maxV = Math.max(maxV, Math.hypot(b.x - a.x, b.y - a.y));
    }

    let CX = 0;
    let CY = 0;
    let A = 0; // lemniscate scale (px)

    // Point and speed-norm on the loop at parameter theta (any real).
    function sample(theta) {
      const twoPi = Math.PI * 2;
      const th = ((theta % twoPi) + twoPi) % twoPi;
      const f = (th / twoPi) * LOOP_PTS;
      const i0 = Math.floor(f) % LOOP_PTS;
      const i1 = (i0 + 1) % LOOP_PTS;
      const u = f - Math.floor(f);
      const a = loop[i0];
      const b = loop[i1];
      const speed = Math.hypot(b.x - a.x, b.y - a.y) / maxV; // 0..1
      return {
        x: CX + (a.x + (b.x - a.x) * u) * A,
        y: CY + (a.y + (b.y - a.y) * u) * A * 1.35, // stretch the lobes a touch
        speed,
      };
    }

    function nibPath(ctx, x, y, angle, L) {
      const W = L * 0.26;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Body: tip at origin, shoulders, heel — the classic nib silhouette.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(L * 0.3, -W, L * 0.72, -W * 0.82);
      ctx.quadraticCurveTo(L, -W * 0.3, L, 0);
      ctx.quadraticCurveTo(L, W * 0.3, L * 0.72, W * 0.82);
      ctx.quadraticCurveTo(L * 0.3, W, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Slit and breather hole, cut true.
      ctx.beginPath();
      ctx.moveTo(L * 0.05, 0);
      ctx.lineTo(L * 0.36, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(L * 0.44, 0, L * 0.055, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    PCFX.createScene({
      canvas,
      reducedT: 2400, // just past the crossing, trailing a full S of ink
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2 + state.h * 0.01;
        A = Math.min(state.w, state.h) * 0.44;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const drift = state.pointer.x * 0.06;
        const theta = (t / PERIOD) * Math.PI * 2 + drift;

        // The ghost of the whole flourish — the shape the nib will keep.
        ctx.beginPath();
        for (let i = 0; i <= LOOP_PTS; i++) {
          const p = loop[i];
          const px = CX + p.x * A;
          const py = CY + p.y * A * 1.35;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(212,175,55,0.085)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // The living ink: 3s of curve behind the nib, oldest first.
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let prev = null;
        let prevAge = 0;
        for (let k = SEGS; k >= 0; k--) {
          const age = (k / SEGS) * TRAIL;
          const p = sample(theta - (age / PERIOD) * Math.PI * 2);
          if (prev) {
            const midAge = (age + prevAge) / 2;
            const life = 1 - midAge / TRAIL;
            const shade = 0.55 + 0.45 * life;
            // Weight follows speed: slow at the crossing, the line swells.
            const weight = 0.9 + (1 - p.speed) * 2.6 * (0.4 + 0.6 * life);
            const warm = Math.floor(212 + 33 * life);
            ctx.strokeStyle = `rgba(${warm},${Math.floor(175 + 30 * life)},55,${(
              shade *
              life ** 1.25
            ).toFixed(3)})`;
            ctx.lineWidth = Math.max(0.6, weight * (A / 85));
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
          prev = p;
          prevAge = age;
        }

        // Ink shimmer: a glint riding a fixed distance back along the trail.
        const glintTheta = theta - (0.9 / PERIOD) * Math.PI * 2;
        const glint = sample(glintTheta);
        const glintPulse = Math.max(0, Math.sin(t * 2.3)) ** 6;
        const gSize = A * 0.16;
        ctx.globalAlpha = 0.16 + glintPulse * 0.45;
        ctx.drawImage(glow, glint.x - gSize / 2, glint.y - gSize / 2, gSize, gSize);
        ctx.globalAlpha = 1;

        // The nib itself, tipped onto the tangent with a calligrapher's roll.
        const head = sample(theta);
        const ahead = sample(theta + 0.02);
        const tangent = Math.atan2(ahead.y - head.y, ahead.x - head.x);
        const nibL = A * 0.21;
        const halo = nibL * 1.9;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(glow, head.x - halo / 2, head.y - halo / 2, halo, halo);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(212,175,55,0.92)';
        ctx.strokeStyle = 'rgba(245,227,168,0.85)';
        ctx.lineWidth = 0.8;
        nibPath(ctx, head.x, head.y, tangent + Math.PI - 0.3, nibL);
        // The wet point of contact.
        ctx.beginPath();
        ctx.arc(head.x, head.y, Math.max(1, A * 0.006), 0, Math.PI * 2);
        ctx.fillStyle = '#FFF6D8';
        ctx.fill();
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-nib').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
