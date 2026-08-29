/**
 * Yongwang, the Dragon King — Dragon King Waves
 * Layered translucent waves undulate beneath rising bubbles and dragon-scaled light.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('yongwang-canvas');
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

  const bubbles = []; for (let i = 0; i < 50; i++) bubbles.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2, speed: 0.2 + Math.random() * 0.4 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.18; ctx.strokeStyle = '#5fbcd3'; ctx.lineWidth = 2;
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = height * 0.55 + Math.sin((x + t * (0.6 + c * 0.15)) * 0.008) * height * 0.1 + (c - 2) * 14;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#a8e0f0';
    for (const b of bubbles) {
      let y = (b.y - t * b.speed * 0.0005) % 1; if (y < 0) y += 1;
      const x = b.x * width + Math.sin(t * 0.001 + b.y * 10) * 15;
      ctx.beginPath(); ctx.arc(x, y * height, b.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
