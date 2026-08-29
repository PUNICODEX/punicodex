// Lahmu — Hairy Guardian: warm silt-light, swaying hair-like strands, guarded threshold
(function () {
  'use strict';
  const canvas = document.getElementById('lahmu-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function readColor(attr, fb) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
  }

  const P = readColor('data-primary', '#c98a4b'); // ochre / warm clay
  const S = readColor('data-secondary', '#e3b268'); // gold / silt highlight

  let width, height, dpr;
  let frame = 0;
  let strands = [];
  let motes = [];
  let pointer = { x: 0.5, y: 0.5, active: false };

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStrands();
    buildMotes();
  }

  function buildStrands() {
    strands = [];
    const count = Math.min(70, Math.floor((width * height) / 22000));
    for (let i = 0; i < count; i++) {
      strands.push({
        x: randomRange(0, width),
        y: randomRange(height * 0.55, height + 40),
        length: randomRange(height * 0.35, height * 0.75),
        width: randomRange(0.6, 2.2),
        hue: randomRange(24, 42),
        sat: randomRange(45, 75),
        light: randomRange(38, 62),
        alpha: randomRange(0.08, 0.28),
        phase: randomRange(0, Math.PI * 2),
        speed: randomRange(0.002, 0.008),
        sway: randomRange(20, 70),
      });
    }
  }

  function buildMotes() {
    motes = [];
    const count = Math.min(90, Math.floor((width * height) / 18000));
    for (let i = 0; i < count; i++) {
      motes.push({
        x: randomRange(0, width),
        y: randomRange(0, height),
        size: randomRange(0.5, 2.2),
        vx: randomRange(-0.15, 0.15),
        vy: randomRange(-0.25, -0.05),
        alpha: randomRange(0.05, 0.25),
        pulse: randomRange(0, Math.PI * 2),
        pulseSpeed: randomRange(0.02, 0.06),
      });
    }
  }

  function drawGate() {
    const cx = width * 0.5;
    const top = height * 0.12;
    const bottom = height * 0.92;
    const w = Math.min(width * 0.22, 220);
    const glow = 0.35 + 0.15 * Math.sin(frame * 0.01);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const lintelGrad = ctx.createLinearGradient(cx, top, cx, top + 24);
    lintelGrad.addColorStop(0, `rgba(${S.r},${S.g},${S.b},${glow})`);
    lintelGrad.addColorStop(1, `rgba(${S.r},${S.g},${S.b},0)`);
    ctx.fillStyle = lintelGrad;
    ctx.fillRect(cx - w * 0.5, top, w, 24);

    for (const dx of [-w * 0.5 + 3, w * 0.5 - 9]) {
      const postGrad = ctx.createLinearGradient(cx + dx, top, cx + dx, bottom);
      postGrad.addColorStop(0, `rgba(${P.r},${P.g},${P.b},${glow * 0.6})`);
      postGrad.addColorStop(0.5, `rgba(${P.r},${P.g},${P.b},${glow * 0.25})`);
      postGrad.addColorStop(1, `rgba(${P.r},${P.g},${P.b},0)`);
      ctx.fillStyle = postGrad;
      ctx.fillRect(cx + dx, top, 6, bottom - top);
    }

    ctx.restore();
  }

  function drawBackground() {
    const bg = ctx.createRadialGradient(
      width * 0.5,
      height * 1.1,
      0,
      width * 0.5,
      height * 1.1,
      Math.max(width, height) * 0.9
    );
    bg.addColorStop(0, `rgba(${Math.round(P.r * 0.6)},${Math.round(P.g * 0.55)},${Math.round(P.b * 0.35)},0.22)`);
    bg.addColorStop(0.45, 'rgba(42,25,16,0.14)');
    bg.addColorStop(1, 'rgba(13,9,7,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const topShadow = ctx.createLinearGradient(0, 0, 0, height * 0.35);
    topShadow.addColorStop(0, 'rgba(13,9,7,0.55)');
    topShadow.addColorStop(1, 'rgba(13,9,7,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(0, 0, width, height * 0.35);
  }

  function drawStrands() {
    const wind = pointer.active ? (pointer.x - 0.5) * 40 : 0;

    ctx.save();
    ctx.lineCap = 'round';
    strands.forEach((s) => {
      const t = frame * s.speed + s.phase;
      const rootX = s.x + Math.sin(t * 0.7) * s.sway * 0.3;
      const rootY = s.y;
      const tipX =
        rootX +
        Math.sin(t) * s.sway +
        Math.cos(t * 1.3) * s.sway * 0.5 +
        wind * (s.length / height);
      const tipY = rootY - s.length;
      const cp1x = rootX + (tipX - rootX) * 0.25 + Math.sin(t * 0.9) * s.sway * 0.4;
      const cp1y = rootY - s.length * 0.3;
      const cp2x = rootX + (tipX - rootX) * 0.75 + Math.cos(t * 0.6) * s.sway * 0.4;
      const cp2y = rootY - s.length * 0.7;

      ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${s.alpha})`;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawMotes() {
    ctx.save();
    motes.forEach((m) => {
      m.pulse += m.pulseSpeed;
      m.x += m.vx + Math.sin(m.pulse) * 0.2;
      m.y += m.vy;
      if (m.y < -10) {
        m.y = height + 10;
        m.x = randomRange(0, width);
      }
      if (m.x < -10) m.x = width + 10;
      if (m.x > width + 10) m.x = -10;

      const alpha = m.alpha * (0.6 + 0.4 * Math.sin(m.pulse));
      ctx.fillStyle = `rgba(227,213,192,${alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawStrands();
    drawGate();
    drawMotes();
    if (!reduced) {
      frame++;
      requestAnimationFrame(draw);
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) {
    window.addEventListener(
      'mousemove',
      (e) => {
        pointer.x = e.clientX / window.innerWidth;
        pointer.y = e.clientY / window.innerHeight;
        pointer.active = true;
      },
      { passive: true }
    );
  }

  draw();
})();
