/**
 * TAKACHIHO — Divine Gorge
 * Waterfall mist, sunbeams through cliffs, layered rocks
 */

(function () {
  'use strict';

  const canvas = document.getElementById('takachiho-canvas');
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

  const cliffs = [];
  const mist = [];
  const rays = [];

  function initCliffs() {
    cliffs.length = 0;
    for (let i = 0; i < 6; i++) {
      cliffs.push({
        x: Math.random() * width,
        y: height * 0.2 + Math.random() * height * 0.8,
        w: 40 + Math.random() * 80,
        h: 100 + Math.random() * 200,
        opacity: 0.1 + Math.random() * 0.12,
      });
    }
  }

  function initMist() {
    mist.length = 0;
    for (let i = 0; i < 12; i++) {
      mist.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 40 + Math.random() * 80,
        vx: 0.1 + Math.random() * 0.3,
        vy: -(0.1 + Math.random() * 0.3),
        opacity: 0.05 + Math.random() * 0.08,
      });
    }
  }

  function initRays() {
    rays.length = 0;
    for (let i = 0; i < 8; i++) {
      rays.push({
        x: Math.random() * width,
        angle: Math.PI / 2 + (Math.random() - 0.5) * 0.5,
        width: 25 + Math.random() * 50,
        opacity: 0.04 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.004,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(18, 28, 38, 0.35)');
    grad.addColorStop(1, 'rgba(8, 16, 22, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Rays
    for (const r of rays) {
      const pulse = 0.7 + 0.3 * Math.sin(frame * r.speed + r.phase);
      ctx.save();
      ctx.translate(r.x, -20);
      ctx.rotate(r.angle);
      const g = ctx.createLinearGradient(0, 0, 0, height * 1.2);
      g.addColorStop(0, `rgba(255, 250, 220, ${r.opacity * pulse})`);
      g.addColorStop(1, 'rgba(255, 250, 220, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r.width / 2, 0, r.width, height * 1.2);
      ctx.restore();
    }

    // Cliffs
    for (const c of cliffs) {
      ctx.fillStyle = `rgba(40, 45, 50, ${c.opacity})`;
      ctx.beginPath();
      ctx.moveTo(c.x - c.w * 0.5, c.y);
      ctx.lineTo(c.x - c.w * 0.3, c.y - c.h);
      ctx.lineTo(c.x + c.w * 0.3, c.y - c.h);
      ctx.lineTo(c.x + c.w * 0.5, c.y);
      ctx.closePath();
      ctx.fill();
    }

    // Mist
    for (const m of mist) {
      m.x += m.vx;
      m.y += m.vy;
      if (m.x > width + m.r) m.x = -m.r;
      if (m.y < -m.r) m.y = height + m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(220, 235, 245, ${m.opacity})`);
      g.addColorStop(1, 'rgba(220, 235, 245, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Waterfall ribbons
    ctx.strokeStyle = 'rgba(210, 230, 245, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = width * 0.48 + i * 4;
      ctx.beginPath();
      ctx.moveTo(x, height * 0.25);
      ctx.lineTo(x + Math.sin(frame * 0.015 + i) * 4, height * 0.9);
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initCliffs();
  initMist();
  initRays();
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
