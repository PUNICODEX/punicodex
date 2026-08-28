/**
 * KANNON — Goddess of Compassion
 * Lotus blooms, water reflections, mercy light beams
 */

(function () {
  'use strict';

  const canvas = document.getElementById('kannon-canvas');
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

  const lotuses = [];
  const ripples = [];
  const rays = [];

  function initLotuses() {
    lotuses.length = 0;
    const count = Math.min(20, Math.floor(width / 60));
    for (let i = 0; i < count; i++) {
      lotuses.push({
        x: Math.random() * width,
        y: height * 0.6 + Math.random() * height * 0.35,
        size: 10 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.005,
        opacity: 0.15 + Math.random() * 0.2,
        hue: 280 + Math.random() * 40,
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
        maxR: 40 + Math.random() * 60,
        opacity: 0,
        phase: i * 80,
      });
    }
  }

  function initRays() {
    rays.length = 0;
    for (let i = 0; i < 10; i++) {
      rays.push({
        x: width * 0.5,
        y: -20,
        angle: Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        width: 30 + Math.random() * 60,
        opacity: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.004,
      });
    }
  }

  function drawLotus(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    const breathe = 1 + 0.05 * Math.sin(frame * l.speed + l.phase);
    ctx.scale(breathe, breathe);
    ctx.fillStyle = `hsla(${l.hue}, 60%, 70%, ${l.opacity})`;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, -l.size * 0.6, l.size * 0.25, l.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `hsla(${l.hue}, 70%, 50%, ${l.opacity * 1.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, l.size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(20, 22, 40, 0.35)');
    grad.addColorStop(1, 'rgba(8, 15, 30, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Mercy rays
    for (const r of rays) {
      const pulse = 0.7 + 0.3 * Math.sin(frame * r.speed + r.phase);
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      const g = ctx.createLinearGradient(0, 0, 0, height * 1.2);
      g.addColorStop(0, `rgba(255, 250, 220, ${r.opacity * pulse})`);
      g.addColorStop(1, 'rgba(255, 250, 220, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r.width / 2, 0, r.width, height * 1.2);
      ctx.restore();
    }

    // Ripples
    for (const r of ripples) {
      r.phase++;
      if (r.phase % 160 === 0) {
        r.r = 0;
        r.opacity = 0.25;
      }
      r.r += 0.4;
      r.opacity -= 0.002;
      if (r.opacity < 0) r.opacity = 0;
      ctx.strokeStyle = `rgba(180, 210, 230, ${r.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Lotuses
    for (const l of lotuses) {
      drawLotus(l);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initLotuses();
  initRipples();
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
