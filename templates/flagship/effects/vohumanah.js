/**
 * VohuManah — Good Mind
 * Calm rays of thought, drifting luminous clouds, and gentle cattle-horn crescents.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('vohumanah-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height;

  const SKY_TOP = '#0a0f1a';
  const SKY_BOTTOM = '#1a2535';
  const GOLD = { r: 212, g: 175, b: 55 };
  const SKY = { r: 135, g: 206, b: 235 };
  const WHITE = { r: 240, g: 248, b: 255 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initClouds();
    initHorns();
    initParticles();
  }

  // ── Background gradient ──
  function drawBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, SKY_TOP);
    bg.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Rotating rays of thought ──
  let rayPhase = 0;
  function drawRays() {
    rayPhase += 0.0015;
    const cx = width * 0.5;
    const cy = -height * 0.1;
    const rayCount = 18;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + rayPhase;
      const len = Math.max(width, height) * 1.1;
      const endX = cx + Math.cos(angle) * len;
      const endY = cy + Math.sin(angle) * len;
      const grad = ctx.createLinearGradient(cx, cy, endX, endY);
      grad.addColorStop(0, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.10)`);
      grad.addColorStop(0.4, `rgba(${SKY.r}, ${SKY.g}, ${SKY.b}, 0.04)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  // ── Drifting luminous clouds ──
  let clouds = [];
  const CLOUD_COUNT = 7;
  function initClouds() {
    clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6 + height * 0.2,
        radius: Math.random() * 90 + 60,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.08,
        alpha: Math.random() * 0.06 + 0.02,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }
  function drawClouds() {
    for (const c of clouds) {
      c.x += c.vx;
      c.y += c.vy;
      c.pulse += 0.005;
      if (c.x < -c.radius) c.x = width + c.radius;
      if (c.x > width + c.radius) c.x = -c.radius;
      if (c.y < -c.radius) c.y = height + c.radius;
      if (c.y > height + c.radius) c.y = -c.radius;
      const alpha = c.alpha * (0.7 + 0.3 * Math.sin(c.pulse));
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, `rgba(${WHITE.r}, ${WHITE.g}, ${WHITE.b}, ${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Cattle-horn crescents ──
  let horns = [];
  const HORN_COUNT = 5;
  function initHorns() {
    horns = [];
    for (let i = 0; i < HORN_COUNT; i++) {
      horns.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5 + height * 0.3,
        size: Math.random() * 30 + 20,
        vx: (Math.random() - 0.5) * 0.18,
        alpha: Math.random() * 0.12 + 0.04,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  function drawHorns() {
    for (const h of horns) {
      h.x += h.vx;
      h.phase += 0.003;
      if (h.x < -h.size * 2) h.x = width + h.size * 2;
      if (h.x > width + h.size * 2) h.x = -h.size * 2;
      const alpha = h.alpha * (0.7 + 0.3 * Math.sin(h.phase));
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h.size, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Gentle particles ──
  let particles = [];
  const PARTICLE_COUNT = 60;
  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.3 + 0.1),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.35 + 0.1,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? GOLD : WHITE
      });
    }
  }
  function drawParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += 0.02;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    drawBackground();
    drawRays();
    drawClouds();
    drawHorns();
    drawParticles();
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
