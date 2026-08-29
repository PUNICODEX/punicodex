/**
 * Sosin, the Revealer of Things — Messenger Paths
 * Faint travelling lights move along curving paths, carrying petitions between realms.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('sosin-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let width, height;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const paths = []; for (let i = 0; i < 12; i++) paths.push({ y: 0.1 + (i / 12) * 0.8, amp: 30 + Math.random() * 50, speed: 0.001 + Math.random() * 0.002, phase: Math.random() * Math.PI * 2 });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#b0a8d8'; ctx.lineWidth = 1;
    for (const p of paths) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = p.y * height + Math.sin((x / width) * Math.PI * 4 + t * p.speed + p.phase) * p.amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#e8e0ff';
    for (let i = 0; i < 6; i++) {
      const x = ((t * 0.0002 * (i + 1) + i * 0.17) % 1) * width;
      const y = (0.15 + (i / 6) * 0.7) * height + Math.sin(t * 0.002 + i) * 20;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
