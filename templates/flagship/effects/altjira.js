/**
 * ALTJIRA — Dreaming Sky
 * Slow-wheeling stars and soft auroral bands for the Arrernte sky ancestor.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('altjira-canvas');
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
  for (let i = 0; i < 120; i++) {
    stars.push({ x: Math.random(), y: Math.random(), r: 0.3 + Math.random() * 1.2, blink: Math.random() * Math.PI * 2 });
  }
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#0a0a14');
    g.addColorStop(1, '#1a1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    for (const s of stars) {
      const a = 0.4 + 0.6 * Math.sin(t * 0.02 + s.blink);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8d5a8';
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.15;
    const band = ctx.createLinearGradient(0, height * 0.3, width, height * 0.7);
    band.addColorStop(0, 'transparent');
    band.addColorStop(0.5, '#6b4c7a');
    band.addColorStop(1, 'transparent');
    ctx.fillStyle = band;
    ctx.fillRect(0, height * 0.2, width, height * 0.6);
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
