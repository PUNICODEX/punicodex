// Lono — Agriculture, peace, rain; falling rain, growing shoots, peace banners
(function() {
  'use strict';

  const canvas = document.getElementById('lono-canvas');
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

  const P = readColor('data-primary', '#4682B4');
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

  const rain = [];
  for (let i = 0; i < 120; i++) {
    rain.push({
      x: Math.random(),
      y: Math.random(),
      v: 0.008 + Math.random() * 0.008,
      len: 12 + Math.random() * 16,
      alpha: 0.1 + Math.random() * 0.25
    });
  }

  const shoots = [];
  for (let i = 0; i < 16; i++) {
    shoots.push({
      x: 0.05 + (i / 15) * 0.9 + (Math.random() - 0.5) * 0.04,
      y: 0.88 + Math.random() * 0.08,
      height: 20 + Math.random() * 50,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? S : { r: S.r + 20, g: S.g + 30, b: S.b + 10 }
    });
  }

  const banners = [];
  for (let i = 0; i < 4; i++) {
    banners.push({
      x: 0.15 + (i / 3) * 0.7,
      y: 0.12 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2
    });
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.12}, ${P.g * 0.18}, ${P.b * 0.25}, 0.9)`);
    bg.addColorStop(1, `rgba(${S.r * 0.08}, ${S.g * 0.2}, ${S.b * 0.1}, 0.95)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    const time = frame;

    // Rain
    ctx.strokeStyle = `rgba(${P.r + 40}, ${P.g + 50}, ${P.b + 60}, 0.35)`;
    ctx.lineWidth = 1;
    rain.forEach(r => {
      r.y += r.v;
      if (r.y > 1) { r.y = 0; r.x = Math.random(); }
      const x = r.x * width;
      const y = r.y * height;
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + r.len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Peace banners
    banners.forEach(b => {
      const bx = b.x * width;
      const by = b.y * height;
      const sway = Math.sin(time * 0.002 + b.phase) * 10;
      ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 40);
      ctx.lineTo(bx, by + 60);
      ctx.stroke();
      ctx.fillStyle = `rgba(${S.r + 40}, ${S.g + 50}, ${S.b + 20}, 0.25)`;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 50 + sway, by + 8);
      ctx.lineTo(bx + 50 + sway, by + 32);
      ctx.lineTo(bx, by + 40);
      ctx.closePath();
      ctx.fill();
    });

    // Growing shoots
    shoots.forEach(s => {
      const x = s.x * width;
      const baseY = s.y * height;
      const growth = 0.7 + 0.3 * Math.sin(time * 0.001 + s.phase);
      const h = s.height * growth;
      ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.7)`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + Math.sin(time * 0.002 + s.phase) * 8, baseY - h * 0.5, x, baseY - h);
      ctx.stroke();
      ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(x, baseY - h, 4 * growth, 7 * growth, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
