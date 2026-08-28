/**
 * INARI — Deity of Rice, Foxes, and Torii Gates
 * Vermilion torii paths, fox-fire orbs, rice ears
 */

(function () {
  'use strict';

  const canvas = document.getElementById('inari-canvas');
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

  const torii = [];
  const fires = [];
  const rice = [];

  function initTorii() {
    torii.length = 0;
    const count = Math.min(8, Math.floor(width / 160));
    for (let i = 0; i < count; i++) {
      torii.push({
        x: width * (0.12 + i * 0.12),
        y: height * 0.55 + Math.random() * height * 0.3,
        size: 30 + Math.random() * 25,
        opacity: 0.12 + Math.random() * 0.1,
      });
    }
  }

  function initFires() {
    fires.length = 0;
    for (let i = 0; i < 24; i++) {
      fires.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 3 + Math.random() * 6,
        vy: -(0.2 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 0.4,
        opacity: 0.2 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initRice() {
    rice.length = 0;
    const count = Math.min(40, Math.floor(width / 25));
    for (let i = 0; i < count; i++) {
      rice.push({
        x: (i / count) * width + (Math.random() - 0.5) * 12,
        h: height * (0.2 + Math.random() * 0.2),
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
  }

  function drawTorii(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = `rgba(210, 60, 40, ${t.opacity})`;
    ctx.lineWidth = 3;
    const s = t.size;
    // pillars
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.35, -s);
    ctx.moveTo(s * 0.35, 0);
    ctx.lineTo(s * 0.35, -s);
    ctx.stroke();
    // lintels
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.82);
    ctx.lineTo(s * 0.55, -s * 0.82);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.95);
    ctx.lineTo(s * 0.45, -s * 0.95);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(12, 14, 18, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Rice field
    for (const r of rice) {
      const sway = Math.sin(frame * r.speed + r.phase) * 4;
      ctx.strokeStyle = `rgba(160, 175, 110, ${r.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, height);
      ctx.quadraticCurveTo(r.x + sway * 0.5, height - r.h * 0.5, r.x + sway, height - r.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(190, 185, 110, ${r.opacity})`;
      ctx.beginPath();
      ctx.ellipse(r.x + sway, height - r.h, 2.5, 6, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torii
    for (const t of torii) {
      drawTorii(t);
    }

    // Fox fire
    for (const f of fires) {
      f.y += f.vy;
      f.x += f.vx + Math.sin(frame * 0.01 + f.phase) * 0.3;
      if (f.y < -20) {
        f.y = height + 10;
        f.x = Math.random() * width;
      }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 4);
      g.addColorStop(0, `rgba(255, 160, 60, ${f.opacity})`);
      g.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initTorii();
  initFires();
  initRice();
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
