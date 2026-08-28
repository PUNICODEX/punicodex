/**
 * KUMANO — Sacred Mountain Sanctuary
 * Misty layered peaks, cedar silhouettes, waterfall ribbons
 */

(function () {
  'use strict';

  const canvas = document.getElementById('kumano-canvas');
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

  const peaks = [];
  const mist = [];
  const cedars = [];

  function initPeaks() {
    peaks.length = 0;
    for (let i = 0; i < 5; i++) {
      peaks.push({
        y: height * (0.45 + i * 0.1),
        amplitude: 60 + i * 30,
        frequency: 0.002 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 - i * 0.01,
      });
    }
  }

  function initMist() {
    mist.length = 0;
    for (let i = 0; i < 8; i++) {
      mist.push({
        x: Math.random() * width,
        y: height * 0.4 + Math.random() * height * 0.5,
        r: 80 + Math.random() * 140,
        speed: 0.15 + Math.random() * 0.25,
        opacity: 0.04 + Math.random() * 0.04,
      });
    }
  }

  function initCedars() {
    cedars.length = 0;
    const count = Math.min(24, Math.floor(width / 50));
    for (let i = 0; i < count; i++) {
      cedars.push({
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * height * 0.45,
        w: 5 + Math.random() * 10,
        h: 60 + Math.random() * 120,
        opacity: 0.1 + Math.random() * 0.15,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(18, 28, 35, 0.35)');
    grad.addColorStop(1, 'rgba(8, 18, 18, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Mist
    for (const m of mist) {
      m.x += m.speed;
      if (m.x > width + m.r) m.x = -m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(210, 225, 230, ${m.opacity})`);
      g.addColorStop(1, 'rgba(210, 225, 230, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant peaks
    for (const p of peaks) {
      ctx.fillStyle = `rgba(30, 45, 50, ${p.opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const y = p.y + Math.sin(x * p.frequency + frame * 0.002 + p.phase) * p.amplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }

    // Cedars
    for (const c of cedars) {
      ctx.fillStyle = `rgba(15, 28, 22, ${c.opacity})`;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - c.w * 0.3, c.y - c.h * 0.35);
      ctx.lineTo(c.x - c.w * 0.15, c.y - c.h * 0.35);
      ctx.lineTo(c.x - c.w * 0.4, c.y - c.h * 0.7);
      ctx.lineTo(c.x - c.w * 0.2, c.y - c.h * 0.7);
      ctx.lineTo(c.x - c.w * 0.5, c.y - c.h);
      ctx.lineTo(c.x + c.w * 0.5, c.y - c.h);
      ctx.lineTo(c.x + c.w * 0.2, c.y - c.h * 0.7);
      ctx.lineTo(c.x + c.w * 0.4, c.y - c.h * 0.7);
      ctx.lineTo(c.x + c.w * 0.15, c.y - c.h * 0.35);
      ctx.lineTo(c.x + c.w * 0.3, c.y - c.h * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    // Waterfall ribbons
    ctx.strokeStyle = 'rgba(200, 225, 235, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const x = width * (0.45 + i * 0.025);
      ctx.beginPath();
      ctx.moveTo(x, height * 0.35);
      ctx.lineTo(x + Math.sin(frame * 0.01 + i) * 3, height * 0.85);
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initPeaks();
  initMist();
  initCedars();
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
