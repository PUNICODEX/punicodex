// Zmey Gorynych — Three-Headed Dragon
(function () {
  'use strict';

  const canvas = document.getElementById('zmeygorynych-canvas');
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
  const sparks = [];
  for (let i = 0; i < 60; i++) {
    sparks.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.004,
      vy: -Math.random() * 0.003 - 0.001,
      r: 1 + Math.random() * 2,
      hue: 10 + Math.random() * 30
    });
  }
  function drawHead(cx, cy, baseAngle, sway) {
    const neckLen = Math.min(width, height) * 0.22;
    const hx = cx + Math.cos(baseAngle + sway) * neckLen;
    const hy = cy + Math.sin(baseAngle + sway) * neckLen * 0.5;
    ctx.strokeStyle = '#2a1a2a';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(baseAngle) * neckLen * 0.5, cy - neckLen * 0.2, hx, hy);
    ctx.stroke();
    ctx.fillStyle = '#3a1f1f';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 18, 14, baseAngle + sway, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c94a2a';
    for (let i = 0; i < 3; i++) {
      const a = baseAngle + sway + (i - 1) * 0.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + Math.cos(a) * 28, hy + Math.sin(a) * 28);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsla(${10 + i * 10}, 90%, 55%, 0.6)`;
      ctx.stroke();
    }
  }
  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a1018');
    g.addColorStop(1, '#0a0608');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.65;
    const sway0 = Math.sin(t * 0.02) * 0.12;
    const sway1 = Math.sin(t * 0.025 + 1) * 0.12;
    const sway2 = Math.sin(t * 0.018 + 2) * 0.12;

    drawHead(cx, cy, -Math.PI * 0.45, sway0);
    drawHead(cx, cy, -Math.PI * 0.55, sway1);
    drawHead(cx, cy, -Math.PI * 0.65, sway2);

    ctx.globalAlpha = 0.8;
    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.y < 0) { s.y = 1; s.x = Math.random(); }
      const sx = s.x * width;
      const sy = s.y * height;
      ctx.fillStyle = `hsla(${s.hue}, 90%, 55%, ${0.4 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (Math.random() > 0.97) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalAlpha = 1;
    t++;
    requestAnimationFrame(draw);
  }
  draw();
}());
