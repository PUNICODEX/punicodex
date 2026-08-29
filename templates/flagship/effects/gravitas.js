/**
 * GRAVITAS — Weight, Seriousness, Dignity
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('gravitas-canvas');
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


  // Marble columns, settling dust and solemn light
  const MARBLE = { r: 220, g: 220, b: 215 };
  const GOLD = { r: 180, g: 150, b: 90 };
  const SHADOW = { r: 60, g: 60, b: 65 };
  let frame = 0;

  const columns = [];
  for (let i = 0; i < 4; i++) {
    columns.push({
      x: 0.15 + (i / 3) * 0.7 + (Math.random() - 0.5) * 0.04,
      width: 40 + Math.random() * 20,
      heightFrac: 0.55 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const dust = [];
  for (let i = 0; i < 70; i++) {
    dust.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: Math.random() * 0.3 + 0.05,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.25 + 0.05,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function drawColumn(c) {
    const cx = c.x * width;
    const ch = c.heightFrac * height;
    const cw = c.width;
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.02 * Math.sin(frame * 0.003 + c.phase);
    const grad = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    grad.addColorStop(0, 'rgba(60,60,65,0.5)');
    grad.addColorStop(0.5, 'rgba(220,220,215,0.25)');
    grad.addColorStop(1, 'rgba(60,60,65,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - cw / 2, height - ch, cw, ch);
    // capital
    ctx.fillStyle = 'rgba(220,220,215,0.15)';
    ctx.fillRect(cx - cw * 0.7, height - ch - 10, cw * 1.4, 10);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#08080a');
    bg.addColorStop(1, '#111116');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const c of columns) drawColumn(c);

    for (const d of dust) {
      d.y += d.vy;
      if (d.y > height) d.y = -5;
      ctx.globalAlpha = d.alpha * (0.7 + 0.3 * Math.sin(frame * 0.02 + d.phase));
      ctx.fillStyle = 'rgba(' + MARBLE.r + ',' + MARBLE.g + ',' + MARBLE.b + ',1)';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // solemn spotlight from above
    const spot = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, width * 0.7);
    spot.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.08)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(frame * 0.005);
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());