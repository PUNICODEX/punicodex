// Kamapuaa — Pig god of agriculture; taro leaves, boar silhouettes, fertile mud
(function() {
  'use strict';

  const canvas = document.getElementById('kamapuaa-canvas');
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

  const P = readColor('data-primary', '#8B4513');
  const S = readColor('data-secondary', '#556B2F');

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

  const boars = [];
  for (let i = 0; i < 4; i++) {
    boars.push({
      x: -120 - Math.random() * 400,
      y: height * (0.55 + Math.random() * 0.3),
      speed: 0.5 + Math.random() * 0.6,
      size: 18 + Math.random() * 14,
      opacity: 0.12 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2
    });
  }

  const leaves = [];
  for (let i = 0; i < 28; i++) {
    leaves.push({
      x: Math.random() * width,
      y: height + Math.random() * 100,
      size: 16 + Math.random() * 28,
      speed: 0.3 + Math.random() * 0.5,
      sway: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? S : P
    });
  }

  const spatter = [];
  for (let i = 0; i < 50; i++) {
    spatter.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 3,
      alpha: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawBoar(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.size / 20, b.size / 20);
    ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${b.opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(28, -10);
    ctx.lineTo(26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(28, 10);
    ctx.lineTo(26, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.12}, ${P.g * 0.15}, ${P.b * 0.1}, 0.92)`);
    bg.addColorStop(1, `rgba(${S.r * 0.1}, ${S.g * 0.2}, ${S.b * 0.1}, 0.96)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    const time = frame;

    // Taro leaves rising
    leaves.forEach(l => {
      l.y -= l.speed;
      l.x += Math.sin(time * 0.005 + l.phase) * l.sway;
      if (l.y < -40) {
        l.y = height + 40;
        l.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(Math.sin(time * 0.003 + l.phase) * 0.3);
      ctx.fillStyle = `rgba(${l.color.r}, ${l.color.g}, ${l.color.b}, 0.55)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${l.color.r * 0.7}, ${l.color.g * 0.7}, ${l.color.b * 0.7}, 0.4)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-l.size * 0.8, 0);
      ctx.lineTo(l.size * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    });

    // Boar silhouettes
    boars.forEach(b => {
      b.x += b.speed;
      b.y += Math.sin(time * 0.01 + b.phase) * 0.3;
      if (b.x > width + 80) {
        b.x = -80 - Math.random() * 200;
        b.y = height * (0.55 + Math.random() * 0.3);
      }
      drawBoar(b);
    });

    // Fertile earth spatter
    spatter.forEach(s => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.01 + s.phase);
      ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
