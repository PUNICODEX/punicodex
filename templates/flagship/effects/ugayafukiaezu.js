/**
 * UGAYAFUKIAEZU — Deity of Sea and Waves
 * Ocean currents, shells, seaweed, deep water glow
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ugayafukiaezu-canvas');
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

  const currents = [];
  const shells = [];
  const seaweed = [];

  function initCurrents() {
    currents.length = 0;
    for (let i = 0; i < 9; i++) {
      currents.push({
        y: height * (0.2 + i * 0.08),
        amp: 15 + Math.random() * 25,
        freq: 0.002 + Math.random() * 0.003,
        speed: 0.008 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.05 - i * 0.003,
      });
    }
  }

  function initShells() {
    shells.length = 0;
    for (let i = 0; i < 20; i++) {
      shells.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 10,
        opacity: 0.12 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        hue: 30 + Math.random() * 30,
      });
    }
  }

  function initSeaweed() {
    seaweed.length = 0;
    const count = Math.min(30, Math.floor(width / 40));
    for (let i = 0; i < count; i++) {
      seaweed.push({
        x: (i / count) * width + (Math.random() - 0.5) * 20,
        h: height * (0.2 + Math.random() * 0.25),
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.01,
        opacity: 0.12 + Math.random() * 0.18,
      });
    }
  }

  function drawShell(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = `hsla(${s.hue}, 50%, 75%, ${s.opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, s.size, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `hsla(${s.hue}, 50%, 65%, ${s.opacity * 1.2})`;
    ctx.lineWidth = 0.6;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s.size + (i * s.size * 2) / 5, -s.size * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(15, 30, 50, 0.35)');
    grad.addColorStop(1, 'rgba(5, 18, 35, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Currents
    for (const c of currents) {
      ctx.strokeStyle = `rgba(140, 190, 220, ${c.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = c.y + Math.sin(x * c.freq + frame * c.speed + c.phase) * c.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Seaweed
    for (const s of seaweed) {
      const sway = Math.sin(frame * s.speed + s.phase) * 8;
      ctx.strokeStyle = `rgba(80, 150, 120, ${s.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, height);
      ctx.quadraticCurveTo(s.x + sway * 0.5, height - s.h * 0.5, s.x + sway, height - s.h);
      ctx.stroke();
      ctx.fillStyle = `rgba(100, 180, 140, ${s.opacity * 0.8})`;
      ctx.beginPath();
      ctx.ellipse(s.x + sway, height - s.h, 2, 5, sway * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shells
    for (const s of shells) {
      const float = Math.sin(frame * 0.01 + s.phase) * 2;
      s.y += float * 0.05;
      drawShell({ ...s, y: s.y + float });
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initCurrents();
  initShells();
  initSeaweed();
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
