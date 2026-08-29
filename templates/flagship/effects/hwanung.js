/**
 * Hwanung, the Heavenly Prince — Descent Through Mist
 * Celestial mist, drifting clouds, and a slow beam from above.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hwanung-canvas');
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

  const clouds = []; for (let i = 0; i < 8; i++) clouds.push({ x: Math.random(), y: Math.random() * 0.6, s: 0.7 + Math.random() * 0.8 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#9fb8d0';
    for (const c of clouds) {
      const x = ((c.x + t * 0.00002 * c.s) % 1.3 - 0.15) * width;
      ctx.beginPath(); ctx.ellipse(x, c.y * height, 130 * c.s, 45 * c.s, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.18;
    const g = ctx.createLinearGradient(width * 0.5, 0, width * 0.5, height * 0.5);
    g.addColorStop(0, '#e8ddaa'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(width * 0.48, 0); ctx.lineTo(width * 0.52, 0); ctx.lineTo(width * 0.6, height * 0.5); ctx.lineTo(width * 0.4, height * 0.5); ctx.fill();
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
