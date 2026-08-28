/**
 * NINIGI — Grandson of the Sun, Rice Descent
 * Rice ears, sun disc, heavenly clouds
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ninigi-canvas');
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
  const clouds = [];
  const sunRays = [];

  function initRice() {
    rice.length = 0;
    const count = Math.min(55, Math.floor(width / 22));
    for (let i = 0; i < count; i++) {
      rice.push({
        x: (i / count) * width + (Math.random() - 0.5) * 12,
        h: height * (0.22 + Math.random() * 0.22),
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.008,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
  }

  function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.4,
        r: 40 + Math.random() * 80,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.04 + Math.random() * 0.06,
      });
    }
  }

  function initRays() {
    sunRays.length = 0;
    for (let i = 0; i < 24; i++) {
      sunRays.push({
        angle: (i / 24) * Math.PI * 2,
        length: 150 + Math.random() * 250,
        opacity: 0.06 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.003,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(35, 45, 70, 0.3)');
    grad.addColorStop(1, 'rgba(12, 18, 15, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const sunX = width * 0.75;
    const sunY = height * 0.2;

    // Sun rays
    ctx.save();
    ctx.translate(sunX, sunY);
    for (const r of sunRays) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * r.speed + r.phase);
      ctx.rotate(r.angle + frame * 0.0002);
      ctx.strokeStyle = `rgba(255, 220, 140, ${r.opacity * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r.length, 0);
      ctx.stroke();
      ctx.rotate(-r.angle - frame * 0.0002);
    }
    ctx.restore();

    // Sun core
    const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
    core.addColorStop(0, 'rgba(255, 230, 160, 0.25)');
    core.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    for (const c of clouds) {
      c.x += c.speed;
      if (c.x > width + c.r) c.x = -c.r;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(240, 245, 255, ${c.opacity})`);
      g.addColorStop(1, 'rgba(240, 245, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rice
    for (const r of rice) {
      const sway = Math.sin(frame * r.speed + r.phase) * 6;
      ctx.strokeStyle = `rgba(170, 165, 100, ${r.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x, height);
      ctx.quadraticCurveTo(r.x + sway * 0.5, height - r.h * 0.5, r.x + sway, height - r.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(200, 190, 115, ${r.opacity * 1.2})`;
      ctx.beginPath();
      ctx.ellipse(r.x + sway, height - r.h, 2.5, 6, sway * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initRice();
  initClouds();
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
