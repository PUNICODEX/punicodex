/**
 * BUNJIL — Eaglehawk Wings
 * Feathered wing forms and thermal updrafts for the Kulin creator.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bunjil-canvas');
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

  const feathers = [];
  for (let i = 0; i < 40; i++) feathers.push({ x: Math.random(), y: Math.random(), r: 20 + Math.random() * 40, a: Math.random() * Math.PI * 2, drift: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d1015';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#8b6f47';
    ctx.lineWidth = 1.5;
    for (const f of feathers) {
      const x = (f.x + Math.sin(t * 0.0005 + f.drift) * 0.05) * width;
      const y = (f.y + t * 0.0002 * (0.5 + f.drift)) % 1.1 * height - 50;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(f.a + t * 0.001);
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r, f.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
