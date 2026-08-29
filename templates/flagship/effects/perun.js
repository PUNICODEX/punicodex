// Perun — Thunder, Lightning, Oak
(function () {
  'use strict';

  const canvas = document.getElementById('perun-canvas');
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
  const rain = [];
  for (let i = 0; i < 100; i++) rain.push({ x: Math.random(), y: Math.random(), len: 10 + Math.random() * 20 });
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a2028');
    g.addColorStop(1, '#0a0c10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#8aa0b0';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    for (const r of rain) {
      const x = (r.x + t * 0.0002) % 1 * width;
      const y = (r.y + t * 0.002) % 1 * height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + r.len);
      ctx.stroke();
    }
    if (Math.random() > 0.96) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#e8e8ff';
      ctx.lineWidth = 2;
      let x = width * (0.3 + Math.random() * 0.4);
      let y = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < height * 0.5) {
        x += (Math.random() - 0.5) * 80;
        y += 30 + Math.random() * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#0f140f';
    ctx.fillRect(width * 0.45, height * 0.45, width * 0.1, height * 0.55);
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.45, width * 0.12, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
