// Radagast — Hospitality, Animals
(function () {
  'use strict';

  const canvas = document.getElementById('radagast-canvas');
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
  const banners = [];
  for (let i = 0; i < 6; i++) banners.push({ x: 0.15 + i * 0.14, y: 0.3 + Math.random() * 0.2, a: (Math.random() - 0.5) * 0.2 });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1f1a14');
    g.addColorStop(1, '#0a0908');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 2;
    for (const b of banners) {
      const x = b.x * width;
      const y = b.y * height;
      const wave = Math.sin(t * 0.02 + b.x * 4) * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 180);
      ctx.stroke();
      ctx.fillStyle = '#6a5a40';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 60, y + 20 + wave);
      ctx.lineTo(x + 50, y + 50 + wave * 0.8);
      ctx.lineTo(x - 10, y + 30);
      ctx.fill();
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#c4a06a';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = height * 0.7 + Math.random() * height * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
