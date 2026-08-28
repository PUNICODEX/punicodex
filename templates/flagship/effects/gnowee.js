/**
 * GNOWEE — Torch Sun
 * A searching torch-beam and ember particles for the Wurundjeri sun woman.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('gnowee-canvas');
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

  const sparks = [];
  for (let i = 0; i < 60; i++) sparks.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createRadialGradient(width * 0.25, height * 0.5, 0, width * 0.25, height * 0.5, width * 0.7);
    g.addColorStop(0, '#3a2010');
    g.addColorStop(1, '#0a0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ff9d4d';
    const beam = ctx.createLinearGradient(width * 0.25, height * 0.5, width * 0.85, height * 0.5 + Math.sin(t * 0.01) * 60);
    beam.addColorStop(0, '#ff9d4d');
    beam.addColorStop(1, 'transparent');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.48);
    ctx.lineTo(width * 0.9, height * 0.35 + Math.sin(t * 0.01) * 40);
    ctx.lineTo(width * 0.9, height * 0.65 + Math.sin(t * 0.01) * 40);
    ctx.lineTo(width * 0.25, height * 0.52);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    for (const s of sparks) {
      const x = (s.x + t * 0.0002) % 1 * width;
      const y = (s.y - t * 0.0003 * s.life) % 1 * height;
      ctx.fillStyle = '#ffb866';
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
