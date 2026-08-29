/**
 * Jowangshin, the Kitchen King Spirit — Hearth Embers
 * Warm embers drift upward from a hidden hearth, with occasional flame tongues.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('jowangshin-canvas');
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

  const embers = []; for (let i = 0; i < 70; i++) embers.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2, speed: 0.3 + Math.random() * 0.5, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.7;
    for (const e of embers) {
      const y = (e.y - t * e.speed * 0.0005) % 1; if (y < 0) y += 1;
      const x = e.x * width + Math.sin(t * 0.001 + e.life * 5) * 10;
      const a = 0.4 + 0.6 * Math.sin(t * 0.05 + e.life * 10);
      ctx.globalAlpha = a; ctx.fillStyle = '#ff9e5e';
      ctx.beginPath(); ctx.arc(x, y * height, e.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
