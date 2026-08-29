// Veles — Cattle, Commerce, Underworld
(function () {
  'use strict';

  const canvas = document.getElementById('veles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width, height;
  function resize() {
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

  let t = 0;
  const herd = [];
  for (let i = 0; i < 18; i++) herd.push({ x: Math.random(), y: 0.5 + Math.random() * 0.4, s: 0.5 + Math.random() * 0.5, speed: 0.0002 + Math.random() * 0.0003 });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a2014');
    g.addColorStop(1, '#0a0c08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#6a5a40';
    ctx.lineWidth = 2;
    for (const h of herd) {
      const x = ((h.x + t * h.speed) % 1.2 - 0.1) * width;
      const y = h.y * height;
      ctx.strokeRect(x, y, 40 * h.s, 22 * h.s);
      ctx.beginPath();
      ctx.arc(x + 30 * h.s, y + 8 * h.s, 7 * h.s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#4a5a3a';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height, width * 0.4, height * 0.3, 0, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
