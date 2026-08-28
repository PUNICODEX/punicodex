/**
 * AMIDA — Amitābha Buddha
 * Golden lotus petals, mandala rings, boundless light
 */

(function () {
  'use strict';

  const canvas = document.getElementById('amida-canvas');
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

  const petals = [];
  const rings = [];
  const motes = [];

  function initPetals() {
    petals.length = 0;
    const count = Math.min(60, Math.floor(width / 18));
    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 4 + Math.random() * 8,
        speed: 0.3 + Math.random() * 0.8,
        sway: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        hue: 40 + Math.random() * 20,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }
  }

  function initRings() {
    rings.length = 0;
    for (let i = 0; i < 4; i++) {
      rings.push({
        r: 60 + i * 55,
        speed: 0.002 + i * 0.001,
        phase: i * Math.PI / 4,
        opacity: 0.06 - i * 0.01,
      });
    }
  }

  function initMotes() {
    motes.length = 0;
    const count = Math.min(70, Math.floor(width / 14));
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width * 0.5;
    const cy = height * 0.45;

    // Soft golden ambient
    const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
    ambient.addColorStop(0, 'rgba(255, 215, 120, 0.12)');
    ambient.addColorStop(0.5, 'rgba(255, 190, 80, 0.04)');
    ambient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, width, height);

    // Mandala rings
    ctx.save();
    ctx.translate(cx, cy);
    for (const r of rings) {
      ctx.rotate(frame * r.speed + r.phase);
      ctx.strokeStyle = `rgba(212, 175, 55, ${r.opacity})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let j = 0; j < 8; j++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = `rgba(255, 220, 140, ${r.opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(r.r, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.rotate(-(frame * r.speed + r.phase));
    }
    ctx.restore();

    // Petals
    for (const p of petals) {
      p.y += p.speed;
      p.x += Math.sin(frame * 0.003 + p.phase) * p.sway * 0.3;
      p.rotation += p.rotSpeed;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.5, p.size * 0.6, p.size * 0.5, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.3, p.size * 0.4, -p.size * 0.3, -p.size * 0.4, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }

    // Light motes
    for (const m of motes) {
      m.y -= m.speed;
      m.x += Math.sin(frame * 0.004 + m.phase) * 0.3;
      if (m.y < -10) {
        m.y = height + 10;
        m.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 240, 190, ${m.opacity})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initPetals();
  initRings();
  initMotes();
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
