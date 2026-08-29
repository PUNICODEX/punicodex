/**
 * GULA — Healing, Medicine
 * Bespoke hero canvas for the mesopotamian flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('gula-canvas');
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
  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5, s: 0.2 + Math.random() * 0.6 });
  }
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#0a0a12');
    g.addColorStop(1, '#151520');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    for (const p of particles) {
      const y = (p.y + t * 0.0001 * p.s) % 1;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 0.02 + p.x * 10);
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(p.x * width, y * height, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = height * (0.2 + i * 0.15 + Math.sin(t * 0.005 + i) * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
