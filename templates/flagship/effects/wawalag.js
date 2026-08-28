/**
 * WAWALAG — Monsoon Sisters
 * Twin water spirals and rain bursts for the Yolŋu sisters.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('wawalag-canvas');
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

  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a1014';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#5a8a9a';
    ctx.lineWidth = 2;
    for (let s = 0; s < 2; s++) {
      const cx = width * (0.35 + s * 0.3);
      const cy = height * 0.5;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (let i = 0; i < 80; i++) {
        const a = i * 0.2 + t * 0.01 * (s === 0 ? 1 : -1);
        const r = 30 + i * 2.5;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#8ab0c0';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = (t * 2 + i * 30) % height;
      ctx.fillRect(x, y, 1, 12);
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
