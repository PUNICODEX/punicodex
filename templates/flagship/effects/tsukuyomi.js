/**
 * TSUKUYOMI — Moon God
 * Lunar phases, moonlight rays, silver stars, night water
 */

(function () {
  'use strict';

  const canvas = document.getElementById('tsukuyomi-canvas');
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

  const stars = [];
  const rays = [];
  const ripples = [];

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        r: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  function initRays() {
    rays.length = 0;
    for (let i = 0; i < 16; i++) {
      rays.push({
        angle: (i / 16) * Math.PI * 2,
        length: 120 + Math.random() * 280,
        opacity: 0.05 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.003,
      });
    }
  }

  function initRipples() {
    ripples.length = 0;
    for (let i = 0; i < 8; i++) {
      ripples.push({
        x: Math.random() * width,
        y: height * 0.7 + Math.random() * height * 0.25,
        r: 0,
        maxR: 50 + Math.random() * 80,
        opacity: 0,
        phase: i * 70,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(12, 16, 35, 0.45)');
    grad.addColorStop(1, 'rgba(5, 10, 22, 0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const moonX = width * 0.75;
    const moonY = height * 0.22;

    // Moon rays
    ctx.save();
    ctx.translate(moonX, moonY);
    for (const r of rays) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * r.speed + r.phase);
      ctx.rotate(r.angle + frame * 0.00015);
      ctx.strokeStyle = `rgba(220, 230, 255, ${r.opacity * pulse})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r.length, 0);
      ctx.stroke();
      ctx.rotate(-r.angle - frame * 0.00015);
    }
    ctx.restore();

    // Moon
    ctx.fillStyle = 'rgba(230, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(moonX + 16, moonY - 4, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Stars
    for (const s of stars) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * s.speed + s.phase);
      ctx.fillStyle = `rgba(230, 240, 255, ${s.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ripples
    for (const r of ripples) {
      r.phase++;
      if (r.phase % 180 === 0) {
        r.r = 0;
        r.opacity = 0.2;
      }
      r.r += 0.35;
      r.opacity -= 0.0015;
      if (r.opacity < 0) r.opacity = 0;
      ctx.strokeStyle = `rgba(200, 220, 245, ${r.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initStars();
  initRays();
  initRipples();
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
