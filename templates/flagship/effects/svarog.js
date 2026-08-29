// Svarog — Sky, Fire, Smithing
(function () {
  'use strict';

  const canvas = document.getElementById('svarog-canvas');
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
  const sparks = [];
  for (let i = 0; i < 50; i++) sparks.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2, life: Math.random() });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.6);
    g.addColorStop(0, '#2a1a10');
    g.addColorStop(1, '#0a0604');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#c4703a';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.55, Math.min(width, height) * 0.18 + Math.sin(t * 0.05) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffaf4d';
    for (const s of sparks) {
      const x = s.x * width;
      const y = (s.y - t * 0.001 * s.life) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
