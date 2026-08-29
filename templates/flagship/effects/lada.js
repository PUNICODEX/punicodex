// Lada — Love, Beauty, Spring
(function () {
  'use strict';

  const canvas = document.getElementById('lada-canvas');
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
  const petals = [];
  for (let i = 0; i < 50; i++) petals.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 3, a: Math.random() * Math.PI * 2, color: ['#e8c0c8', '#c8e8c0', '#e8e0a0'][Math.floor(Math.random() * 3)] });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a2016');
    g.addColorStop(1, '#0a0e0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#6a9a6a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 30) {
        const y = height * (0.7 + i * 0.06) + Math.sin((x + t * 0.5 + i * 100) * 0.01) * 20;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    for (const p of petals) {
      const x = (p.x + Math.sin(p.a + t * 0.001) * 0.02) % 1 * width;
      const y = (p.y + t * 0.0003) % 1 * height;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(x, y, p.r, p.r * 0.6, p.a + t * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
