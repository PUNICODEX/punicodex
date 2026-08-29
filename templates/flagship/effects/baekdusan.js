/**
 * Baekdusan, the White-Head Mountain — Snow Peak
 * Gentle snowfall over a dark volcanic silhouette with a luminous summit.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('baekdusan-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const flakes = []; for (let i = 0; i < 100; i++) flakes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.5, speed: 0.2 + Math.random() * 0.5 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#5a6a75';
    ctx.beginPath(); ctx.moveTo(width * 0.2, height); ctx.lineTo(width * 0.5, height * 0.35); ctx.lineTo(width * 0.8, height); ctx.fill();
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#e8eef2';
    for (const f of flakes) {
      const y = (f.y + t * f.speed * 0.0005) % 1;
      let x = (f.x + Math.sin(t * 0.001 + f.y * 5) * 0.02) % 1; if (x < 0) x += 1;
      ctx.beginPath(); ctx.arc(x * width, y * height, f.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#d8e4ec';
    ctx.beginPath(); ctx.moveTo(width * 0.35, height * 0.52); ctx.lineTo(width * 0.5, height * 0.28); ctx.lineTo(width * 0.65, height * 0.52); ctx.fill();
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
