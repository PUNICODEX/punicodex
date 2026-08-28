/**
 * BAIAME — Sky Father
 * Warm celestial radiance and slow drifting clouds for the creator.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('baiame-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
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

  const rays = [];
  for (let i = 0; i < 36; i++) rays.push({ a: (i / 36) * Math.PI * 2, len: 160 + Math.random() * 200, speed: 0.001 + Math.random() * 0.002 });
  const clouds = [{ x: 0.2, y: 0.3, s: 1 }, { x: 0.7, y: 0.5, s: 1.3 }];
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width * 0.75, height * 0.25, 0, width * 0.75, height * 0.25, width * 0.6);
    g.addColorStop(0, '#3a2a1a');
    g.addColorStop(1, '#0a0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width * 0.75, height * 0.25);
    for (const r of rays) {
      const len = r.len + Math.sin(t * r.speed) * 40;
      ctx.strokeStyle = '#d4a85a';
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(r.a) * len, Math.sin(r.a) * len);
      ctx.stroke();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#c9b8a0';
    for (const c of clouds) {
      const cx = ((c.x + t * 0.00005) % 1.2 - 0.1) * width;
      ctx.beginPath();
      ctx.arc(cx, c.y * height, 80 * c.s, 0, Math.PI * 2);
      ctx.arc(cx + 60 * c.s, c.y * height + 20, 60 * c.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
