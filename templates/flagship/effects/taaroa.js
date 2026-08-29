// Taaroa — Tahitian creator supreme being; cosmic shell, primordial waters, star birth
(function() {
  'use strict';

  const canvas = document.getElementById('taaroa-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!canvas || !ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function readColor(attr, fallback) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
  }

  const P = readColor('data-primary', '#008080');
  const S = readColor('data-secondary', '#FFD700');

  let width, height, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const shellRings = [];
  for (let i = 0; i < 6; i++) {
    shellRings.push({
      r: 40 + i * 35,
      alpha: 0.08 - i * 0.01,
      phase: Math.random() * Math.PI * 2
    });
  }

  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.6 + Math.random() * 1.8,
      alpha: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  const spirals = [];
  for (let i = 0; i < 4; i++) {
    spirals.push({
      x: 0.15 + (i / 3) * 0.7,
      y: 0.15 + Math.random() * 0.7,
      size: 40 + Math.random() * 80,
      phase: Math.random() * Math.PI * 2,
      coils: 2 + Math.random() * 2
    });
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.08}, ${P.g * 0.12}, ${P.b * 0.12}, 0.95)`);
    bg.addColorStop(1, `rgba(${P.r * 0.2}, ${P.g * 0.15}, ${P.b * 0.1}, 0.98)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Creation spirals
    spirals.forEach(s => {
      const cx = s.x * width;
      const cy = s.y * height;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.001 + s.phase);
      ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${0.15 * pulse})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a <= s.coils * Math.PI * 2; a += 0.08) {
        const r = (a / (s.coils * Math.PI * 2)) * s.size;
        const x = cx + Math.cos(a + time * 0.0005 + s.phase) * r;
        const y = cy + Math.sin(a + time * 0.0005 + s.phase) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // Cosmic shell at centre
    const cx = width * 0.5;
    const cy = height * 0.5;
    shellRings.forEach((ring, i) => {
      const pulse = 0.8 + 0.2 * Math.sin(time * 0.002 + ring.phase);
      ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${ring.alpha * pulse})`;
      ctx.lineWidth = 2 + i;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ring.r * (1 + 0.05 * Math.sin(time * 0.001 + i)), ring.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Birth stars
    stars.forEach(s => {
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.03 + s.phase);
      ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
