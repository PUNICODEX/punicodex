/**
 * Samshin, the Three Spirits — Three Birth Lights
 * Three warm orbs of light drift and pulse like lanterns around a cradle of stars.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('samshin-canvas');
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

  const orbs = [{x:0.35,y:0.5,c:'#e8a88a'},{x:0.5,y:0.45,c:'#f0c68a'},{x:0.65,y:0.5,c:'#e8a88a'}];
  const sparks = []; for (let i = 0; i < 50; i++) sparks.push({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.2, life: Math.random() });
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const x = o.x * width + Math.sin(t * 0.002 + i) * 20;
      const y = o.y * height + Math.cos(t * 0.003 + i) * 15;
      const r = 30 + Math.sin(t * 0.004 + i) * 6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      g.addColorStop(0, o.c); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.25; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff5e6';
    for (const s of sparks) {
      const x = (s.x + Math.sin(t * 0.0005 + s.life)) % 1 * width;
      const y = (s.y + t * 0.0002 * s.life) % 1 * height;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
