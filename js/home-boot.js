/**
 * PuniCodex — The Convergence (first-visit boot sequence)
 *
 * A one-shot opening ritual for the homepage: glyphs from the pantheons'
 * scripts fall out of deep space and assemble into the armillary sphere
 * around the PuniCodex seal, hold a beat, then the veil dissolves into the
 * live hero orrery already running behind it.
 *
 * Gated by sessionStorage (once per browser session) and skipped entirely
 * for prefers-reduced-motion. Failsafe removal at 5s no matter what.
 */
(function () {
  'use strict';

  const veil = document.getElementById('boot-veil');
  if (!veil) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // sessionStorage can throw on mobile (private browsing, tracking
  // prevention). Storage blocked = behave like a returning visitor.
  let seen = false;
  try {
    seen = !!window.sessionStorage.getItem('pc-boot-seen');
  } catch (_e) {
    seen = true;
  }
  if (reduced || seen || !window.PCFX) {
    veil.remove();
    return;
  }
  try {
    window.sessionStorage.setItem('pc-boot-seen', '1');
  } catch (_e) {
    /* non-fatal */
  }

  // Register the failsafe BEFORE anything that can throw: no matter what
  // happens below, the veil can never strand the visitor.
  const failsafeId = setTimeout(() => {
    if (document.body.contains(veil)) veil.remove();
  }, 5000);

  const canvas = veil.querySelector('canvas');
  if (!canvas || !canvas.getContext) {
    veil.remove();
    clearTimeout(failsafeId);
    return;
  }
  const PCFX = window.PCFX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    veil.remove();
    clearTimeout(failsafeId);
    return;
  }
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ── Scene: a small orrery assembling around the seal ────────────────────
  const sets = [
    PCFX.SCRIPTS.greek,
    PCFX.SCRIPTS.runes,
    PCFX.SCRIPTS.cuneiform,
    PCFX.SCRIPTS.devanagari,
    PCFX.SCRIPTS.cjk,
    PCFX.SCRIPTS.hebrew,
  ];
  const glyphs = PCFX.buildAtlas(sets, PCFX.TINTS, 64);
  const glow = PCFX.makeGlowSprite('212,175,55');

  const N = 260;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const particles = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    // Target: shell position. Start: the same direction, flung far out.
    const dir = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    const far = 3.2 + Math.random() * 3.4;
    particles.push({
      tx: dir.x * (0.58 + 0.37 * Math.random()),
      ty: dir.y * (0.58 + 0.37 * Math.random()),
      tz: dir.z * (0.58 + 0.37 * Math.random()),
      sx: dir.x * far,
      sy: dir.y * far,
      sz: dir.z * far,
      glyph: glyphs[(Math.random() * glyphs.length) | 0],
      size: 0.5 + Math.random() * 0.65,
      delay: (i / N) * 1.05 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const RINGS = [
    { tilt: 0.42, alpha: 0.4, radius: 1.06 },
    { tilt: -0.68, alpha: 0.26, radius: 1.16 },
    { tilt: 1.18, alpha: 0.18, radius: 1.26 },
  ];

  let W = 0;
  let H = 0;
  let CX = 0;
  let CY = 0;
  let ORBIT = 0;

  function resize() {
    const rect = veil.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H * 0.44;
    ORBIT = Math.min(W * 0.3, H * 0.3);
  }

  const start = performance.now();
  const CONVERGE_S = 2.1; // per-particle flight time base
  const HOLD_S = 3.3; // when the veil starts dissolving

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function drawFrame(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, W, H);
    const rotY = t * 0.35;
    const rotX = 0.42;
    const project = PCFX.makeProjector(rotY, rotX, 3.1);

    // Nebula grows with convergence.
    const progress = Math.min(1, t / CONVERGE_S);
    const nebR = ORBIT * (0.4 + progress * 0.7);
    ctx.globalAlpha = 0.35 + progress * 0.35;
    ctx.drawImage(glow, CX - nebR, CY - nebR, nebR * 2, nebR * 2);
    ctx.globalAlpha = 1;

    const projected = [];
    for (const p of particles) {
      const local = Math.min(1, Math.max(0, (t - p.delay) / (CONVERGE_S * 0.72)));
      const e = easeOutCubic(local);
      if (e <= 0) continue;
      const x = p.sx + (p.tx - p.sx) * e;
      const y = p.sy + (p.ty - p.sy) * e;
      const z = p.sz + (p.tz - p.sz) * e;
      const pr = project(x, y, z, CX, CY, ORBIT);
      projected.push({ p, pr, e });
    }
    projected.sort((a, b) => a.pr.z - b.pr.z);

    for (const { p, pr, e } of projected) {
      const depth = (pr.z + 1.4) / 2.8;
      const tier = depth > 0.55 ? 0 : depth > 0.34 ? 1 : 2;
      const tw = 0.85 + 0.15 * Math.sin(t * 1.6 + p.phase);
      ctx.globalAlpha = Math.min(1, (0.15 + depth * depth * 0.85) * tw * Math.min(1, e * 2));
      const size = 64 * p.size * pr.scale * 0.4;
      if (pr.z > 0.4 && e > 0.9) {
        const gSize = size * 3.4;
        ctx.globalAlpha = (pr.z - 0.4) * 0.5 * tw;
        ctx.drawImage(glow, pr.sx - gSize / 2, pr.sy - gSize / 2, gSize, gSize);
        ctx.globalAlpha = Math.min(1, (0.15 + depth * depth * 0.85) * tw);
      }
      ctx.drawImage(p.glyph.sprites[tier], pr.sx - size / 2, pr.sy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    // Armillary rings draw in after 55% convergence.
    const ringAlpha = Math.min(1, Math.max(0, (progress - 0.55) / 0.35));
    if (ringAlpha > 0) {
      for (const ring of RINGS) {
        ctx.beginPath();
        const cosT = Math.cos(ring.tilt);
        const sinT = Math.sin(ring.tilt);
        const cosY2 = Math.cos(rotY * 0.6);
        const sinY2 = Math.sin(rotY * 0.6);
        for (let s = 0; s <= 140; s++) {
          const a = (s / 140) * Math.PI * 2;
          const x = Math.cos(a) * ring.radius;
          const y = Math.sin(a) * ring.radius;
          const y2 = y * cosT;
          const z2r = y * sinT;
          const x3 = x * cosY2 + z2r * sinY2;
          const z3 = -x * sinY2 + z2r * cosY2;
          const y3 = y2 * Math.cos(rotX) - z3 * Math.sin(rotX);
          const z4 = y2 * Math.sin(rotX) + z3 * Math.cos(rotX);
          const scale = 3.1 / (3.1 - z4);
          const sx = CX + x3 * scale * ORBIT;
          const sy = CY + y3 * scale * ORBIT;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(212,175,55,${ring.alpha * ringAlpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function loop(now) {
    try {
      drawFrame(now);
    } catch (_e) {
      // A rendering fault must never freeze the veil — dissolve now.
      dissolve();
      return;
    }
    if ((now - start) / 1000 < HOLD_S + 1) {
      requestAnimationFrame(loop);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);

  // Dissolve after the hold, then remove. Tap anywhere to skip.
  function dissolve() {
    if (!document.body.contains(veil)) return;
    veil.classList.add('done');
    setTimeout(() => {
      if (document.body.contains(veil)) veil.remove();
      clearTimeout(failsafeId);
    }, 900);
  }
  veil.addEventListener('pointerdown', dissolve, { once: true });
  setTimeout(dissolve, HOLD_S * 1000);
})();
