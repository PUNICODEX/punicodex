// Makemake — Rapa Nui creator, bird-man; petroglyph spirals, seabirds, ochre moai
(function() {
  'use strict';

  const canvas = document.getElementById('makemake-canvas');
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

  const P = readColor('data-primary', '#B22222');
  const S = readColor('data-secondary', '#D4AF37');

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

  const spirals = [];
  for (let i = 0; i < 7; i++) {
    spirals.push({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.7,
      size: 30 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
      coils: 2 + Math.random() * 2
    });
  }

  const birds = [];
  for (let i = 0; i < 8; i++) {
    birds.push({
      x: -60 - Math.random() * 300,
      y: height * (0.1 + Math.random() * 0.5),
      speed: 0.8 + Math.random() * 0.8,
      size: 10 + Math.random() * 12,
      wingSpeed: 0.05 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.15
    });
  }

  const motu = [];
  for (let i = 0; i < 5; i++) {
    motu.push({
      x: 0.05 + (i / 4) * 0.9 + (Math.random() - 0.5) * 0.04,
      y: 0.78 + Math.random() * 0.1,
      size: 40 + Math.random() * 70,
      alpha: 0.08 + Math.random() * 0.08
    });
  }

  function drawBird(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.size / 12, b.size / 12);
    ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${b.opacity})`;
    ctx.lineWidth = 1.5;
    const wingY = Math.sin(time * b.wingSpeed + b.phase) * 6;
    ctx.beginPath();
    ctx.moveTo(-12, wingY);
    ctx.quadraticCurveTo(0, -4, 12, wingY);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.1}, ${P.g * 0.12}, ${P.b * 0.1}, 0.9)`);
    bg.addColorStop(1, `rgba(${S.r * 0.12}, ${S.g * 0.15}, ${S.b * 0.05}, 0.95)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Ochre petroglyph spirals
    spirals.forEach(s => {
      const cx = s.x * width;
      const cy = s.y * height;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.001 + s.phase);
      ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${0.18 * pulse})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a <= s.coils * Math.PI * 2; a += 0.1) {
        const r = (a / (s.coils * Math.PI * 2)) * s.size;
        const x = cx + Math.cos(a + time * 0.0005 + s.phase) * r;
        const y = cy + Math.sin(a + time * 0.0005 + s.phase) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // Bird-man seabirds
    birds.forEach(b => {
      b.x += b.speed;
      if (b.x > width + 60) {
        b.x = -60 - Math.random() * 300;
        b.y = height * (0.1 + Math.random() * 0.5);
      }
      drawBird(b);
    });

    // Distant moai / motu silhouettes
    motu.forEach(m => {
      const x = m.x * width;
      const y = m.y * height;
      ctx.fillStyle = `rgba(${P.r * 0.6}, ${P.g * 0.5}, ${P.b * 0.4}, ${m.alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, m.size * 0.35, m.size, 0, Math.PI, 0);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
