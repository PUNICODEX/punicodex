/**
 * Chilsong, the Seven Stars — Seven Stars
 * Seven bright stars connected by faint lines drift slowly across a dark sky.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('chilsong-canvas');
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

  const stars = [{x:0.25,y:0.35},{x:0.30,y:0.34},{x:0.35,y:0.36},{x:0.40,y:0.38},{x:0.42,y:0.45},{x:0.44,y:0.52},{x:0.46,y:0.58}];
  let t = 0;
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#e8f0ff';
    for (const s of stars) {
      const x = s.x * width + Math.sin(t * 0.0005 + s.x * 10) * 4;
      const y = s.y * height + Math.cos(t * 0.0005 + s.y * 10) * 4;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.2; ctx.strokeStyle = '#a8c0e8'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < stars.length; i++) { const s=stars[i]; const x=s.x*width; const y=s.y*height; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke();
    ctx.globalAlpha = 1;
    t++; requestAnimationFrame(draw);
  }
  draw();
}());
