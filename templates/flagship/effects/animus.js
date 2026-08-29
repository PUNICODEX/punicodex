/**
 * ANIMUS — Mind, Spirit, Courage
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('animus-canvas');
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


  // Drifting soul-wisps and breath rings
  const SOUL = { r: 176, g: 196, b: 222 };
  const MIST = { r: 147, g: 112, b: 219 };
  const GOLD = { r: 212, g: 175, b: 55 };
  let frame = 0;

  const wisps = [];
  for (let i = 0; i < 45; i++) {
    wisps.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.35 + 0.1,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.6 ? SOUL : MIST,
    });
  }

  const rings = [];
  for (let i = 0; i < 6; i++) {
    rings.push({
      x: Math.random(),
      y: Math.random(),
      r: 30 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.01,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.8);
    bg.addColorStop(0, '#10121a');
    bg.addColorStop(0.5, '#0c0d14');
    bg.addColorStop(1, '#08090e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const r of rings) {
      r.phase += r.speed;
      ctx.globalAlpha = 0.04 + 0.03 * Math.sin(r.phase);
      ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x * width, r.y * height, r.r * (1 + 0.1 * Math.sin(r.phase * 2)), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const w of wisps) {
      w.x += w.vx + Math.sin(frame * 0.01 + w.phase) * 0.2;
      w.y += w.vy;
      if (w.y < -10) { w.y = height + 10; w.x = Math.random() * width; }
      const a = w.alpha * (0.6 + 0.4 * Math.sin(frame * 0.03 + w.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(' + w.color.r + ',' + w.color.g + ',' + w.color.b + ',1)';
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());