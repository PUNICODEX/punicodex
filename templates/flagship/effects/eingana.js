/**
 * EINGANA — Mother Snake
 * Coiling serpentine curves and earth pigments for the Jawoyn creator.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('eingana-canvas');
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

  const points = [];
  for (let i = 0; i < 80; i++) points.push(i);
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#120d14';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#c97b5a';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x = width * 0.1 + (p / points.length) * width * 0.8;
      const y = height * 0.5 + Math.sin(p * 0.2 + t * 0.015) * height * 0.18 + Math.sin(p * 0.05 + t * 0.005) * height * 0.1;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
