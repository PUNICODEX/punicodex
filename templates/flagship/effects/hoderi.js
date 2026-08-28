/**
 * HODERI — Fire-Fishing Prince
 * Hooked fishing lines, sea flames, burning foam
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hoderi-canvas');
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

  const hooks = [];
  const flames = [];
  const foam = [];

  function initHooks() {
    hooks.length = 0;
    const count = Math.min(10, Math.floor(width / 120));
    for (let i = 0; i < count; i++) {
      hooks.push({
        x: width * (0.1 + i * 0.09),
        y: -20 - Math.random() * 60,
        len: 80 + Math.random() * 120,
        sway: 5 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.015,
        opacity: 0.12 + Math.random() * 0.1,
      });
    }
  }

  function initFlames() {
    flames.length = 0;
    for (let i = 0; i < 40; i++) {
      flames.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 5,
        vy: -(0.3 + Math.random() * 0.8),
        vx: (Math.random() - 0.5) * 0.6,
        opacity: 0.15 + Math.random() * 0.35,
        hue: 10 + Math.random() * 35,
        life: Math.random() * 120,
      });
    }
  }

  function initFoam() {
    foam.length = 0;
    for (let i = 0; i < 50; i++) {
      foam.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 2.2,
        speed: 0.2 + Math.random() * 0.5,
        opacity: 0.08 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(25, 15, 15, 0.4)');
    grad.addColorStop(1, 'rgba(10, 20, 35, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Hooks and lines
    for (const h of hooks) {
      h.phase += h.speed;
      const tipX = h.x + Math.sin(h.phase) * h.sway;
      const tipY = h.len;
      ctx.strokeStyle = `rgba(200, 200, 190, ${h.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.quadraticCurveTo(h.x - h.sway * 0.5, h.len * 0.5, tipX, tipY);
      ctx.stroke();

      // Hook
      ctx.strokeStyle = `rgba(180, 160, 120, ${h.opacity * 1.5})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(tipX + 4, tipY, 5, 0, Math.PI, false);
      ctx.stroke();
    }

    // Foam
    for (const f of foam) {
      f.y -= f.speed;
      f.x += Math.sin(frame * 0.01 + f.phase) * 0.3;
      if (f.y < -10) {
        f.y = height + 10;
        f.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(220, 235, 245, ${f.opacity})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flames
    for (const fl of flames) {
      fl.y += fl.vy;
      fl.x += fl.vx;
      fl.life++;
      const flicker = 0.6 + 0.4 * Math.sin(fl.life * 0.1);
      if (fl.y < -20 || fl.life > 180) {
        fl.y = height + 10;
        fl.x = Math.random() * width;
        fl.life = 0;
      }
      ctx.fillStyle = `hsla(${fl.hue}, 90%, 60%, ${fl.opacity * flicker})`;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initHooks();
  initFlames();
  initFoam();
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
