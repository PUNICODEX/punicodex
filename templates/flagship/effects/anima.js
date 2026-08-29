/**
 * ANIMA — Soul, Breath, Life Force
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('anima-canvas');
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


  // Breathing anima — drifting souls, aurora ribbons and heart-pulses
  const AURORA = { r: 64, g: 224, b: 208 };
  const SOUL = { r: 176, g: 196, b: 222 };
  const GOLD = { r: 212, g: 175, b: 55 };
  let frame = 0;

  const souls = [];
  for (let i = 0; i < 50; i++) {
    souls.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.35 + 0.1,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.6 ? AURORA : SOUL,
    });
  }

  const ribbons = [];
  for (let i = 0; i < 5; i++) {
    ribbons.push({
      y: (i / 5) * height,
      amplitude: 30 + Math.random() * 40,
      speed: 0.008 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const pulses = [];
  for (let i = 0; i < 4; i++) {
    pulses.push({
      x: Math.random(),
      y: Math.random(),
      r: 20 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width * 0.85);
    bg.addColorStop(0, '#0c1018');
    bg.addColorStop(0.6, '#080a10');
    bg.addColorStop(1, '#040508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const r of ribbons) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = 'rgba(' + AURORA.r + ',' + AURORA.g + ',' + AURORA.b + ',0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = r.y + Math.sin((x + frame) * 0.005 + r.phase) * r.amplitude;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const p of pulses) {
      p.phase += 0.03;
      const pulse = 0.5 + 0.5 * Math.sin(p.phase);
      ctx.save();
      ctx.globalAlpha = 0.08 * pulse;
      const g = ctx.createRadialGradient(p.x * width, p.y * height, 0, p.x * width, p.y * height, p.r * (1 + pulse));
      g.addColorStop(0, 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, p.r * (1 + pulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const s of souls) {
      s.x += s.vx + Math.sin(frame * 0.01 + s.phase) * 0.15;
      s.y += s.vy;
      if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
      ctx.globalAlpha = s.alpha * (0.6 + 0.4 * Math.sin(frame * 0.03 + s.phase));
      ctx.fillStyle = 'rgba(' + s.color.r + ',' + s.color.g + ',' + s.color.b + ',1)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());