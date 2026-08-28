/**
 * TOYOTAMA — Sea Princess and Dragon
 * Waves, pearls, dragon scales, bioluminescence
 */

(function () {
  'use strict';

  const canvas = document.getElementById('toyotama-canvas');
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
  const pearls = [];
  const scales = [];

  function initWaves() {
    waves.length = 0;
    for (let i = 0; i < 8; i++) {
      waves.push({
        y: height * (0.45 + i * 0.06),
        amp: 12 + Math.random() * 22,
        freq: 0.003 + Math.random() * 0.003,
        speed: 0.01 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.07 - i * 0.005,
      });
    }
  }

  function initPearls() {
    pearls.length = 0;
    for (let i = 0; i < 30; i++) {
      pearls.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  function initScales() {
    scales.length = 0;
    for (let i = 0; i < 45; i++) {
      scales.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 8 + Math.random() * 14,
        opacity: 0.08 + Math.random() * 0.12,
        hue: 170 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(12, 22, 40, 0.4)');
    grad.addColorStop(1, 'rgba(5, 15, 30, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Waves
    for (const w of waves) {
      ctx.strokeStyle = `rgba(150, 200, 225, ${w.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = w.y + Math.sin(x * w.freq + frame * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Scales
    for (const s of scales) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * 0.01 + s.phase);
      ctx.strokeStyle = `hsla(${s.hue}, 60%, 55%, ${s.opacity * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 1.5);
      ctx.stroke();
    }

    // Pearls
    for (const p of pearls) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * p.speed + p.phase);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255, 255, 240, ${p.opacity * pulse})`);
      g.addColorStop(1, 'rgba(255, 255, 240, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initWaves();
  initPearls();
  initScales();
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
