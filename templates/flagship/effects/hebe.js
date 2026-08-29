/**
 * HEBE — Youth, Cupbearer
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hebe-canvas');
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


  // Youthful nectar, rising bubbles and petals
  const GOLD = { r: 212, g: 175, b: 55 };
  const PINK = { r: 255, g: 182, b: 193 };
  const WHITE = { r: 255, g: 250, b: 245 };
  let frame = 0;

  const bubbles = [];
  for (let i = 0; i < 60; i++) {
    bubbles.push({
      x: Math.random() * width,
      y: Math.random() * height + height,
      r: 2 + Math.random() * 5,
      vy: 0.5 + Math.random() * 1.2,
      sway: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? GOLD : (Math.random() > 0.7 ? PINK : WHITE),
    });
  }

  const petals = [];
  for (let i = 0; i < 35; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: 4 + Math.random() * 6,
      vy: 0.4 + Math.random() * 0.8,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      color: Math.random() > 0.5 ? PINK : WHITE,
    });
  }

  function drawChalice() {
    const cx = width * 0.5;
    const cy = height * 0.62;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 60);
    ctx.lineTo(cx - 20, cy);
    ctx.lineTo(cx - 50, cy - 40);
    ctx.lineTo(cx + 50, cy - 40);
    ctx.lineTo(cx + 20, cy);
    ctx.lineTo(cx + 30, cy + 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + 60, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.8);
    bg.addColorStop(0, '#16120c');
    bg.addColorStop(0.6, '#0f0c08');
    bg.addColorStop(1, '#080604');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawChalice();

    for (const b of bubbles) {
      b.y -= b.vy;
      b.x += Math.sin(frame * 0.01 + b.phase) * 0.3;
      if (b.y < -10) { b.y = height + 10; b.x = Math.random() * width; }
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + b.color.r + ',' + b.color.g + ',' + b.color.b + ',0.12)';
      ctx.fill();
    }

    for (const p of petals) {
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.x += Math.sin(frame * 0.008 + p.rot) * 0.3;
      if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',1)';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());