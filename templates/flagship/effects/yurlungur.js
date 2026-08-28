/**
 * YURLUNGUR — Copper Python
 * Coiling water serpent and copper reflections for the Yolŋu python.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('yurlungur-canvas');
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
    ctx.fillStyle = '#0a0f12';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.35;
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        const r = 80 + ring * 50 + Math.sin(a * 3 + t * 0.01 + ring) * 20;
        const x = width * 0.5 + Math.cos(a + t * 0.002 * (ring % 2 === 0 ? 1 : -1)) * r;
        const y = height * 0.5 + Math.sin(a + t * 0.002 * (ring % 2 === 0 ? 1 : -1)) * r * 0.5;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
