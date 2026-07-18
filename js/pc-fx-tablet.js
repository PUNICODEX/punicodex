/**
 * PuniCodex — The Tablet (PC/FX scene, /terms/ and /privacy/)
 *
 * A clay tablet being inscribed with cuneiform. The wedges are authentic
 * impressions, not font glyphs: a triangular nail head with a thin tail,
 * pressed one by one, left to right, row by row. Each press carries a small
 * pulse (scale pop + dent glow) as the stylus strikes; when the tablet
 * fills, the writing fades and a fresh tablet begins. Slow and meditative.
 *
 * The tablet is a soft-edged rounded rectangle with a subtle 3D tilt
 * (rotation + vertical squash) and a gold rim light along its top edge.
 * Wedge clusters are chosen deterministically (golden-ratio hash) so the
 * reduced-motion still is a stable, half-inscribed composition.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const ROWS = 6;
  const COLS = 8;
  const SLOTS = ROWS * COLS;
  const DT = 0.32; // seconds between presses
  const HOLD = 2.2; // full tablet dwell
  const FADE = 1.5; // writing fade-out
  const GAP = 0.5; // blank beat before the next tablet
  const CYCLE = SLOTS * DT + HOLD + FADE + GAP;
  const PHI_FRAC = 0.6180339887498949;

  function frac(x) {
    return x - Math.floor(x);
  }

  // Smooth rounded-rect path (the soft tablet edge).
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ── Authentic wedge strokes (no glyphs) ────────────────────────────────
  // Vertical wedge: bold triangular head, short tail — the classic nail.
  function vWedge(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.52);
    ctx.lineTo(x + s * 0.4, y - s * 0.52);
    ctx.lineTo(x, y + s * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.14);
    ctx.lineTo(x, y + s * 0.42);
    ctx.stroke();
  }

  // Horizontal wedge: head on the left pointing right, tail to the right.
  function hWedge(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.34);
    ctx.lineTo(x - s * 0.5, y + s * 0.34);
    ctx.lineTo(x + s * 0.1, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y);
    ctx.lineTo(x + s * 0.44, y);
    ctx.stroke();
  }

  // Winkelhaken: the diagonal corner wedge — small head with a 45° tail.
  function winkel(ctx, x, y, s) {
    const c = Math.cos(-Math.PI / 4);
    const n = Math.sin(-Math.PI / 4);
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(c, -n, n, c, 0, 0);
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.26);
    ctx.lineTo(-s * 0.3, s * 0.26);
    ctx.lineTo(s * 0.02, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.02, 0);
    ctx.lineTo(s * 0.34, 0);
    ctx.stroke();
    ctx.restore();
  }

  // A sign is a small deterministic cluster of 1–3 wedges inside its cell.
  function drawSign(ctx, i, x, y, s) {
    const h1 = frac(i * PHI_FRAC);
    const h2 = frac(i * 0.3180339887 + 0.37);
    if (h1 < 0.26) {
      vWedge(ctx, x, y, s);
    } else if (h1 < 0.46) {
      vWedge(ctx, x - s * 0.3, y, s * 0.86);
      vWedge(ctx, x + s * 0.3, y, s * 0.86);
    } else if (h1 < 0.64) {
      hWedge(ctx, x, y, s);
    } else if (h1 < 0.8) {
      hWedge(ctx, x - s * 0.12, y - s * 0.3, s * 0.8);
      vWedge(ctx, x + s * 0.18, y + s * 0.24, s * 0.8);
    } else if (h1 < 0.91) {
      winkel(ctx, x, y, s);
    } else {
      vWedge(ctx, x, y + s * 0.1, s * 1.06);
      if (h2 > 0.5) hWedge(ctx, x + s * 0.4, y - s * 0.34, s * 0.6);
    }
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');

    let S = 0; // stage edge (square)
    let TX = 0; // tablet rect
    let TY = 0;
    let TW = 0;
    let TH = 0;
    let GX = 0; // grid origin (slot 0 centre)
    let GY = 0;
    let CW = 0; // cell pitch
    let CH = 0;

    PCFX.createScene({
      canvas,
      reducedT: 10200, // exactly four inscribed rows, last press still warm
      onResize(state) {
        S = Math.min(state.w, state.h);
        TW = S * 0.86;
        TH = S * 0.74;
        TX = (state.w - TW) / 2;
        TY = (state.h - TH) / 2 + S * 0.01;
        GX = TX + TW * 0.11;
        GY = TY + TH * 0.14;
        CW = (TW * 0.78) / COLS;
        CH = (TH * 0.74) / ROWS;
      },
      onFrame(state, t) {
        const { ctx } = state;
        ctx.clearRect(0, 0, state.w, state.h);
        const tt = t % CYCLE;
        const pressT = SLOTS * DT;

        // Cycle phase: how many wedges exist, and the writing fade.
        let count;
        let writingAlpha = 1;
        if (tt < pressT) {
          count = Math.min(SLOTS, Math.floor(tt / DT) + 1);
        } else if (tt < pressT + HOLD) {
          count = SLOTS;
        } else if (tt < pressT + HOLD + FADE) {
          count = SLOTS;
          writingAlpha = 1 - (tt - pressT - HOLD) / FADE;
        } else {
          count = 0;
        }

        // Ambient warmth behind the clay.
        const gR = S * 0.78;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(glow, TX + TW / 2 - gR, TY + TH / 2 - gR, gR * 2, gR * 2);
        ctx.globalAlpha = 1;

        // The tablet: subtle 3D tilt (rotate + squash) about its centre.
        ctx.save();
        ctx.translate(TX + TW / 2, TY + TH / 2);
        ctx.rotate(-0.045 + state.pointer.x * 0.012);
        ctx.scale(1, 0.965);
        ctx.translate(-(TX + TW / 2), -(TY + TH / 2));

        // Soft-edged clay body.
        const clay = ctx.createLinearGradient(0, TY, 0, TY + TH);
        clay.addColorStop(0, '#2c2318');
        clay.addColorStop(0.55, '#1e1710');
        clay.addColorStop(1, '#120d09');
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = S * 0.05;
        roundedRect(ctx, TX, TY, TW, TH, S * 0.045);
        ctx.fillStyle = clay;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(212,175,55,0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Top-light: a soft sheen falling from the upper left.
        const sheen = ctx.createLinearGradient(TX, TY, TX + TW * 0.7, TY + TH * 0.8);
        sheen.addColorStop(0, 'rgba(245,227,168,0.075)');
        sheen.addColorStop(0.5, 'rgba(245,227,168,0.015)');
        sheen.addColorStop(1, 'rgba(245,227,168,0)');
        roundedRect(ctx, TX, TY, TW, TH, S * 0.045);
        ctx.fillStyle = sheen;
        ctx.fill();

        // Gold rim light along the top edge, falling off to the sides.
        const rim = ctx.createLinearGradient(TX, 0, TX + TW, 0);
        rim.addColorStop(0, 'rgba(212,175,55,0)');
        rim.addColorStop(0.5, 'rgba(245,227,168,0.65)');
        rim.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(TX + S * 0.05, TY + 1);
        ctx.lineTo(TX + TW - S * 0.05, TY + 1);
        ctx.stroke();

        // The inscription.
        ctx.fillStyle = '#D4AF37';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const px = GX + CW * (col + 0.5);
          const py = GY + CH * (row + 0.5);
          const age = Math.max(0, Math.min(tt, pressT + HOLD) - i * DT);
          const pulse = Math.exp(-age * 2.8);
          const born = Math.min(1, age * 3.5);
          const s = Math.min(CW, CH) * 0.46 * (1 + pulse * 0.22);

          // The stylus strike: a brief dent of light in the clay.
          if (pulse > 0.04 && writingAlpha > 0) {
            const dR = s * 3.2;
            ctx.globalAlpha = pulse * 0.5 * writingAlpha;
            ctx.drawImage(glow, px - dR, py - dR, dR * 2, dR * 2);
          }

          const shade = 0.85 + 0.15 * frac(i * 0.7548776662 + 0.11);
          const warm = Math.floor(245 - (245 - 212) * (1 - pulse));
          ctx.fillStyle = `rgba(${warm},${Math.floor(175 + 52 * pulse)},55,${(
            shade *
            born *
            writingAlpha
          ).toFixed(3)})`;
          ctx.strokeStyle = ctx.fillStyle;
          drawSign(ctx, i, px, py, s);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-tablet').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
