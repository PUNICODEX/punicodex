/**
 * PuniCodex — The Eclipse (PC/FX scene, /about/)
 *
 * A slow solar eclipse, pure 2D canvas math. ~240 corona streaks radiate
 * from the sun's limb, each a hairline with a hash-jittered length and its
 * own shimmer phase; ~150 stars twinkle behind. The moon is an obsidian
 * disc crossing on a 24 s loop:
 *   x(t) = 2.4R · cos(2πt/24 + π)   → totality twice per loop (t = 6, 18)
 * As the disc nears centre the corona flares (streaks lengthen and brighten)
 * and a diamond ring flares at the exposed limb — the point opposite the
 * moon, where the sun's edge is uncovered last. Totality frame is chosen
 * for reduced motion: moon just off centre, corona flared, diamond alight.
 *
 * Built on window.PCFX (js/pc-fx-core.js). Reduced motion renders one
 * static frame; pointer parallax comes from the scene core.
 */
(function () {
  'use strict';
  const PCFX = window.PCFX;
  if (!PCFX) return;

  const STARS = 150;
  const STREAKS = 240;
  const LOOP = 24; // seconds per orbit
  const OBSIDIAN = '#050505'; // matches --void in css/main.css

  // Deterministic hash noise (GLSL-style) so the still frame is stable.
  function hash(i, salt) {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function smoothstep(a, b, x) {
    const s = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return s * s * (3 - 2 * s);
  }

  function attach(canvas) {
    const glow = PCFX.makeGlowSprite('212,175,55');
    const glowIvory = PCFX.makeGlowSprite('245,227,168');

    const stars = [];
    for (let i = 0; i < STARS; i++) {
      stars.push({
        x: hash(i, 1),
        y: hash(i, 2),
        r: 0.5 + hash(i, 3) * 1.3,
        phase: hash(i, 4) * Math.PI * 2,
        speed: 0.4 + hash(i, 5) * 1.6,
        cross: i % 13 === 0,
      });
    }

    const streaks = [];
    for (let i = 0; i < STREAKS; i++) {
      streaks.push({
        angle: (i / STREAKS) * Math.PI * 2 + (hash(i, 6) - 0.5) * 0.03,
        len: 0.14 + hash(i, 7) * 0.6, // fraction of R
        alpha: 0.25 + hash(i, 8) * 0.55,
        phase: hash(i, 9) * Math.PI * 2,
        speed: 0.5 + hash(i, 10) * 1.4,
        ivory: hash(i, 11) > 0.55,
      });
    }

    let CX = 0;
    let CY = 0;
    let R = 0;

    PCFX.createScene({
      canvas,
      reducedT: 6250, // moon just past centre: corona flared, diamond alight
      onResize(state) {
        CX = state.w / 2;
        CY = state.h / 2;
        R = Math.min(state.w, state.h) * 0.27;
      },
      onFrame(state, t) {
        const { ctx } = state;
        t = Math.max(0, t); // the first rAF timestamp can precede scene start
        ctx.clearRect(0, 0, state.w, state.h);

        // Parallax: the whole firmament drifts a few px against the pointer.
        const ox = state.pointer.x * -6;
        const oy = state.pointer.y * -4;
        const cx = CX + ox;
        const cy = CY + oy;

        // The moon on its chord across the sun.
        const mx = cx + 2.4 * R * Math.cos(((2 * Math.PI) / LOOP) * t + Math.PI);
        const my = cy + 0.12 * R;
        const Rm = R * 0.92;

        // Coverage → flare envelopes.
        const p = 1 - Math.max(0, Math.min(1, Math.abs(mx - cx) / (0.9 * R)));
        const flare = smoothstep(0.35, 0.95, p);
        const diamond = smoothstep(0.55, 0.78, p) * (1 - smoothstep(0.86, 1, p));

        // Stars.
        for (const s of stars) {
          const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
          const a = tw * (0.45 + flare * 0.4); // stars gain at totality
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = '#F5E3A8';
          const sx = s.x * state.w + ox * 0.4;
          const sy = s.y * state.h + oy * 0.4;
          ctx.fillRect(sx, sy, s.r, s.r);
          if (s.cross) {
            ctx.globalAlpha = a * 0.5;
            ctx.fillRect(sx - s.r * 2.2, sy + s.r * 0.3, s.r * 5.4, s.r * 0.4);
            ctx.fillRect(sx + s.r * 0.3, sy - s.r * 2.2, s.r * 0.4, s.r * 5.4);
          }
        }
        ctx.globalAlpha = 1;

        // Ambient glow behind the ring; swells at totality.
        const nebR = R * (1.6 + flare * 0.7);
        ctx.globalAlpha = 0.3 + flare * 0.35;
        ctx.drawImage(glow, cx - nebR, cy - nebR, nebR * 2, nebR * 2);
        // A luminous root at the limb so the streaks emerge from light.
        const rootR = R * 1.3;
        ctx.globalAlpha = 0.5 + flare * 0.3;
        ctx.drawImage(glowIvory, cx - rootR, cy - rootR, rootR * 2, rootR * 2);
        ctx.globalAlpha = 1;

        // The corona: jittered radial streaks, lengthening with the flare.
        ctx.lineWidth = 1;
        for (const st of streaks) {
          const shimmer = 0.9 + 0.18 * Math.sin(t * st.speed + st.phase);
          const len = R * st.len * shimmer * (1 + flare * 0.95);
          const a = st.alpha * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.speed * 0.7 + st.phase)));
          const r0 = R * 0.99;
          const x0 = cx + Math.cos(st.angle) * r0;
          const y0 = cy + Math.sin(st.angle) * r0;
          const x1 = cx + Math.cos(st.angle) * (r0 + len);
          const y1 = cy + Math.sin(st.angle) * (r0 + len);
          ctx.strokeStyle = st.ivory
            ? `rgba(245,227,168,${Math.min(1, a * (0.7 + flare * 0.6))})`
            : `rgba(212,175,55,${Math.min(1, a * (0.55 + flare * 0.6))})`;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        // A hairline anchoring the ring itself.
        ctx.strokeStyle = `rgba(212,175,55,${0.16 + flare * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.99, 0, Math.PI * 2);
        ctx.stroke();

        // The moon: obsidian disc with a whisper of a rim.
        ctx.fillStyle = OBSIDIAN;
        ctx.beginPath();
        ctx.arc(mx, my, Rm, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(212,175,55,${0.18 + flare * 0.25})`;
        ctx.beginPath();
        ctx.arc(mx, my, Rm, 0, Math.PI * 2);
        ctx.stroke();

        // The diamond ring at the exposed limb.
        if (diamond > 0.01) {
          const ang = Math.atan2(cy - my, cx - mx);
          const dx = cx + Math.cos(ang) * R * 0.99;
          const dy = cy + Math.sin(ang) * R * 0.99;
          const gs = R * (0.35 + 0.3 * diamond);
          ctx.globalAlpha = Math.min(1, diamond);
          ctx.drawImage(glowIvory, dx - gs / 2, dy - gs / 2, gs, gs);
          const arm = R * 0.3 * diamond;
          ctx.strokeStyle = `rgba(245,227,168,${0.9 * diamond})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dx - arm, dy);
          ctx.lineTo(dx + arm, dy);
          ctx.moveTo(dx, dy - arm);
          ctx.lineTo(dx, dy + arm);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,248,225,${diamond})`;
          ctx.fillRect(dx - 1.5, dy - 1.5, 3, 3);
          ctx.globalAlpha = 1;
        }
      },
    });
  }

  function init() {
    document.querySelectorAll('canvas.pc-fx-eclipse').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
