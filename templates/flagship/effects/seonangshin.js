/**
 * Seonangshin, the Village Guardian — Village Boundary
 * A ring of fireflies guards a threshold marked by sacred rope and standing stones.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('seonangshin-canvas');
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

  const flies = []; for (let i = 0; i < 60; i++) flies.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 1.5, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#d8e88a';
    for (const f of flies) {
      const x = (f.x + t * f.dx * 0.0003) % 1; const y = (f.y + t * f.dy * 0.0003) % 1;
      const a = 0.3 + 0.7 * Math.sin(t * 0.05 + f.life * 10);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x * width, y * height, f.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.12; ctx.strokeStyle = '#a8c68a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(width * 0.5, height * 0.5, Math.min(width, height) * 0.32 + Math.sin(t * 0.01) * 10, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
