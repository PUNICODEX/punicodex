/**
 * MAMARAGAN — Lightning Man
 * Forked lightning and storm pulses for the Arnhem Land lightning being.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('mamaragan-canvas');
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
    ctx.fillStyle = '#0b0c12';
    ctx.fillRect(0, 0, width, height);
    if (Math.random() > 0.92) {
      ctx.strokeStyle = '#e8e8ff';
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.globalAlpha = 0.7;
      let x = width * (0.3 + Math.random() * 0.4);
      let y = 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < height * 0.7) {
        x += (Math.random() - 0.5) * 80;
        y += 30 + Math.random() * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#4a5a8a';
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.3, 120 + Math.sin(t * 0.05) * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
