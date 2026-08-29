// Simargl — Winged Guardian, Plant Life
(function () {
  'use strict';

  const canvas = document.getElementById('simargl-canvas');
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
  const seeds = [];
  for (let i = 0; i < 40; i++) seeds.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random(), a: Math.random() * Math.PI * 2 });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a1810');
    g.addColorStop(1, '#0a0906');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#c9a85a';
    ctx.lineWidth = 1.5;
    const cx = width * 0.5, cy = height * 0.35;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const a = (i / 30) * Math.PI;
        const r = 80 + i * 3;
        const x = cx + side * r * Math.cos(a);
        const y = cy + r * 0.4 * Math.sin(a) + Math.sin(t * 0.02 + i * 0.2) * 5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#d4c08a';
    for (const s of seeds) {
      const x = (s.x + Math.sin(s.a + t * 0.001) * 0.02) % 1 * width;
      const y = (s.y + t * 0.0005) % 1 * height;
      ctx.beginPath();
      ctx.ellipse(x, y, s.s, s.s * 0.4, s.a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
