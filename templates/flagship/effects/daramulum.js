/**
 * DARAMULUM — Sky Bora
 * Spiral bora rings and star tracks for the one-legged sky hero.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('daramulum-canvas');
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
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#b8a070';
    ctx.lineWidth = 1.5;
    const cx = width * 0.5, cy = height * 0.45;
    for (let r = 60; r < Math.min(width, height) * 0.45; r += 70) {
      ctx.globalAlpha = 0.15 - r / (Math.min(width, height) * 3);
      ctx.beginPath();
      ctx.arc(cx, cy, r + Math.sin(t * 0.01 + r * 0.01) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.002;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * width * 0.4, cy + Math.sin(a) * height * 0.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
