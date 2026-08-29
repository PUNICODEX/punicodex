/**
 * MOIRAI — Fate, Destiny, Thread
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('moirai-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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


  // Spinning threads, shears and the cosmic loom
  const GOLD = { r: 212, g: 175, b: 55 };
  const SILVER = { r: 192, g: 192, b: 192 };
  const PURPLE = { r: 147, g: 112, b: 219 };
  let frame = 0;

  const spindles = [];
  for (let i = 0; i < 3; i++) {
    spindles.push({
      x: 0.25 + (i / 2) * 0.5,
      y: 0.45,
      r: 35 + Math.random() * 10,
      angle: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.01,
      color: i === 0 ? PURPLE : (i === 1 ? SILVER : GOLD),
    });
  }

  const threads = [];
  for (let i = 0; i < 80; i++) {
    threads.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      len: 20 + Math.random() * 60,
      angle: Math.random() * Math.PI,
      alpha: Math.random() * 0.3 + 0.05,
      color: Math.random() > 0.6 ? GOLD : SILVER,
    });
  }

  function drawSpindle(s) {
    const cx = s.x * width;
    const cy = s.y * height;
    s.angle += s.speed;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.angle);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(' + s.color.r + ',' + s.color.g + ',' + s.color.b + ',0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s.r, 0, Math.PI * 2);
    ctx.stroke();
    // thread wound
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * s.r, Math.sin(a) * s.r);
      ctx.stroke();
    }
    ctx.restore();

    // vertical thread down
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = 'rgba(' + s.color.r + ',' + s.color.g + ',' + s.color.b + ',0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s.r);
    ctx.lineTo(cx + Math.sin(frame * 0.02 + s.x * 10) * 40, height);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width * 0.9);
    bg.addColorStop(0, '#120f1a');
    bg.addColorStop(0.6, '#0a0810');
    bg.addColorStop(1, '#050408');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const t of threads) {
      t.x += t.vx;
      t.y += t.vy;
      if (t.x < -t.len) t.x = width + t.len;
      if (t.x > width + t.len) t.x = -t.len;
      if (t.y < -t.len) t.y = height + t.len;
      if (t.y > height + t.len) t.y = -t.len;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle + frame * 0.002);
      ctx.globalAlpha = t.alpha;
      ctx.strokeStyle = 'rgba(' + t.color.r + ',' + t.color.g + ',' + t.color.b + ',0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-t.len / 2, 0);
      ctx.lineTo(t.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }

    for (const s of spindles) drawSpindle(s);
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());