/**
 * Mago, the Great Goddess — Cosmic Mother
 * Drifting purple nebula wisps and slow golden stars evoke the primordial goddess.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('mago-canvas');
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

  const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1, a: Math.random() * Math.PI * 2 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#b890c8'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.1) {
        const r = 60 + i * 45 + Math.sin(a * 3 + t * 0.01 + i) * 20;
        const x = width * 0.5 + Math.cos(a + t * 0.0005 * (i % 2 === 0 ? 1 : -1)) * r;
        const y = height * 0.5 + Math.sin(a + t * 0.0005 * (i % 2 === 0 ? 1 : -1)) * r * 0.55;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#e8d5a8';
    for (const s of stars) {
      const a = 0.4 + 0.6 * Math.sin(t * 0.02 + s.a);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
