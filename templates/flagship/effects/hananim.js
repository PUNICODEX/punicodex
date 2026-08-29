/**
 * Hwanin, Lord of Heaven — Celestial Mandate
 * Slow golden rays and drifting clouds of heaven around a hidden seal.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hananim-canvas');
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

  const rays = []; for (let i = 0; i < 24; i++) rays.push({ a: (i / 24) * Math.PI * 2, len: 140 + Math.random() * 220, speed: 0.0005 + Math.random() * 0.001 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.2;
    const cx = width * 0.5, cy = height * 0.35;
    for (const r of rays) {
      const len = r.len + Math.sin(t * r.speed) * 30;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.a + t * 0.0002) * len, cy + Math.sin(r.a + t * 0.0002) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#87ceeb';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.21 + t * 0.00003) % 1.2 - 0.1) * width;
      const y = height * (0.55 + Math.sin(i + t * 0.001) * 0.05);
      ctx.beginPath(); ctx.ellipse(x, y, 90, 30, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
