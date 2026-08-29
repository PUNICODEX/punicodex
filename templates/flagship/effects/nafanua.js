// Nafanua — Samoan war prophet; rising from earth, war clubs, prophecy stars
(function() {
  'use strict';

  const canvas = document.getElementById('nafanua-canvas');
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

  const P = readColor('data-primary', '#8B0000');
  const S = readColor('data-secondary', '#DAA520');

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

  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.55,
      size: 0.8 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  const clubs = [];
  for (let i = 0; i < 6; i++) {
    clubs.push({
      x: 0.1 + (i / 5) * 0.8 + (Math.random() - 0.5) * 0.04,
      y: 0.65 + Math.random() * 0.25,
      size: 30 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 0.6
    });
  }

  const embers = [];
  for (let i = 0; i < 50; i++) {
    embers.push({
      x: Math.random() * width,
      y: Math.random() * height + height * 0.4,
      vy: 0.3 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2.5,
      alpha: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawClub(c) {
    ctx.save();
    ctx.translate(c.x * width, c.y * height);
    ctx.rotate(c.tilt + Math.sin(time * 0.001 + c.phase) * 0.05);
    ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`;
    ctx.beginPath();
    ctx.ellipse(0, -c.size * 0.3, c.size * 0.12, c.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.45)`;
    ctx.beginPath();
    ctx.ellipse(0, c.size * 0.25, c.size * 0.22, c.size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.5)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -c.size * 0.6);
    ctx.lineTo(0, c.size * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.08}, ${P.g * 0.05}, ${P.b * 0.1}, 0.92)`);
    bg.addColorStop(1, `rgba(${P.r * 0.18}, ${P.g * 0.1}, ${P.b * 0.1}, 0.97)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Prophecy stars
    stars.forEach(s => {
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.02 + s.phase);
      ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rising earth mists / prophecy aura
    const aura = ctx.createRadialGradient(width * 0.5, height * 0.7, 0, width * 0.5, height * 0.7, width * 0.6);
    aura.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    // War clubs (fa'au)
    clubs.forEach(c => drawClub(c));

    // Embers of war
    embers.forEach(e => {
      e.y -= e.vy;
      e.x += e.vx;
      if (e.y < -10) {
        e.y = height + 10;
        e.x = Math.random() * width;
      }
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.05 + e.phase);
      ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${e.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
