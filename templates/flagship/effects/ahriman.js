/**
 * Ahriman — The Destructive Spirit
 * Writhing void-coils, crimson embers, and shattering cracks.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('ahriman-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height;

  const VOID = '#0a0707';
  const CRIMSON = { r: 139, g: 0, b: 0 };
  const DARK_RED = { r: 60, g: 0, b: 0 };
  const ASH = { r: 80, g: 75, b: 70 };
  const GOLD = { r: 180, g: 140, b: 40 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initEmbers();
    initCracks();
  }

  // ── Void coils ──
  let coilPhase = 0;
  function drawCoils() {
    coilPhase += 0.003;
    ctx.lineCap = 'round';
    for (let c = 0; c < 4; c++) {
      const offset = (c / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${DARK_RED.r}, ${DARK_RED.g}, ${DARK_RED.b}, ${0.04 + c * 0.01})`;
      ctx.lineWidth = 8 - c;
      for (let t = 0; t <= Math.PI * 6; t += 0.05) {
        const r = 40 + t * 22 + c * 30;
        const a = t + coilPhase * (0.5 + c * 0.2) + offset;
        const x = width * 0.5 + Math.cos(a) * r;
        const y = height * 0.5 + Math.sin(a * 0.8) * r * 0.45;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ── Central dark core ──
  function drawCore() {
    const pulse = 0.7 + 0.3 * Math.sin(coilPhase * 1.5);
    const grad = ctx.createRadialGradient(
      width * 0.5, height * 0.5, 0,
      width * 0.5, height * 0.5, Math.min(width, height) * 0.35
    );
    grad.addColorStop(0, `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${0.12 * pulse})`);
    grad.addColorStop(0.4, `rgba(${DARK_RED.r}, ${DARK_RED.g}, ${DARK_RED.b}, ${0.06 * pulse})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Embers ──
  let embers = [];
  const EMBER_COUNT = 70;
  function initEmbers() {
    embers = [];
    for (let i = 0; i < EMBER_COUNT; i++) {
      embers.push(createEmber());
    }
  }
  function createEmber() {
    const isGold = Math.random() > 0.75;
    return {
      x: Math.random() * width,
      y: Math.random() * height + height * 0.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.8 + 0.2),
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      flicker: Math.random() * Math.PI * 2,
      color: isGold ? GOLD : CRIMSON
    };
  }
  function drawEmbers() {
    for (const e of embers) {
      e.x += e.vx;
      e.y += e.vy;
      e.flicker += 0.08;
      if (e.y < -10 || e.x < -10 || e.x > width + 10) {
        Object.assign(e, createEmber());
        e.y = height + 10;
      }
      const alpha = e.alpha * (0.6 + 0.4 * Math.sin(e.flicker));
      ctx.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Shattering cracks ──
  let cracks = [];
  function initCracks() {
    cracks = [];
  }
  function spawnCrack() {
    if (Math.random() > 0.008) return;
    const startX = Math.random() * width;
    const startY = Math.random() < 0.5 ? -10 : height + 10;
    const targetY = startY < 0 ? height + 10 : -10;
    const segs = [];
    let x = startX;
    let y = startY;
    while ((targetY < startY ? y > targetY : y < targetY)) {
      x += (Math.random() - 0.5) * 60;
      y += (targetY < startY ? -1 : 1) * (Math.random() * 30 + 15);
      segs.push({ x, y });
    }
    cracks.push({ segs, alpha: 1, color: Math.random() > 0.5 ? CRIMSON : GOLD });
  }
  function drawCracks() {
    spawnCrack();
    for (let i = cracks.length - 1; i >= 0; i--) {
      const c = cracks[i];
      if (c.segs.length < 2) {
        cracks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.strokeStyle = `rgba(${c.color.r}, ${c.color.g}, ${c.color.b}, ${c.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${c.color.r}, ${c.color.g}, ${c.color.b}, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(c.segs[0].x, c.segs[0].y);
      for (let j = 1; j < c.segs.length; j++) {
        ctx.lineTo(c.segs[j].x, c.segs[j].y);
      }
      ctx.stroke();
      ctx.restore();
      c.alpha -= 0.015;
      if (c.alpha <= 0) cracks.splice(i, 1);
    }
  }

  // ── Ash mist ──
  function drawMist() {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height));
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, `rgba(${ASH.r}, ${ASH.g}, ${ASH.b}, 0.03)`);
    grad.addColorStop(1, `rgba(${ASH.r}, ${ASH.g}, ${ASH.b}, 0.08)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw() {
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, width, height);
    drawMist();
    drawCoils();
    drawCore();
    drawCracks();
    drawEmbers();
  }

  function frame() {
    if (reduced) return;
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
  if (!reduced) frame();
}());
