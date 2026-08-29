/**
 * Inti — Sun, Empire, Agriculture
 * Bespoke hero canvas for the Incan sun god.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('inti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const GOLD = { r: 212, g: 175, b: 55 };
  const AMBER = { r: 255, g: 140, b: 0 };
  const CORONA = { r: 255, g: 215, b: 0 };

  const rays = [];
  const embers = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initElements();
  }

  function initElements() {
    rays.length = 0;
    const rayCount = Math.min(36, Math.floor(width / 40));
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: (i / rayCount) * Math.PI * 2,
        length: Math.random() * 120 + 80,
        width: Math.random() * 2 + 1,
        speed: Math.random() * 0.002 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }

    embers.length = 0;
    const emberCount = Math.min(80, Math.floor(width * height / 15000));
    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawSun() {
    const cx = width * 0.5;
    const cy = height * 0.4;
    const radius = Math.min(width, height) * 0.14;
    const pulse = Math.sin(frame * 0.02) * 0.03 + 1;

    // Outer corona glow
    const corona = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 2.8);
    corona.addColorStop(0, `rgba(${CORONA.r}, ${CORONA.g}, ${CORONA.b}, 0.25)`);
    corona.addColorStop(0.5, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.08)`);
    corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Sun disk
    const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    diskGrad.addColorStop(0, `rgba(${CORONA.r}, ${CORONA.g}, ${CORONA.b}, 0.95)`);
    diskGrad.addColorStop(0.6, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.85)`);
    diskGrad.addColorStop(1, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0.6)`);
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inti face pattern (simplified rayed mask)
    ctx.strokeStyle = `rgba(60, 30, 0, 0.15)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + frame * 0.005;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * radius * 0.2, cy + Math.sin(a) * radius * 0.2);
      ctx.lineTo(cx + Math.cos(a) * radius * 0.85, cy + Math.sin(a) * radius * 0.85);
      ctx.stroke();
    }
  }

  function drawRays() {
    const cx = width * 0.5;
    const cy = height * 0.4;
    const radius = Math.min(width, height) * 0.16;

    for (const r of rays) {
      r.phase += r.speed;
      const alpha = 0.08 + 0.06 * Math.sin(r.phase);
      const len = r.length * (0.9 + 0.1 * Math.sin(r.phase * 2));
      const x1 = cx + Math.cos(r.angle) * radius;
      const y1 = cy + Math.sin(r.angle) * radius;
      const x2 = cx + Math.cos(r.angle) * (radius + len);
      const y2 = cy + Math.sin(r.angle) * (radius + len);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = r.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function drawEmbers() {
    for (const e of embers) {
      e.x += e.vx;
      e.y += e.vy;
      e.pulse += 0.03;
      if (e.y < -10) e.y = height + 10;
      if (e.x < -10) e.x = width + 10;
      if (e.x > width + 10) e.x = -10;

      const alpha = e.alpha * (0.6 + 0.4 * Math.sin(e.pulse));
      ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);

    // Deep warm base
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, '#1a0f00');
    base.addColorStop(1, '#0d0800');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    drawRays();
    drawSun();
    drawEmbers();

    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
