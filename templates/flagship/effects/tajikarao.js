/**
 * TAJIKARAO — Strength God
 * Cracking boulders, energy fissures, rising strength aura
 */

(function () {
  'use strict';

  const canvas = document.getElementById('tajikarao-canvas');
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

  const rocks = [];
  const cracks = [];
  const aura = [];

  function initRocks() {
    rocks.length = 0;
    const count = Math.min(12, Math.floor(width / 100));
    for (let i = 0; i < count; i++) {
      rocks.push({
        x: Math.random() * width,
        y: height * 0.5 + Math.random() * height * 0.5,
        r: 30 + Math.random() * 60,
        opacity: 0.1 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initCracks() {
    cracks.length = 0;
    for (let i = 0; i < 6; i++) {
      const points = [];
      let x = Math.random() * width;
      let y = Math.random() * height;
      for (let j = 0; j < 8; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        points.push({ x, y });
      }
      cracks.push({ points, opacity: 0.1 + Math.random() * 0.1 });
    }
  }

  function initAura() {
    aura.length = 0;
    for (let i = 0; i < 40; i++) {
      aura.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        r: 1.5 + Math.random() * 3,
        vy: 1 + Math.random() * 2.5,
        opacity: 0.15 + Math.random() * 0.3,
        hue: 30 + Math.random() * 30,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(25, 20, 18, 0.4)');
    grad.addColorStop(1, 'rgba(12, 10, 8, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Rocks
    for (const r of rocks) {
      const float = Math.sin(frame * 0.01 + r.phase) * 3;
      ctx.fillStyle = `rgba(60, 58, 55, ${r.opacity})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y + float, r.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cracks
    for (const c of cracks) {
      ctx.strokeStyle = `rgba(255, 140, 60, ${c.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.points[0].x, c.points[0].y);
      for (let i = 1; i < c.points.length; i++) {
        ctx.lineTo(c.points[i].x, c.points[i].y);
      }
      ctx.stroke();
    }

    // Energy aura
    for (const a of aura) {
      a.y -= a.vy;
      if (a.y < -20) {
        a.y = height + 20;
        a.x = Math.random() * width;
      }
      const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 4);
      g.addColorStop(0, `hsla(${a.hue}, 90%, 60%, ${a.opacity})`);
      g.addColorStop(1, `hsla(${a.hue}, 90%, 60%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initRocks();
  initCracks();
  initAura();
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
