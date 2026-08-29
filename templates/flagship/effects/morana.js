// Morana — Winter, Death
(function () {
  'use strict';

  const canvas = document.getElementById('morana-canvas');
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
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a2224');
    g.addColorStop(1, '#0a0e10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#c0d4d8';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = (t * 0.8 + i * 12) % height;
      ctx.fillRect(x, y, 2, 6);
    }
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#6a8a8a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = width * (0.2 + i * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + Math.sin(t * 0.01 + i) * 30, height * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
