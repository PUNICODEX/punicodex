/**
 * DUMUZID — Pastoral Cycle Canvas Effect
 *
 * Rolling golden pasture, a drifting flock, date-palm silhouettes, and a
 * seasonal underworld shadow that rises and falls. The visual grammar follows
 * Dumuzid's myth: abundance, marriage, descent, and return.
 *
 * Production pattern: self-executing IIFE, no exports, reads theme colours from
 * the canvas data attributes, respects prefers-reduced-motion, handles DPR and
 * resize, and drives its own requestAnimationFrame loop.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('dumuzid-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function readColor(attr, fallback) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
  }

  const P = readColor('data-primary', '#D4AF37');
  const S = readColor('data-secondary', '#6B8E23');

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
    seed();
  }

  resize();
  window.addEventListener('resize', resize);

  let frame = 0;
  let stars = [];
  let flock = [];
  let grass = [];
  let palms = [];
  let motes = [];

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function hillY(x, horizon, layer) {
    const amps = [0.04, 0.05, 0.03];
    const freqs = [0.008, 0.012, 0.018];
    const offs = [0, 0.04, 0.08];
    return (
      horizon +
      height * offs[layer] +
      Math.sin(x * freqs[layer] + frame * (0.0005 + layer * 0.0002)) *
        height * amps[layer]
    );
  }

  function seed() {
    const horizon = height * 0.62;

    const lightGrass = 'rgb(' + S.r + ',' + S.g + ',' + S.b + ')';
    const darkGrass =
      'rgb(' +
      Math.max(0, S.r - 20) +
      ',' +
      Math.max(0, S.g - 25) +
      ',' +
      Math.max(0, S.b - 20) +
      ')';

    stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: random(0, width),
        y: random(0, horizon * 0.75),
        size: random(0.5, 1.4),
        phase: random(0, Math.PI * 2),
        speed: random(0.005, 0.02)
      });
    }

    flock = [];
    for (let i = 0; i < 22; i++) {
      flock.push({
        x: random(0, width),
        yOff: random(4, 18),
        w: random(5, 8),
        h: random(3.2, 5),
        speed: random(0.15, 0.45),
        layer: Math.floor(random(0, 2.99))
      });
    }

    grass = [];
    for (let i = 0; i < 140; i++) {
      grass.push({
        x: random(0, width),
        yOff: random(0, height * 0.18),
        h: random(12, 34),
        phase: random(0, Math.PI * 2),
        lean: random(-6, 6),
        color: Math.random() > 0.5 ? lightGrass : darkGrass
      });
    }

    palms = [];
    const palmCount = Math.floor(Math.min(4, width / 320)) + 1;
    for (let i = 0; i < palmCount; i++) {
      const h = random(height * 0.18, height * 0.26);
      palms.push({
        x: width * (0.68 + i * 0.12 + random(-0.03, 0.03)),
        h,
        w: random(8, 13),
        lean: random(-0.05, 0.05),
        fronds: Array.from({ length: 9 }, () => h * random(0.35, 0.5))
      });
    }

    motes = [];
    for (let i = 0; i < 50; i++) {
      motes.push({
        x: random(0, width),
        y: random(height * 0.65, height),
        size: random(0.6, 2),
        speed: random(0.2, 0.8),
        alpha: random(0.15, 0.45),
        phase: random(0, Math.PI * 2)
      });
    }
  }

  function drawSky(horizon) {
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, '#0b1016');
    grad.addColorStop(0.55, '#1c2330');
    grad.addColorStop(1, '#5c4522');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStars() {
    ctx.save();
    stars.forEach((s) => {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(frame * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSun(horizon) {
    const sunX = width * 0.22;
    const sunY = horizon * 0.72;
    const r = Math.min(width, height) * 0.045;

    const glow = ctx.createRadialGradient(
      sunX,
      sunY,
      0,
      sunX,
      sunY,
      Math.min(width, height) * 0.32
    );
    glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.28)');
    glow.addColorStop(0.5, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)');
    glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.min(width, height) * 0.32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgb(' + P.r + ',' + P.g + ',' + P.b + ')';
    ctx.beginPath();
    ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHills(horizon) {
    const layers = [
      { fill: '#2f3a16', stroke: '#3d4a1e' },
      { fill: '#4a5d22', stroke: '#556b2f' },
      { fill: '#5f7a26', stroke: '#6b8e23' }
    ];

    layers.forEach((layer, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 8) {
        const y = hillY(x, horizon, idx);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = layer.fill;
      ctx.fill();
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawPalm(p, horizon) {
    const topX = p.x + Math.sin(p.lean) * p.h * 0.25;
    const topY = horizon - p.h;

    ctx.save();
    ctx.fillStyle = '#1a120b';

    ctx.beginPath();
    ctx.moveTo(p.x - p.w * 0.5, horizon);
    ctx.lineTo(topX - p.w * 0.35, topY);
    ctx.lineTo(topX + p.w * 0.35, topY);
    ctx.lineTo(p.x + p.w * 0.5, horizon);
    ctx.closePath();
    ctx.fill();

    p.fronds.forEach((frondLen, i) => {
      const angle = Math.PI * 1.05 + (i - 4) * 0.22;
      ctx.beginPath();
      ctx.ellipse(
        topX + Math.cos(angle) * frondLen * 0.35,
        topY + Math.sin(angle) * frondLen * 0.12,
        frondLen,
        frondLen * 0.12,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSheep(s, horizon) {
    const y = hillY(s.x, horizon, s.layer) - s.yOff;
    ctx.save();
    ctx.globalAlpha = 0.9;

    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.ellipse(s.x, y, s.w, s.h, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8dcc8';
    ctx.beginPath();
    ctx.arc(s.x - s.w * 0.75, y - s.h * 0.15, s.h * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f5f0e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - s.w * 0.35, y + s.h * 0.7);
    ctx.lineTo(s.x - s.w * 0.35, y + s.h * 1.3);
    ctx.moveTo(s.x + s.w * 0.35, y + s.h * 0.7);
    ctx.lineTo(s.x + s.w * 0.35, y + s.h * 1.3);
    ctx.stroke();

    ctx.restore();
  }

  function drawGrass(horizon) {
    ctx.save();
    ctx.lineWidth = 1.4;
    grass.forEach((b) => {
      const baseY = hillY(b.x, horizon, 2) + b.yOff;
      if (baseY > height) return;
      const sway = Math.sin(frame * 0.002 + b.phase) * 5 + b.lean;
      ctx.strokeStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.x, baseY);
      ctx.quadraticCurveTo(
        b.x + sway * 0.5,
        baseY - b.h * 0.6,
        b.x + sway,
        baseY - b.h
      );
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawVeil(horizon) {
    const cycle = 0.5 + 0.5 * Math.sin(frame * 0.003);
    const alpha = 0.04 + cycle * 0.48;

    const grad = ctx.createLinearGradient(0, height, 0, horizon);
    grad.addColorStop(0, 'rgba(12, 6, 10, ' + alpha + ')');
    grad.addColorStop(0.65, 'rgba(18, 10, 14, ' + alpha * 0.55 + ')');
    grad.addColorStop(1, 'rgba(18, 10, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizon, width, height - horizon);

    return cycle;
  }

  function drawMotes(cycle, horizon) {
    if (cycle < 0.25) return;
    ctx.save();
    ctx.globalAlpha = (cycle - 0.25) * 1.3;
    motes.forEach((m) => {
      m.y -= m.speed;
      m.x += Math.sin(frame * 0.003 + m.phase) * 0.3;
      if (m.y < horizon) {
        m.y = random(height * 0.7, height);
        m.x = random(0, width);
      }
      ctx.fillStyle =
        'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + m.alpha + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    frame++;

    const horizon = height * 0.62;

    ctx.clearRect(0, 0, width, height);
    drawSky(horizon);
    drawStars();
    drawSun(horizon);
    drawHills(horizon);

    palms.forEach((p) => drawPalm(p, horizon));

    flock.forEach((s) => {
      s.x += s.speed;
      if (s.x > width + 20) s.x = -20;
      drawSheep(s, horizon);
    });

    drawGrass(horizon);

    const cycle = drawVeil(horizon);
    drawMotes(cycle, horizon);

    if (!reduced) requestAnimationFrame(draw);
  }

  draw();
})();
