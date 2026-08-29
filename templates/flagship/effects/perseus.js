/**
 * PERSEUS — Hero, Slayer of Medousa
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('perseus-canvas');
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


  // Mirrored shield, winged-sandal stars and serpent shadows
  const SILVER = { r: 192, g: 192, b: 192 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const SERPENT = { r: 80, g: 120, b: 90 };
  let frame = 0;

  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const serpents = [];
  for (let i = 0; i < 5; i++) {
    serpents.push({
      y: height * (0.55 + Math.random() * 0.35),
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.01,
      amplitude: 20 + Math.random() * 20,
    });
  }

  const shield = { x: 0.5, y: 0.45, r: 70, phase: 0 };

  function drawShield() {
    shield.phase += 0.005;
    const cx = shield.x * width;
    const cy = shield.y * height;
    const r = shield.r;
    ctx.save();
    ctx.globalAlpha = 0.18;
    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.5);
    glow.addColorStop(0, 'rgba(192,192,192,0.2)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 2.5, cy - r * 2.5, r * 5, r * 5);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(' + SILVER.r + ',' + SILVER.g + ',' + SILVER.b + ',0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    // reflective flash
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(shield.phase * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.85);
    bg.addColorStop(0, '#0d1018');
    bg.addColorStop(0.6, '#080a0f');
    bg.addColorStop(1, '#040508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const s of stars) {
      ctx.globalAlpha = s.alpha * (0.7 + 0.3 * Math.sin(frame * 0.04 + s.phase));
      ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',1)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    drawShield();

    for (const sn of serpents) {
      sn.phase += sn.speed;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = 'rgba(' + SERPENT.r + ',' + SERPENT.g + ',' + SERPENT.b + ',0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 15) {
        const y = sn.y + Math.sin((x + frame) * 0.01 + sn.phase) * sn.amplitude;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());