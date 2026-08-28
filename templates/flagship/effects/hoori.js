/**
 * HOORI — Rice-Field and Hunting Prince
 * Swaying rice stalks, crescent moon, silver arrows
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hoori-canvas');
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

  const stalks = [];
  const arrows = [];
  const fireflies = [];

  function initStalks() {
    stalks.length = 0;
    const count = Math.min(60, Math.floor(width / 18));
    for (let i = 0; i < count; i++) {
      stalks.push({
        x: (i / count) * width + (Math.random() - 0.5) * 10,
        h: height * (0.35 + Math.random() * 0.25),
        lean: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.015,
        opacity: 0.2 + Math.random() * 0.25,
      });
    }
  }

  function initArrows() {
    arrows.length = 0;
    const count = Math.min(8, Math.floor(width / 160));
    for (let i = 0; i < count; i++) {
      arrows.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        len: 50 + Math.random() * 40,
        angle: -Math.PI / 4 + (Math.random() - 0.5) * 0.4,
        speed: 1.5 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.15,
      });
    }
  }

  function initFireflies() {
    fireflies.length = 0;
    for (let i = 0; i < 30; i++) {
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        opacity: 0.15 + Math.random() * 0.3,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(15, 25, 45, 0.35)');
    grad.addColorStop(1, 'rgba(8, 18, 12, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Crescent moon
    const moonX = width * 0.82;
    const moonY = height * 0.18;
    ctx.save();
    ctx.translate(moonX, moonY);
    ctx.fillStyle = 'rgba(240, 240, 220, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(12, -5, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // Rice stalks
    for (const s of stalks) {
      const sway = Math.sin(frame * s.speed + s.phase) * s.lean;
      ctx.strokeStyle = `rgba(170, 190, 130, ${s.opacity})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s.x, height);
      ctx.quadraticCurveTo(s.x + sway * 0.5, height - s.h * 0.5, s.x + sway, height - s.h);
      ctx.stroke();

      // Grain head
      ctx.fillStyle = `rgba(210, 200, 130, ${s.opacity * 1.2})`;
      ctx.beginPath();
      ctx.ellipse(s.x + sway, height - s.h, 3, 8, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arrows
    for (const a of arrows) {
      a.x += Math.cos(a.angle) * a.speed;
      a.y += Math.sin(a.angle) * a.speed;
      if (a.x > width + a.len || a.y < -a.len) {
        a.x = -a.len;
        a.y = Math.random() * height * 0.6;
      }
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.strokeStyle = `rgba(220, 220, 230, ${a.opacity})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.5, 0);
      ctx.stroke();
      ctx.fillStyle = `rgba(220, 220, 230, ${a.opacity})`;
      ctx.beginPath();
      ctx.moveTo(a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.35, -2);
      ctx.lineTo(a.len * 0.35, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Fireflies
    for (const f of fireflies) {
      const pulse = 0.5 + 0.5 * Math.sin(frame * f.speed + f.phase);
      ctx.fillStyle = `rgba(220, 240, 150, ${f.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initStalks();
  initArrows();
  initFireflies();
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
