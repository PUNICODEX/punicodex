/**
 * IZANAGI — Creation God
 * Stirring primordial ocean, heavenly bridge, cosmic specks
 */

(function () {
  'use strict';

  const canvas = document.getElementById('izanagi-canvas');
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

  const waves = [];
  const bridge = [];
  const stars = [];

  function initWaves() {
    waves.length = 0;
    for (let i = 0; i < 9; i++) {
      waves.push({
        y: height * (0.4 + i * 0.06),
        amp: 12 + Math.random() * 24,
        freq: 0.003 + Math.random() * 0.004,
        speed: 0.01 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.06 - i * 0.005,
      });
    }
  }

  function initBridge() {
    bridge.length = 0;
    for (let i = 0; i < 20; i++) {
      bridge.push({
        t: i / 19,
        size: 3 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.15,
      });
    }
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        r: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(10, 15, 35, 0.45)');
    grad.addColorStop(1, 'rgba(5, 20, 40, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Stars
    for (const s of stars) {
      const pulse = 0.7 + 0.3 * Math.sin(frame * s.speed + s.phase);
      ctx.fillStyle = `rgba(230, 240, 255, ${s.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavenly bridge
    const bx = width * 0.1;
    const by = height * 0.12;
    const ex = width * 0.9;
    const ey = height * 0.18;
    for (const b of bridge) {
      const x = bx + (ex - bx) * b.t;
      const y = by + (ey - by) * b.t + Math.sin(b.t * Math.PI) * -40;
      ctx.fillStyle = `rgba(220, 210, 180, ${b.opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(220, 210, 180, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(width * 0.5, by - 80, ex, ey);
    ctx.stroke();

    // Waves
    for (const w of waves) {
      ctx.strokeStyle = `rgba(140, 190, 220, ${w.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = w.y + Math.sin(x * w.freq + frame * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initWaves();
  initBridge();
  initStars();
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
