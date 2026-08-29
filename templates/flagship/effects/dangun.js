/**
 * Dangun, the Sandalwood Prince — Sandalwood and Mountain Mist
 * Drifting mist around a sacred peak with falling sandalwood leaves.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('dangun-canvas');
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

  const leaves = []; for (let i = 0; i < 45; i++) leaves.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 3, dx: (Math.random() - 0.5) * 0.2, dy: 0.2 + Math.random() * 0.3 });
  const mists = []; for (let i = 0; i < 6; i++) mists.push({ x: Math.random(), y: 0.5 + Math.random() * 0.3, s: 0.8 + Math.random() * 0.6 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#8c9fa8';
    for (const m of mists) {
      const x = ((m.x + t * 0.00002) % 1.4 - 0.2) * width;
      ctx.beginPath(); ctx.ellipse(x, m.y * height, 120 * m.s, 35 * m.s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#c2a386';
    for (const l of leaves) {
      const x = (l.x + t * l.dx * 0.01) % 1 * width; const y = (l.y + t * l.dy * 0.01) % 1 * height;
      ctx.beginPath(); ctx.ellipse(x, y, l.r * 1.5, l.r, Math.random(), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
