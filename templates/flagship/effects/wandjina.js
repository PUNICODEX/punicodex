/**
 * WANDJINA — Storm Spirits
 * Rain sheets and lightning hints for the Kimberley cloud spirits.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('wandjina-canvas');
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
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#7a9ab0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const x = (i / 24) * width + Math.sin(t * 0.01 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 30, height);
      ctx.stroke();
    }
    if (Math.random() > 0.96) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#c0d8e8';
      ctx.lineWidth = 2;
      const x = width * (0.2 + Math.random() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 60, height * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
