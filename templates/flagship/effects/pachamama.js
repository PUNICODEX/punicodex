/**
 * Pachamama — Earth, Harvest, Mother
 * Bespoke hero canvas for the Incan Earth mother.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('pachamama-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const TERRA = { r: 193, g: 68, b: 14 };
  const GREEN = { r: 34, g: 139, b: 34 };
  const GOLD = { r: 212, g: 175, b: 55 };

  const roots = [];
  const leaves = [];
  const grains = [];

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
    roots.length = 0;
    const rootCount = Math.min(18, Math.floor(width / 80));
    for (let i = 0; i < rootCount; i++) {
      roots.push({
        x: (width / rootCount) * i + Math.random() * 40,
        y: height + Math.random() * 40,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6,
        length: Math.random() * 120 + 60,
        phase: Math.random() * Math.PI * 2,
      });
    }

    leaves.length = 0;
    const leafCount = Math.min(40, Math.floor(width * height / 25000));
    for (let i = 0; i < leafCount; i++) {
      leaves.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 6 + 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.3 - 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? GREEN : GOLD,
      });
    }

    grains.length = 0;
    for (let i = 0; i < 50; i++) {
      grains.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0f0a05');
    grad.addColorStop(0.6, '#1a0e05');
    grad.addColorStop(1, '#241205');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawHorizon() {
    const horizonY = height * 0.72;
    const grad = ctx.createLinearGradient(0, horizonY - 60, 0, height);
    grad.addColorStop(0, `rgba(${TERRA.r}, ${TERRA.g}, ${TERRA.b}, 0)`);
    grad.addColorStop(0.4, `rgba(${TERRA.r}, ${TERRA.g}, ${TERRA.b}, 0.15)`);
    grad.addColorStop(1, `rgba(${TERRA.r}, ${TERRA.g}, ${TERRA.b}, 0.35)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizonY - 60, width, height - horizonY + 60);

    // Rolling hills
    ctx.fillStyle = `rgba(${TERRA.r}, ${TERRA.g}, ${TERRA.b}, 0.1)`;
    for (let h = 0; h < 3; h++) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const y = horizonY + h * 35 + Math.sin((x + frame * 0.2 + h * 200) * 0.003) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawRoots() {
    for (const r of roots) {
      r.phase += 0.02;
      const glow = 0.5 + 0.5 * Math.sin(r.phase);
      ctx.strokeStyle = `rgba(${GREEN.r}, ${GREEN.g}, ${GREEN.b}, ${0.15 * glow})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      let cx = r.x;
      let cy = r.y;
      for (let s = 0; s < 6; s++) {
        cx += Math.cos(r.angle + (Math.random() - 0.5) * 0.4) * (r.length / 6);
        cy += Math.sin(r.angle + (Math.random() - 0.5) * 0.4) * (r.length / 6);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }

  function drawLeaves() {
    for (const l of leaves) {
      l.x += l.vx;
      l.y += l.vy;
      l.rotation += l.rotSpeed;
      if (l.y < -20) l.y = height + 20;
      if (l.x < -20) l.x = width + 20;
      if (l.x > width + 20) l.x = -20;

      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rotation);
      ctx.globalAlpha = l.alpha;
      ctx.fillStyle = `rgba(${l.color.r}, ${l.color.g}, ${l.color.b}, 1)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGrains() {
    for (const g of grains) {
      g.pulse += 0.03;
      const alpha = g.alpha * (0.6 + 0.4 * Math.sin(g.pulse));
      ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawHorizon();
    drawRoots();
    drawLeaves();
    drawGrains();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
