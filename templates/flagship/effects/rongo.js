// Rongo — Agriculture, peace, cultivated foods; kumara vines, doves, golden grain
(function() {
  'use strict';

  const canvas = document.getElementById('rongo-canvas');
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

  const P = readColor('data-primary', '#DAA520');
  const S = readColor('data-secondary', '#228B22');

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

  const vines = [];
  for (let i = 0; i < 12; i++) {
    vines.push({
      x: 0.05 + (i / 11) * 0.9 + (Math.random() - 0.5) * 0.04,
      y: 0.85 + Math.random() * 0.1,
      height: 60 + Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? S : { r: S.r + 20, g: S.g + 30, b: S.b + 10 }
    });
  }

  const doves = [];
  for (let i = 0; i < 5; i++) {
    doves.push({
      x: -60 - Math.random() * 300,
      y: height * (0.15 + Math.random() * 0.5),
      speed: 0.7 + Math.random() * 0.6,
      size: 12 + Math.random() * 10,
      wingSpeed: 0.04 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.15 + Math.random() * 0.12
    });
  }

  const grains = [];
  for (let i = 0; i < 70; i++) {
    grains.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.2 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.2,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawDove(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.size / 12, d.size / 12);
    ctx.strokeStyle = `rgba(${P.r + 40}, ${P.g + 40}, ${P.b + 20}, ${d.opacity})`;
    ctx.lineWidth = 1.5;
    const wingY = Math.sin(time * d.wingSpeed + d.phase) * 5;
    ctx.beginPath();
    ctx.moveTo(-12, wingY);
    ctx.quadraticCurveTo(0, -3, 12, wingY);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${S.r * 0.08}, ${S.g * 0.15}, ${S.b * 0.08}, 0.9)`);
    bg.addColorStop(1, `rgba(${P.r * 0.12}, ${P.g * 0.15}, ${P.b * 0.05}, 0.95)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Kumara / cultivated vines
    vines.forEach(v => {
      const x = v.x * width;
      const baseY = v.y * height;
      const sway = Math.sin(time * 0.002 + v.phase) * 10;
      const h = v.height;
      ctx.strokeStyle = `rgba(${v.color.r}, ${v.color.g}, ${v.color.b}, 0.65)`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway, baseY - h * 0.5, x + sway * 0.5, baseY - h);
      ctx.stroke();
      // Leaves
      for (let j = 0; j < 5; j++) {
        const ly = baseY - h * (0.2 + j * 0.18);
        const lx = x + sway * (0.2 + j * 0.15);
        ctx.fillStyle = `rgba(${v.color.r}, ${v.color.g}, ${v.color.b}, 0.5)`;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 8, 5, Math.sin(time * 0.003 + v.phase + j) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Peace doves
    doves.forEach(d => {
      d.x += d.speed;
      if (d.x > width + 60) {
        d.x = -60 - Math.random() * 300;
        d.y = height * (0.15 + Math.random() * 0.5);
      }
      drawDove(d);
    });

    // Golden grain dust
    grains.forEach(g => {
      g.y += g.vy;
      g.x += g.vx;
      if (g.y > height + 10) {
        g.y = -10;
        g.x = Math.random() * width;
      }
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.02 + g.phase);
      ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${g.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
