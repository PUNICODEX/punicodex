/**
 * IPHIGENEIA — Sacrifice, Winds, Aulis
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('iphigeneia-canvas');
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


  // Altar flame, smoke and moonlit sacrifice
  const FLAME = { r: 220, g: 90, b: 30 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const ASH = { r: 120, g: 120, b: 130 };
  let frame = 0;

  const flames = [];
  for (let i = 0; i < 30; i++) {
    flames.push({
      x: width * 0.5 + (Math.random() - 0.5) * 60,
      y: height * 0.72,
      vy: 1 + Math.random() * 2,
      size: 3 + Math.random() * 6,
      alpha: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const smoke = [];
  for (let i = 0; i < 20; i++) {
    smoke.push({
      x: width * 0.5 + (Math.random() - 0.5) * 80,
      y: height * 0.65 - Math.random() * 100,
      r: 20 + Math.random() * 40,
      vy: 0.3 + Math.random() * 0.5,
      alpha: Math.random() * 0.12 + 0.03,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const moon = { x: 0.82, y: 0.18, r: 45, phase: 0 };

  function drawMoon() {
    moon.phase += 0.002;
    const cx = moon.x * width;
    const cy = moon.y * height;
    const r = moon.r;
    ctx.save();
    ctx.globalAlpha = 0.25;
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 3);
    glow.addColorStop(0, 'rgba(220,220,215,0.15)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(245,245,240,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    const shift = 0.25 + Math.sin(moon.phase) * 0.05;
    ctx.bezierCurveTo(cx + r * shift, cy + r, cx + r * shift, cy - r, cx, cy - r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#08090e');
    bg.addColorStop(0.5, '#120c0a');
    bg.addColorStop(1, '#1a0f0a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    drawMoon();

    // altar base
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(' + ASH.r + ',' + ASH.g + ',' + ASH.b + ',0.4)';
    ctx.fillRect(width * 0.5 - 70, height * 0.72, 140, 12);
    ctx.restore();

    for (const s of smoke) {
      s.y -= s.vy;
      s.x += Math.sin(frame * 0.005 + s.phase) * 0.3;
      s.r += 0.1;
      if (s.y < height * 0.2) { s.y = height * 0.65; s.x = width * 0.5 + (Math.random() - 0.5) * 80; s.r = 20 + Math.random() * 40; }
      ctx.globalAlpha = s.alpha;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, 'rgba(80,80,85,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const f of flames) {
      f.y -= f.vy;
      f.x += Math.sin(frame * 0.08 + f.phase) * 1.2;
      f.alpha -= 0.005;
      if (f.alpha <= 0 || f.y < height * 0.45) {
        f.y = height * 0.72;
        f.x = width * 0.5 + (Math.random() - 0.5) * 60;
        f.alpha = Math.random() * 0.5 + 0.2;
      }
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = 'rgba(' + FLAME.r + ',' + FLAME.g + ',' + FLAME.b + ',1)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());