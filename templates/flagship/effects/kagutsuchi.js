/**
 * KAGUTSUCHI — Fire God
 * Magma cracks, erupting sparks, volcanic glow
 */

(function () {
  'use strict';

  const canvas = document.getElementById('kagutsuchi-canvas');
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

  const cracks = [];
  const sparks = [];
  const embers = [];

  function initCracks() {
    cracks.length = 0;
    for (let i = 0; i < 7; i++) {
      const startX = Math.random() * width;
      const startY = height + 10;
      const points = [];
      let x = startX;
      let y = startY;
      while (y > -10) {
        x += (Math.random() - 0.5) * 60;
        y -= Math.random() * 40 + 20;
        points.push({ x, y });
      }
      cracks.push({ points, opacity: 0.15 + Math.random() * 0.15 });
    }
  }

  function initSparks() {
    sparks.length = 0;
    for (let i = 0; i < 50; i++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        vx: (Math.random() - 0.5) * 2,
        vy: -(2 + Math.random() * 4),
        r: 1 + Math.random() * 3,
        life: Math.random() * 80,
        opacity: 0.4 + Math.random() * 0.5,
      });
    }
  }

  function initEmbers() {
    embers.length = 0;
    for (let i = 0; i < 40; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        vy: -(0.2 + Math.random() * 0.6),
        vx: (Math.random() - 0.5) * 0.5,
        opacity: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Dark volcanic base
    ctx.fillStyle = 'rgba(18, 10, 10, 0.55)';
    ctx.fillRect(0, 0, width, height);

    // Magma glow from below
    const glow = ctx.createLinearGradient(0, height, 0, height * 0.3);
    glow.addColorStop(0, 'rgba(220, 60, 20, 0.22)');
    glow.addColorStop(1, 'rgba(220, 60, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Cracks
    for (const c of cracks) {
      ctx.strokeStyle = `rgba(255, 90, 30, ${c.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c.points[0].x, c.points[0].y);
      for (let i = 1; i < c.points.length; i++) {
        ctx.lineTo(c.points[i].x, c.points[i].y);
      }
      ctx.stroke();
    }

    // Sparks
    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.life++;
      if (s.life > 100 || s.y < -20) {
        s.x = Math.random() * width;
        s.y = height + Math.random() * 50;
        s.vx = (Math.random() - 0.5) * 2;
        s.vy = -(2 + Math.random() * 4);
        s.life = 0;
      }
      ctx.fillStyle = `rgba(255, 160, 50, ${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Embers
    for (const e of embers) {
      e.y += e.vy;
      e.x += e.vx + Math.sin(frame * 0.01 + e.phase) * 0.3;
      if (e.y < -10) {
        e.y = height + 10;
        e.x = Math.random() * width;
      }
      const pulse = 0.6 + 0.4 * Math.sin(frame * 0.05 + e.phase);
      ctx.fillStyle = `rgba(255, 100, 40, ${e.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initCracks();
  initSparks();
  initEmbers();
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
