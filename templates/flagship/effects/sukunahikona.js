/**
 * SUKUNAHIKONA — Dwarf God of Sake and Medicine
 * Tiny bubbles, medicinal herbs, glowing droplets
 */

(function () {
  'use strict';

  const canvas = document.getElementById('sukunahikona-canvas');
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

  const herbs = [];
  const bubbles = [];
  const droplets = [];

  function initHerbs() {
    herbs.length = 0;
    const count = Math.min(35, Math.floor(width / 30));
    for (let i = 0; i < count; i++) {
      herbs.push({
        x: (i / count) * width + (Math.random() - 0.5) * 16,
        h: height * (0.15 + Math.random() * 0.2),
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        opacity: 0.15 + Math.random() * 0.2,
        hue: 80 + Math.random() * 60,
      });
    }
  }

  function initBubbles() {
    bubbles.length = 0;
    for (let i = 0; i < 60; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.3 + Math.random() * 0.7,
        opacity: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initDroplets() {
    droplets.length = 0;
    for (let i = 0; i < 30; i++) {
      droplets.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.5 + Math.random() * 2.5,
        vy: 0.4 + Math.random() * 0.8,
        opacity: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(20, 28, 22, 0.35)');
    grad.addColorStop(1, 'rgba(10, 18, 12, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Herbs
    for (const h of herbs) {
      const sway = Math.sin(frame * h.speed + h.phase) * 5;
      ctx.strokeStyle = `hsla(${h.hue}, 50%, 55%, ${h.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(h.x, height);
      ctx.quadraticCurveTo(h.x + sway * 0.5, height - h.h * 0.5, h.x + sway, height - h.h);
      ctx.stroke();
      ctx.fillStyle = `hsla(${h.hue}, 60%, 65%, ${h.opacity * 1.2})`;
      ctx.beginPath();
      ctx.ellipse(h.x + sway, height - h.h, 3, 5, sway * 0.03, 0, Math.PI * 2);
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
      ctx.strokeStyle = `rgba(200, 230, 210, ${b.opacity})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing droplets
    for (const d of droplets) {
      d.y += d.vy;
      d.x += Math.sin(frame * 0.01 + d.phase) * 0.3;
      if (d.y > height + 10) {
        d.y = -10;
        d.x = Math.random() * width;
      }
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3);
      g.addColorStop(0, `rgba(180, 240, 200, ${d.opacity})`);
      g.addColorStop(1, 'rgba(180, 240, 200, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initHerbs();
  initBubbles();
  initDroplets();
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
