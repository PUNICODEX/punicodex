// Poliahu — Snow goddess of Mauna Kea; falling snow, mountain ridges, ice mist
(function() {
  'use strict';

  const canvas = document.getElementById('poliahu-canvas');
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

  const P = readColor('data-primary', '#87CEEB');
  const S = readColor('data-secondary', '#FFFFFF');

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

  const snowflakes = [];
  for (let i = 0; i < 100; i++) {
    snowflakes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.4 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.4,
      size: 1 + Math.random() * 3,
      alpha: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2
    });
  }

  const peaks = [];
  for (let i = 0; i < 5; i++) {
    peaks.push({
      x: 0.05 + (i / 4) * 0.9,
      y: 0.72 + Math.random() * 0.08,
      width: 0.18 + Math.random() * 0.12,
      height: 80 + Math.random() * 120,
      alpha: 0.12 + Math.random() * 0.1
    });
  }

  const mist = [];
  for (let i = 0; i < 8; i++) {
    mist.push({
      x: Math.random() * width,
      y: height * 0.5 + Math.random() * height * 0.4,
      r: 60 + Math.random() * 120,
      vx: 0.1 + Math.random() * 0.2,
      alpha: 0.05 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawSnowflake(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, s.size, 0, Math.PI * 2);
    ctx.fill();
    if (s.size > 2) {
      ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * 0.6})`;
      ctx.lineWidth = 0.5;
      for (let a = 0; a < 6; a++) {
        ctx.beginPath();
        ctx.rotate(Math.PI / 3);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, s.size * 1.6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.15}, ${P.g * 0.2}, ${P.b * 0.25}, 0.92)`);
    bg.addColorStop(1, `rgba(${S.r * 0.2}, ${S.g * 0.22}, ${S.b * 0.24}, 0.96)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Mountain peaks
    peaks.forEach(p => {
      const cx = p.x * width;
      const baseY = p.y * height;
      ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx - p.width * width * 0.5, baseY);
      ctx.lineTo(cx, baseY - p.height);
      ctx.lineTo(cx + p.width * width * 0.5, baseY);
      ctx.closePath();
      ctx.fill();
    });

    // Ice mist
    mist.forEach(m => {
      m.x += m.vx;
      if (m.x > width + m.r) m.x = -m.r;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.005 + m.phase);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${m.alpha * pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Snow
    snowflakes.forEach(s => {
      s.y += s.vy;
      s.x += s.vx + Math.sin(time * 0.01 + s.phase) * 0.2;
      if (s.y > height + 10) {
        s.y = -10;
        s.x = Math.random() * width;
      }
      drawSnowflake(s);
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
