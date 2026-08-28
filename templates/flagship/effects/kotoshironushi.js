/**
 * KOTOSHIRONUSHI — God of Sake and Rice Abundance
 * Rice waves, sake droplets, fermentation bubbles
 */

(function () {
  'use strict';

  const canvas = document.getElementById('kotoshironushi-canvas');
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

  const rice = [];
  const drops = [];
  const bubbles = [];

  function initRice() {
    rice.length = 0;
    const count = Math.min(55, Math.floor(width / 20));
    for (let i = 0; i < count; i++) {
      rice.push({
        x: (i / count) * width + (Math.random() - 0.5) * 14,
        h: height * (0.2 + Math.random() * 0.25),
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.008,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
  }

  function initDrops() {
    drops.length = 0;
    for (let i = 0; i < 30; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.5 + Math.random() * 2.5,
        vy: 0.5 + Math.random() * 1,
        opacity: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initBubbles() {
    bubbles.length = 0;
    for (let i = 0; i < 35; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        r: 1 + Math.random() * 3,
        vy: 0.3 + Math.random() * 0.7,
        opacity: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(25, 22, 18, 0.35)');
    grad.addColorStop(1, 'rgba(15, 12, 8, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Rice field
    for (const r of rice) {
      const sway = Math.sin(frame * r.speed + r.phase) * 6;
      ctx.strokeStyle = `rgba(180, 175, 110, ${r.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, height);
      ctx.quadraticCurveTo(r.x + sway * 0.5, height - r.h * 0.5, r.x + sway, height - r.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(210, 200, 120, ${r.opacity * 1.2})`;
      ctx.beginPath();
      ctx.ellipse(r.x + sway, height - r.h, 3, 7, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sake droplets
    for (const d of drops) {
      d.y += d.vy;
      d.x += Math.sin(frame * 0.01 + d.phase) * 0.3;
      if (d.y > height + 10) {
        d.y = -10;
        d.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(230, 220, 180, ${d.opacity})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 250, 220, ${d.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bubbles
    for (const b of bubbles) {
      b.y -= b.vy;
      b.x += Math.sin(frame * 0.012 + b.phase) * 0.3;
      if (b.y < -10) {
        b.y = height + 10;
        b.x = Math.random() * width;
      }
      ctx.strokeStyle = `rgba(220, 210, 170, ${b.opacity})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initRice();
  initDrops();
  initBubbles();
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
