// Tagaloa — Samoan creator of ocean; deep waves, flying fish, creator's shell
(function() {
  'use strict';

  const canvas = document.getElementById('tagaloa-canvas');
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

  const P = readColor('data-primary', '#1E90FF');
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

  const waves = [];
  for (let i = 0; i < 6; i++) {
    waves.push({
      y: 0.55 + i * 0.08,
      amplitude: 15 + Math.random() * 20,
      frequency: 0.003 + Math.random() * 0.004,
      speed: 0.002 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.12 - i * 0.015
    });
  }

  const fish = [];
  for (let i = 0; i < 12; i++) {
    fish.push({
      x: -50 - Math.random() * 300,
      y: height * (0.2 + Math.random() * 0.6),
      speed: 1 + Math.random() * 1.2,
      size: 8 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.2 + Math.random() * 0.2
    });
  }

  const bubbles = [];
  for (let i = 0; i < 50; i++) {
    bubbles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: 0.4 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 3,
      alpha: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2
    });
  }

  const shell = { x: 0.5, y: 0.35, size: 50 };

  function drawFish(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.size / 10, f.size / 10);
    ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${f.opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-22, -8);
    ctx.lineTo(-22, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.08}, ${P.g * 0.15}, ${P.b * 0.25}, 0.92)`);
    bg.addColorStop(1, `rgba(${P.r * 0.18}, ${P.g * 0.22}, ${P.b * 0.3}, 0.97)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Light caustics
    const caustic = ctx.createRadialGradient(width * 0.5, height * 0.2, 0, width * 0.5, height * 0.2, width * 0.7);
    caustic.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.08)`);
    caustic.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = caustic;
    ctx.fillRect(0, 0, width, height);

    // Creator shell
    const sx = shell.x * width;
    const sy = shell.y * height;
    const pulse = 0.9 + 0.1 * Math.sin(time * 0.002);
    ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, shell.size * pulse, Math.PI, 0);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, shell.size * pulse, Math.PI + (i / 5) * Math.PI, Math.PI + ((i + 1) / 5) * Math.PI);
      ctx.closePath();
      ctx.stroke();
    }

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

    // Flying fish
    fish.forEach(f => {
      f.x += f.speed;
      f.y += Math.sin(time * 0.01 + f.phase) * 0.5;
      if (f.x > width + 60) {
        f.x = -60 - Math.random() * 300;
        f.y = height * (0.2 + Math.random() * 0.6);
      }
      drawFish(f);
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
      ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${b.alpha * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.stroke();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
