/**
 * NGALYOD — Rainbow Serpent
 * Arcing spectral bands and water ripples for the rainbow serpent.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ngalyod-canvas');
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
    ctx.fillStyle = '#081018';
    ctx.fillRect(0, 0, width, height);
    const colors = ['#ff4d4d', '#ffaf4d', '#ffff4d', '#4dff4d', '#4d4dff', '#af4dff'];
    ctx.lineWidth = 4;
    for (let c = 0; c < colors.length; c++) {
      ctx.strokeStyle = colors[c];
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = height * 0.5 + Math.sin((x + t * (0.5 + c * 0.1)) * 0.01) * height * 0.15 + (c - colors.length / 2) * 8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
