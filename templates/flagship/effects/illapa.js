/**
 * Illapa — Thunder, Lightning, War
 * Bespoke hero canvas for the Incan thunder god.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('illapa-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const GOLD = { r: 212, g: 175, b: 55 };
  const PURPLE = { r: 128, g: 0, b: 128 };
  const ELECTRIC = { r: 135, g: 206, b: 250 };

  const rain = [];
  const clouds = [];
  let bolts = [];

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
    rain.length = 0;
    const rainCount = Math.min(140, Math.floor(width * height / 9000));
    for (let i = 0; i < rainCount; i++) {
      rain.push({
        x: Math.random() * width,
        y: Math.random() * -height,
        vy: Math.random() * 10 + 14,
        length: Math.random() * 12 + 6,
        alpha: Math.random() * 0.25 + 0.1,
      });
    }

    clouds.length = 0;
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.25,
        radius: Math.random() * 90 + 50,
        vx: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.08 + 0.03,
      });
    }

    bolts = [];
  }

  function spawnBolt() {
    const x = Math.random() * width;
    const targetY = Math.random() * height * 0.5 + height * 0.2;
    const segments = [];
    let cx = x;
    let cy = 0;
    while (cy < targetY) {
      const nx = cx + (Math.random() - 0.5) * 80;
      const ny = cy + Math.random() * 30 + 15;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      cx = nx;
      cy = ny;
    }
    bolts.push({ segments, opacity: 1, flash: 0.12 });
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0610');
    grad.addColorStop(0.5, '#12081c');
    grad.addColorStop(1, '#1a0c24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawClouds() {
    for (const c of clouds) {
      c.x += c.vx;
      if (c.x < -150) c.x = width + 150;
      if (c.x > width + 150) c.x = -150;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, `rgba(${PURPLE.r}, ${PURPLE.g}, ${PURPLE.b}, ${c.alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRain() {
    ctx.strokeStyle = `rgba(${ELECTRIC.r}, ${ELECTRIC.g}, ${ELECTRIC.b}, 0.25)`;
    ctx.lineWidth = 1;
    for (const r of rain) {
      r.y += r.vy;
      if (r.y > height + 20) {
        r.y = -height;
        r.x = Math.random() * width;
      }
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 1, r.y + r.length);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBolts() {
    if (Math.random() < 0.015) spawnBolt();

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];

      // Flash
      if (b.flash > 0) {
        ctx.fillStyle = `rgba(230, 240, 255, ${b.flash})`;
        ctx.fillRect(0, 0, width, height);
        b.flash -= 0.015;
      }

      ctx.save();
      ctx.globalAlpha = b.opacity;
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.9)`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.8)`;
      for (const s of b.segments) {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
      ctx.restore();

      b.opacity -= 0.05;
      if (b.opacity <= 0) bolts.splice(i, 1);
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawClouds();
    drawRain();
    drawBolts();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
