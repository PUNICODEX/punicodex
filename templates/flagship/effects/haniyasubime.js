/**
 * HANIYASUBIME — The Clay That Yields
 * Kiln embers, rising sparks, warm terracotta glow
 */

(function () {
  'use strict';

  const canvas = document.getElementById('haniyasubime-canvas');
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

  const embers = [];
  const sparks = [];
  const vessels = [];

  function initEmbers() {
    embers.length = 0;
    for (let i = 0; i < 40; i++) {
      embers.push({
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * height * 0.45,
        r: 1.5 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.02,
        opacity: 0.15 + Math.random() * 0.4,
      });
    }
  }

  function initSparks() {
    sparks.length = 0;
    for (let i = 0; i < 22; i++) {
      sparks.push(resetSpark({}));
    }
  }

  function resetSpark(s) {
    s.x = Math.random() * width;
    s.y = height + Math.random() * 60;
    s.vy = 0.4 + Math.random() * 1.1;
    s.vx = (Math.random() - 0.5) * 0.4;
    s.r = 0.8 + Math.random() * 1.8;
    s.life = 0.6 + Math.random() * 0.4;
    s.flicker = Math.random() * Math.PI * 2;
    return s;
  }

  function initVessels() {
    vessels.length = 0;
    const count = Math.min(6, Math.max(3, Math.floor(width / 320)));
    for (let i = 0; i < count; i++) {
      vessels.push({
        x: (width / (count + 1)) * (i + 1) + (Math.random() - 0.5) * 60,
        y: height * 0.82 + Math.random() * height * 0.08,
        size: 26 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.07 + Math.random() * 0.08,
      });
    }
  }

  function drawVessel(v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.fillStyle = `rgba(201, 154, 91, ${v.opacity})`;
    // simple pot silhouette: belly + neck
    ctx.beginPath();
    ctx.ellipse(0, 0, v.size * 0.8, v.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-v.size * 0.32, -v.size * 1.35, v.size * 0.64, v.size * 0.5);
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(24, 14, 10, 0.4)');
    grad.addColorStop(1, 'rgba(58, 26, 16, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Kiln glow near the base
    const glowX = width * 0.5;
    const glowY = height * 0.92;
    const glowR = Math.max(width, height) * 0.55;
    const pulse = 1 + 0.06 * Math.sin(frame * 0.02);
    const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR * pulse);
    glow.addColorStop(0, 'rgba(224, 122, 60, 0.16)');
    glow.addColorStop(0.5, 'rgba(176, 86, 60, 0.08)');
    glow.addColorStop(1, 'rgba(176, 86, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Vessels
    for (const v of vessels) drawVessel(v);

    // Embers breathing in the bed
    for (const e of embers) {
      const p = 0.5 + 0.5 * Math.sin(frame * e.speed + e.phase);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
      g.addColorStop(0, `rgba(255, 160, 80, ${e.opacity * p})`);
      g.addColorStop(1, 'rgba(255, 120, 50, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparks rising
    for (const s of sparks) {
      s.y -= s.vy;
      s.x += s.vx + Math.sin((frame + s.flicker * 60) * 0.03) * 0.3;
      s.life -= 0.0012;
      if (s.life <= 0 || s.y < -10) resetSpark(s);
      const a = Math.max(0, s.life) * (0.7 + 0.3 * Math.sin(frame * 0.15 + s.flicker));
      ctx.fillStyle = `rgba(255, 190, 110, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initEmbers();
  initSparks();
  initVessels();
  draw();

  const nav = document.querySelector('.main-nav');
  window.addEventListener('scroll', () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.pageYOffset > 80);
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navLinks.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
})();
