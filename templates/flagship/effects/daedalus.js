/**
 * DAIDALOS — Craftsman, Inventor, Wings
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('daedalus-canvas');
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


  // Wings, falling feathers, gears and labyrinth lines
  const BRONZE = { r: 205, g: 127, b: 50 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const WAX = { r: 255, g: 228, b: 181 };
  let frame = 0;

  const feathers = [];
  for (let i = 0; i < 55; i++) {
    feathers.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: 5 + Math.random() * 8,
      vy: 0.6 + Math.random() * 1.2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      sway: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.6 ? GOLD : (Math.random() > 0.5 ? BRONZE : WAX),
    });
  }

  const gears = [];
  for (let i = 0; i < 4; i++) {
    gears.push({
      x: Math.random(),
      y: Math.random() * 0.6 + 0.2,
      r: 30 + Math.random() * 40,
      teeth: 8 + Math.floor(Math.random() * 8),
      speed: (Math.random() > 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.01),
      phase: Math.random() * Math.PI * 2,
    });
  }

  function drawGear(g) {
    const cx = g.x * width;
    const cy = g.y * height;
    g.phase += g.speed;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(g.phase);
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = 'rgba(' + BRONZE.r + ',' + BRONZE.g + ',' + BRONZE.b + ',0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, g.r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < g.teeth; i++) {
      const a = (i / g.teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * g.r, Math.sin(a) * g.r);
      ctx.lineTo(Math.cos(a) * (g.r + 8), Math.sin(a) * (g.r + 8));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, g.r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawLabyrinth() {
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.5)';
    ctx.lineWidth = 1;
    const step = 60;
    const offset = (frame * 0.2) % step;
    for (let x = offset; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offset; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0a0c10');
    bg.addColorStop(1, '#15100a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawLabyrinth();
    for (const g of gears) drawGear(g);

    for (const f of feathers) {
      f.y += f.vy;
      f.rot += f.rotSpeed;
      f.x += Math.sin(frame * 0.01 + f.phase) * 0.4;
      if (f.y > height + 20) { f.y = -20; f.x = Math.random() * width; }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(' + f.color.r + ',' + f.color.g + ',' + f.color.b + ',1)';
      ctx.beginPath();
      ctx.moveTo(0, -f.size);
      ctx.quadraticCurveTo(f.size * 0.6, 0, 0, f.size);
      ctx.quadraticCurveTo(-f.size * 0.6, 0, 0, -f.size);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());