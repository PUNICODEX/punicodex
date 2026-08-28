/**
 * TJINIMIN — Bat Ancestor
 * Star map and wing silhouettes for the Murrinh-Patha ancestor.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('tjinimin-canvas');
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

  const stars = [];
  for (let i = 0; i < 80; i++) stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#090a10';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#d4c8a8';
    ctx.globalAlpha = 0.5;
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 1;
    const cx = width * 0.5 + Math.sin(t * 0.003) * 100;
    const cy = height * 0.35 + Math.cos(t * 0.004) * 40;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI;
        const x = cx + side * (50 + i * 6) * Math.cos(a);
        const y = cy + (20 + i * 3) * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
