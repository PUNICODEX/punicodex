/**
 * PATROKLOS — Warrior, Companion of Achilles
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('patroclus-canvas');
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


  // Mourning ash, grey wings and bronze shield fragments
  const ASH = { r: 140, g: 140, b: 145 };
  const BRONZE = { r: 180, g: 130, b: 70 };
  const GOLD = { r: 190, g: 165, b: 95 };
  let frame = 0;

  const ash = [];
  for (let i = 0; i < 80; i++) {
    ash.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * 0.5 + 0.1,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const wings = [];
  for (let i = 0; i < 3; i++) {
    wings.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.4 + height * 0.1,
      size: 40 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.4,
      wingPhase: Math.random() * Math.PI * 2,
      opacity: 0.08 + Math.random() * 0.06,
    });
  }

  const shields = [];
  for (let i = 0; i < 4; i++) {
    shields.push({
      x: Math.random(),
      y: 0.6 + Math.random() * 0.3,
      size: 50 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function drawWing(w) {
    w.x += w.speed;
    w.wingPhase += 0.03;
    if (w.x > width + w.size) w.x = -w.size;
    ctx.save();
    ctx.globalAlpha = w.opacity;
    ctx.translate(w.x, w.y);
    const flap = Math.sin(w.wingPhase) * 10;
    ctx.fillStyle = 'rgba(' + ASH.r + ',' + ASH.g + ',' + ASH.b + ',0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-w.size * 0.6, -w.size * 0.5 + flap, -w.size, flap);
    ctx.quadraticCurveTo(-w.size * 0.4, w.size * 0.2 + flap, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w.size * 0.6, -w.size * 0.5 - flap, w.size, -flap);
    ctx.quadraticCurveTo(w.size * 0.4, w.size * 0.2 - flap, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0a0a0c');
    bg.addColorStop(0.5, '#0f0f12');
    bg.addColorStop(1, '#151316');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const s of shields) {
      const cx = s.x * width;
      const cy = s.y * height;
      ctx.save();
      ctx.globalAlpha = 0.06 + 0.02 * Math.sin(frame * 0.003 + s.phase);
      ctx.strokeStyle = 'rgba(' + BRONZE.r + ',' + BRONZE.g + ',' + BRONZE.b + ',0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, s.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s.size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const w of wings) drawWing(w);

    for (const a of ash) {
      a.x += a.vx;
      a.y += a.vy;
      if (a.y > height + 10) { a.y = -10; a.x = Math.random() * width; }
      ctx.globalAlpha = a.alpha * (0.6 + 0.4 * Math.sin(frame * 0.03 + a.phase));
      ctx.fillStyle = 'rgba(' + ASH.r + ',' + ASH.g + ',' + ASH.b + ',1)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());