/**
 * ISE — The Grand Shrine
 * Sacred forest light, torii gates, shimenawa rope coils
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ise-canvas');
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

  const trees = [];
  const torii = [];
  const lightRays = [];

  function initTrees() {
    trees.length = 0;
    const count = Math.min(28, Math.floor(width / 45));
    for (let i = 0; i < count; i++) {
      trees.push({
        x: Math.random() * width,
        y: height * 0.25 + Math.random() * height * 0.75,
        w: 4 + Math.random() * 8,
        h: 80 + Math.random() * 160,
        opacity: 0.08 + Math.random() * 0.12,
      });
    }
  }

  function initTorii() {
    torii.length = 0;
    for (let i = 0; i < 3; i++) {
      torii.push({
        x: width * (0.25 + i * 0.25),
        y: height * 0.65 + i * 30,
        size: 45 + i * 15,
        opacity: 0.14 - i * 0.02,
      });
    }
  }

  function initRays() {
    lightRays.length = 0;
    for (let i = 0; i < 12; i++) {
      lightRays.push({
        x: Math.random() * width,
        angle: Math.PI / 3 + (Math.random() - 0.5) * 0.4,
        width: 20 + Math.random() * 50,
        opacity: 0.04 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.005,
      });
    }
  }

  function drawTorii(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = `rgba(190, 55, 35, ${t.opacity})`;
    ctx.lineWidth = 4;
    const s = t.size;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.35, -s * 1.2);
    ctx.moveTo(s * 0.35, 0);
    ctx.lineTo(s * 0.35, -s * 1.2);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s);
    ctx.lineTo(s * 0.6, -s);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 1.15);
    ctx.lineTo(s * 0.5, -s * 1.15);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(20, 35, 25, 0.4)');
    grad.addColorStop(1, 'rgba(8, 16, 12, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Light rays
    for (const r of lightRays) {
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

    // Trees
    for (const t of trees) {
      ctx.fillStyle = `rgba(15, 28, 18, ${t.opacity})`;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - t.w * 0.4, t.y - t.h);
      ctx.lineTo(t.x + t.w * 0.4, t.y - t.h);
      ctx.closePath();
      ctx.fill();
    }

    // Torii
    for (const t of torii) {
      drawTorii(t);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initTrees();
  initTorii();
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
