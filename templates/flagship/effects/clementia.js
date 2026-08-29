/**
 * CLEMENTIA — Mercy, Forgiveness
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('clementia-canvas');
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


  // Doves, olive branches and forgiving light
  const WHITE = { r: 255, g: 250, b: 245 };
  const OLIVE = { r: 154, g: 205, b: 50 };
  const GOLD = { r: 212, g: 175, b: 55 };
  let frame = 0;

  const doves = [];
  for (let i = 0; i < 5; i++) {
    doves.push({
      x: -50 - Math.random() * 200,
      y: Math.random() * height * 0.5 + height * 0.1,
      speed: 0.8 + Math.random() * 1.2,
      size: 12 + Math.random() * 10,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.04 + Math.random() * 0.04,
      opacity: 0.15 + Math.random() * 0.15,
    });
  }

  const branches = [];
  for (let i = 0; i < 7; i++) {
    branches.push({
      x: Math.random() * width,
      y: height + 20 + Math.random() * 40,
      angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6,
      length: 80 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const petals = [];
  for (let i = 0; i < 30; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: Math.random() * 4 + 2,
      vy: 0.3 + Math.random() * 0.5,
      sway: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? OLIVE : WHITE,
    });
  }

  function drawDove(d) {
    d.x += d.speed;
    d.wingPhase += d.wingSpeed;
    if (d.x > width + 80) {
      d.x = -80;
      d.y = Math.random() * height * 0.5 + height * 0.1;
    }
    ctx.save();
    ctx.globalAlpha = d.opacity;
    ctx.translate(d.x, d.y);
    ctx.fillStyle = 'rgba(' + WHITE.r + ',' + WHITE.g + ',' + WHITE.b + ',0.8)';
    ctx.beginPath();
    ctx.ellipse(0, 0, d.size, d.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const wingY = Math.sin(d.wingPhase) * d.size * 0.5;
    ctx.beginPath();
    ctx.moveTo(-d.size * 0.4, 0);
    ctx.quadraticCurveTo(-d.size, -d.size * 0.6 + wingY, -d.size * 1.6, wingY * 0.3);
    ctx.quadraticCurveTo(-d.size * 0.8, -d.size * 0.1 + wingY * 0.5, -d.size * 0.4, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(d.size * 0.4, 0);
    ctx.quadraticCurveTo(d.size, -d.size * 0.6 - wingY, d.size * 1.6, -wingY * 0.3);
    ctx.quadraticCurveTo(d.size * 0.8, -d.size * 0.1 - wingY * 0.5, d.size * 0.4, 0);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0d1016');
    bg.addColorStop(0.6, '#0a0d12');
    bg.addColorStop(1, '#07090c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const b of branches) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle + Math.sin(frame * 0.003 + b.phase) * 0.02);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = 'rgba(' + OLIVE.r + ',' + OLIVE.g + ',' + OLIVE.b + ',0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -b.length);
      ctx.stroke();
      for (let j = 0; j < 8; j++) {
        const ly = -b.length * (j / 8);
        const side = j % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(side * 12, ly, 6, 2, side * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + OLIVE.r + ',' + OLIVE.g + ',' + OLIVE.b + ',0.5)';
        ctx.fill();
      }
      ctx.restore();
    }

    for (const p of petals) {
      p.y += p.vy;
      p.x += Math.sin(frame * 0.01 + p.phase) * 0.3;
      if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',1)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.55, frame * 0.02 + p.phase, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const d of doves) drawDove(d);
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());