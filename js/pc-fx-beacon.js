/**
 * PuniCodex — The Beacon (PC/FX scene, /contact/)
 *
 * A lighthouse beacon in the dark: a bright point source in the lamp room
 * of a simple hairline tower, with two counter-rotating light cones
 * sweeping the black (soft gradient wedges, one full period every 10s).
 * Dust motes drift through the night and flare when a beam crosses them.
 *
 * 2D canvas. The cones are pre-rendered once into an offscreen sprite
 * (radial-fade wedge with feathered edges) and drawn rotated about the
 * lamp; motes brighten by angular proximity to either beam.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const PERIOD = 10; // seconds per sweep
  const MOTES = 22;
  const PHI_FRAC = 0.6180339887498949;

  function frac(x) {
    return x - Math.floor(x);
  }

  // The cone sprite: apex at (0, H/2), fanning right. Built from narrow
  // sub-wedges whose alpha follows a cosine across the fan, so the beam is
  // brightest along its axis and dissolves at the edges — no hard outline.
  function makeConeSprite() {
    const W = 320;
    const H = 200;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const halfAngle = 0.24; // ~14 degrees
    const STRIPS = 30;
    for (let j = 0; j < STRIPS; j++) {
      const u0 = (j / STRIPS) * 2 - 1; // -1..1 across the fan
      const u1 = ((j + 1) / STRIPS) * 2 - 1;
      const a0 = u0 * halfAngle;
      const a1 = u1 * halfAngle;
      const axis = Math.cos(((u0 + u1) / 2) * (Math.PI / 2)) ** 2;
      const g = x.createRadialGradient(0, H / 2, 0, 0, H / 2, W);
      g.addColorStop(0, `rgba(245,227,168,${0.95 * axis})`);
      g.addColorStop(0.18, `rgba(226,196,110,${0.55 * axis})`);
      g.addColorStop(0.5, `rgba(212,175,55,${0.22 * axis})`);
      g.addColorStop(1, 'rgba(212,175,55,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, H / 2);
      x.arc(0, H / 2, W, a0, a1);
      x.closePath();
      x.fill();
    }
    return c;
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('245,227,168');
    const cone = makeConeSprite();

    const motes = [];
    for (let i = 0; i < MOTES; i++) {
      motes.push({
        x: frac(i * PHI_FRAC),
        y: frac(i * 0.7548776662 + 0.19),
        size: 0.9 + frac(i * 0.3180339887) * 1.4,
        phase: frac(i * 0.9196433771) * Math.PI * 2,
        drift: 0.004 + frac(i * 0.4426976731) * 0.008,
      });
    }

    let W2 = 0;
    let H2 = 0;
    let lampX = 0;
    let lampY = 0;
    let beamLen = 0;

    PCFX.createScene({
      canvas,
      reducedT: 2500, // one beam level to the right, the tower lit from above
      onResize(state) {
        W2 = state.w;
        H2 = state.h;
        lampX = state.w / 2;
        lampY = state.h * 0.36;
        beamLen = Math.max(state.w, state.h) * 0.62;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, W2, H2);
        const sway = state.pointer.x * 0.05;
        const a1 = (t / PERIOD) * Math.PI * 2 + sway;
        const a2 = -a1 + Math.PI / 2;

        // The two counter-rotating cones, additive where they cross.
        ctx.globalCompositeOperation = 'lighter';
        for (const a of [a1, a2]) {
          ctx.save();
          ctx.translate(lampX, lampY);
          ctx.rotate(a);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(cone, 0, -beamLen * 0.3, beamLen, beamLen * 0.6);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';

        // The tower: a hairline silhouette under the lamp.
        const baseY = H2 * 0.96;
        const galleryY = lampY + H2 * 0.06;
        ctx.strokeStyle = 'rgba(212,175,55,0.55)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lampX - W2 * 0.075, baseY);
        ctx.quadraticCurveTo(lampX - W2 * 0.045, (baseY + galleryY) / 2, lampX - W2 * 0.028, galleryY);
        ctx.moveTo(lampX + W2 * 0.075, baseY);
        ctx.quadraticCurveTo(lampX + W2 * 0.045, (baseY + galleryY) / 2, lampX + W2 * 0.028, galleryY);
        // gallery rail
        ctx.moveTo(lampX - W2 * 0.045, galleryY);
        ctx.lineTo(lampX + W2 * 0.045, galleryY);
        ctx.moveTo(lampX - W2 * 0.036, galleryY - H2 * 0.02);
        ctx.lineTo(lampX + W2 * 0.036, galleryY - H2 * 0.02);
        // lamp-room posts + dome
        ctx.moveTo(lampX - W2 * 0.026, galleryY);
        ctx.lineTo(lampX - W2 * 0.026, galleryY - H2 * 0.034);
        ctx.moveTo(lampX + W2 * 0.026, galleryY);
        ctx.lineTo(lampX + W2 * 0.026, galleryY - H2 * 0.034);
        ctx.moveTo(lampX - W2 * 0.026, galleryY - H2 * 0.034);
        ctx.quadraticCurveTo(lampX, galleryY - H2 * 0.085, lampX + W2 * 0.026, galleryY - H2 * 0.034);
        ctx.stroke();
        // a few rail posts
        ctx.beginPath();
        for (let k = -2; k <= 2; k++) {
          const px = lampX + k * W2 * 0.016;
          ctx.moveTo(px, galleryY);
          ctx.lineTo(px, galleryY - H2 * 0.02);
        }
        ctx.strokeStyle = 'rgba(212,175,55,0.3)';
        ctx.stroke();

        // Dust motes; they flare when a beam crosses them.
        for (const mote of motes) {
          const mx = (((mote.x + t * mote.drift) % 1) + 1) % 1 * W2;
          const my = (mote.y + Math.sin(t * 0.12 + mote.phase) * 0.02) * H2;
          const dx = mx - lampX;
          const dy = my - lampY;
          const dist = Math.hypot(dx, dy);
          let flare = 0;
          if (dist > 4 && dist < beamLen) {
            const ang = Math.atan2(dy, dx);
            for (const a of [a1, a2]) {
              let d = Math.cos(ang - a);
              if (d > 0) flare = Math.max(flare, d ** 24 * (1 - dist / beamLen));
            }
          }
          const tw = 0.65 + 0.35 * Math.sin(t * 0.6 + mote.phase * 3);
          const alpha = Math.min(1, 0.14 * tw + flare);
          if (flare > 0.12) {
            const gSize = mote.size * 6 * flare + 4;
            ctx.globalAlpha = flare * 0.6;
            ctx.drawImage(glow, mx - gSize / 2, my - gSize / 2, gSize, gSize);
          }
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(mx, my, mote.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#F5E3A8';
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // The lamp itself: a bright core with a breathing halo.
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.9);
        const halo = H2 * 0.42 * pulse;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(glow, lampX - halo / 2, lampY - halo / 2, halo, halo);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(lampX, lampY, Math.max(1.8, H2 * 0.014), 0, Math.PI * 2);
        ctx.fillStyle = '#FFF6D8';
        ctx.fill();
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-beacon').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
