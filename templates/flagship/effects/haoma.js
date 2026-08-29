/**
 * Haoma — Sacred Plant of Immortality
 * Rising golden sap, drifting leaves, and the glow of the pressed elixir.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('haoma-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height;

  const DEEP_GREEN = '#050a05';
  const SAP_GREEN = { r: 34, g: 139, b: 34 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const AMBER = { r: 255, g: 140, b: 0 };
  const CREAM = { r: 245, g: 245, b: 220 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initDrops();
    initLeaves();
  }

  // ── Vine spiral ──
  let vinePhase = 0;
  function drawVine() {
    vinePhase += 0.004;
    ctx.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${SAP_GREEN.r}, ${SAP_GREEN.g}, ${SAP_GREEN.b}, ${0.05 - layer * 0.01})`;
      ctx.lineWidth = 10 - layer * 3;
      for (let t = 0; t <= Math.PI * 5; t += 0.04) {
        const r = 50 + t * 18 + layer * 25;
        const a = t + vinePhase * (0.4 + layer * 0.15);
        const x = width * 0.5 + Math.cos(a) * r;
        const y = height * 0.55 + Math.sin(a * 0.85) * r * 0.35;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ── Rising drops ──
  let drops = [];
  const DROP_COUNT = 55;
  function initDrops() {
    drops = [];
    for (let i = 0; i < DROP_COUNT; i++) {
      drops.push(createDrop());
    }
  }
  function createDrop() {
    const hue = Math.random();
    return {
      x: Math.random() * width,
      y: Math.random() * height + height * 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.9 + 0.3),
      size: Math.random() * 3 + 1,
      length: Math.random() * 8 + 4,
      alpha: Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
      color: hue > 0.66 ? GOLD : (hue > 0.33 ? AMBER : SAP_GREEN)
    };
  }
  function drawDrops() {
    for (const d of drops) {
      d.x += d.vx + Math.sin(d.phase) * 0.2;
      d.y += d.vy;
      d.phase += 0.02;
      if (d.y < -20) {
        Object.assign(d, createDrop());
        d.y = height + 10;
      }
      const alpha = d.alpha * (0.7 + 0.3 * Math.sin(d.phase));
      const grad = ctx.createLinearGradient(d.x, d.y, d.x - d.vx * 2, d.y + d.length);
      grad.addColorStop(0, `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, 0)`);
      grad.addColorStop(0.5, `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, ${alpha})`);
      grad.addColorStop(1, `rgba(${d.color.r}, ${d.color.g}, ${d.color.b}, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = d.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.vx * 2, d.y + d.length);
      ctx.stroke();
    }
  }

  // ── Drifting leaves ──
  let leaves = [];
  const LEAF_COUNT = 28;
  function initLeaves() {
    leaves = [];
    for (let i = 0; i < LEAF_COUNT; i++) {
      leaves.push(createLeaf());
    }
  }
  function createLeaf() {
    return {
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: Math.random() * 7 + 4,
      vx: (Math.random() - 0.5) * 0.6,
      vy: Math.random() * 0.7 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      sway: Math.random() * 0.02 + 0.01,
      swayPhase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.35 + 0.1,
      color: Math.random() > 0.5 ? SAP_GREEN : GOLD
    };
  }
  function drawLeaves() {
    for (const l of leaves) {
      l.y += l.vy;
      l.x += l.vx + Math.sin(l.swayPhase) * 0.4;
      l.rotation += l.rotSpeed;
      l.swayPhase += l.sway;
      if (l.y > height + 20) {
        Object.assign(l, createLeaf());
        l.y = -20;
      }
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rotation);
      ctx.globalAlpha = l.alpha;
      ctx.fillStyle = `rgba(${l.color.r}, ${l.color.g}, ${l.color.b}, ${l.alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Bottom altar glow ──
  function drawAltarGlow() {
    const grad = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, width * 0.6);
    grad.addColorStop(0, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0.12)`);
    grad.addColorStop(0.5, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.04)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Soft particles ──
  let particles = [];
  const PARTICLE_COUNT = 40;
  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.5 ? GOLD : CREAM
      });
    }
  }
  function drawParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, DEEP_GREEN);
    bg.addColorStop(1, '#0a1005');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    drawAltarGlow();
    drawVine();
    drawParticles();
    drawDrops();
    drawLeaves();
  }

  function frame() {
    if (reduced) return;
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  initParticles();
  window.addEventListener('resize', resize);
  draw();
  if (!reduced) frame();
}());
