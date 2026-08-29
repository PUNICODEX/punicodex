// Stribog — Winds, Storms
(function () {
  'use strict';

  const canvas = document.getElementById('stribog-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width, height;
  function resize() {
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

  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#1a2028');
    g.addColorStop(1, '#0a0c12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#8aa0b0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.globalAlpha = 0.1 + (i % 3) * 0.05;
      ctx.beginPath();
      const y = height * (0.2 + i * 0.06);
      for (let x = 0; x <= width; x += 20) {
        const yoff = Math.sin((x + t * (1 + i * 0.2)) * 0.01) * 20;
        if (x === 0) ctx.moveTo(x, y + yoff); else ctx.lineTo(x, y + yoff);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#c0d0e0';
    for (let i = 0; i < 8; i++) {
      const x = ((i * 0.13 + t * 0.0002) % 1.2 - 0.1) * width;
      const y = height * (0.15 + i * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, 30 + i * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
