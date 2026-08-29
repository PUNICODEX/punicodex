// Tangaroa — Māori god of ocean, sea creatures, fishing; fish schools, waves, hooks
(function() {
  'use strict';

  const canvas = document.getElementById('tangaroa-canvas');
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

  const P = readColor('data-primary', '#008B8B');
  const S = readColor('data-secondary', '#1E90FF');

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

  const schools = [];
  for (let i = 0; i < 6; i++) {
    schools.push({
      x: -100 - Math.random() * 400,
      y: height * (0.2 + Math.random() * 0.6),
      speed: 0.8 + Math.random() * 0.8,
      count: 8 + Math.floor(Math.random() * 8),
      size: 6 + Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2
    });
  }

  const waves = [];
  for (let i = 0; i < 5; i++) {
    waves.push({
      y: 0.6 + i * 0.09,
      amplitude: 20 + Math.random() * 25,
      frequency: 0.002 + Math.random() * 0.003,
      speed: 0.002 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.1 - i * 0.015
    });
  }

  const bubbles = [];
  for (let i = 0; i < 60; i++) {
    bubbles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.5 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 3,
      alpha: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2
    });
  }

  const hooks = [];
  for (let i = 0; i < 5; i++) {
    hooks.push({
      x: 0.1 + (i / 4) * 0.8,
      y: 0.1 + Math.random() * 0.2,
      size: 20 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.12 + Math.random() * 0.1
    });
  }

  function drawFish(x, y, size, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 10, size / 10);
    ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHook(h) {
    ctx.save();
    ctx.translate(h.x * width, h.y * height);
    ctx.rotate(Math.sin(time * 0.001 + h.phase) * 0.1);
    ctx.strokeStyle = `rgba(${S.r + 60}, ${S.g + 40}, ${S.b + 20}, ${h.opacity})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, h.size * 0.3, h.size * 0.3, Math.PI, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h.size * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.08}, ${P.g * 0.15}, ${P.b * 0.2}, 0.92)`);
    bg.addColorStop(1, `rgba(${S.r * 0.08}, ${S.g * 0.15}, ${S.b * 0.25}, 0.97)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Ocean waves
    waves.forEach(w => {
      ctx.beginPath();
      const baseY = height * w.y;
      for (let px = 0; px <= width; px += 8) {
        const y = baseY + Math.sin(px * w.frequency + time * w.speed + w.phase) * w.amplitude;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${Math.max(0.03, w.alpha)})`;
      ctx.fill();
    });

    // Fish hooks drifting
    hooks.forEach(h => drawHook(h));

    // Schools of fish
    schools.forEach(s => {
      s.x += s.speed;
      if (s.x > width + 150) {
        s.x = -150 - Math.random() * 400;
        s.y = height * (0.2 + Math.random() * 0.6);
      }
      for (let j = 0; j < s.count; j++) {
        const fx = s.x - j * s.size * 1.8;
        const fy = s.y + Math.sin(time * 0.02 + s.phase + j * 0.5) * 10;
        drawFish(fx, fy, s.size, s.opacity);
      }
    });

    // Bubbles
    bubbles.forEach(b => {
      b.y -= b.vy;
      b.x += b.vx;
      if (b.y < -10) {
        b.y = height + 10;
        b.x = Math.random() * width;
      }
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.02 + b.phase);
      ctx.strokeStyle = `rgba(${S.r + 40}, ${S.g + 60}, ${S.b + 80}, ${b.alpha * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
