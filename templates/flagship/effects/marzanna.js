// Marzanna — Winter, Death, Rebirth
(function () {
  'use strict';

  const canvas = document.getElementById('marzanna-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width, height;
  function resize() {
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
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a2028');
    g.addColorStop(1, '#0a0c10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#8aa0b0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * width + Math.sin(t * 0.01 + i) * 15;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 20, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#c0d0e0';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = (t * 1 + i * 15) % height;
      ctx.fillRect(x, y, 2, 8);
    }
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.4);
    ctx.lineTo(width * 0.45, height * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.5);
    ctx.lineTo(width * 0.35, height * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.55);
    ctx.lineTo(width * 0.65, height * 0.75);
    ctx.stroke();
    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
