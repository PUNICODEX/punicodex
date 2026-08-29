// Belobog — Light, Good, Fortune
(function () {
  'use strict';

  const canvas = document.getElementById('belobog-canvas');
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
  const motes = [];
  for (let i = 0; i < 80; i++) motes.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random(), a: Math.random() * Math.PI * 2 });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.6);
    g.addColorStop(0, '#2a2520');
    g.addColorStop(1, '#0a0a08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    const cx = width * 0.5, cy = height * 0.45;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#d4b88a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t * 0.003;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * width * 0.4, cy + Math.sin(a) * height * 0.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#e8d5a8';
    for (const m of motes) {
      const x = (m.x + Math.cos(m.a + t * 0.0005) * 0.03) % 1 * width;
      const y = (m.y + Math.sin(m.a + t * 0.0005) * 0.03) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
