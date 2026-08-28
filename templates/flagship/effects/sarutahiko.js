/**
 * SARUTAHIKO — Earthly God of the Crossroads
 * Monkey spirits, torii path, earthy amber particles
 */

(function () {
  'use strict';

  const canvas = document.getElementById('sarutahiko-canvas');
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

  const torii = [];
  const monkeys = [];
  const dust = [];

  function initTorii() {
    torii.length = 0;
    for (let i = 0; i < 5; i++) {
      torii.push({
        x: width * (0.15 + i * 0.17),
        y: height * 0.5 + i * 35,
        size: 35 + i * 10,
        opacity: 0.14 - i * 0.02,
      });
    }
  }

  function initMonkeys() {
    monkeys.length = 0;
    const count = Math.min(12, Math.floor(width / 100));
    for (let i = 0; i < count; i++) {
      monkeys.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 8 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.4,
        opacity: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initDust() {
    dust.length = 0;
    for (let i = 0; i < 50; i++) {
      dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: 0.1 + Math.random() * 0.25,
      });
    }
  }

  function drawTorii(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = `rgba(200, 60, 35, ${t.opacity})`;
    ctx.lineWidth = 3;
    const s = t.size;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.35, -s * 1.1);
    ctx.moveTo(s * 0.35, 0);
    ctx.lineTo(s * 0.35, -s * 1.1);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.9);
    ctx.lineTo(s * 0.6, -s * 0.9);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 1.05);
    ctx.lineTo(s * 0.5, -s * 1.05);
    ctx.stroke();
    ctx.restore();
  }

  function drawMonkey(m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = `rgba(180, 150, 110, ${m.opacity})`;
    // body
    ctx.beginPath();
    ctx.ellipse(0, 0, m.size, m.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.arc(0, -m.size * 0.8, m.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // tail
    ctx.strokeStyle = `rgba(180, 150, 110, ${m.opacity})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(m.size * 0.7, 0);
    ctx.quadraticCurveTo(m.size * 1.4, m.size * 0.5, m.size * 1.2, -m.size * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(30, 25, 20, 0.35)');
    grad.addColorStop(1, 'rgba(15, 12, 8, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dust
    for (const d of dust) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = width;
      if (d.x > width) d.x = 0;
      if (d.y < 0) d.y = height;
      if (d.y > height) d.y = 0;
      ctx.fillStyle = `rgba(220, 200, 160, ${d.opacity})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torii path
    for (const t of torii) {
      drawTorii(t);
    }

    // Monkeys
    for (const m of monkeys) {
      m.x += m.vx;
      m.y += m.vy + Math.sin(frame * 0.02 + m.phase) * 0.2;
      if (m.x > width + 30) m.x = -30;
      if (m.x < -30) m.x = width + 30;
      if (m.y > height + 20) m.y = -20;
      if (m.y < -20) m.y = height + 20;
      drawMonkey(m);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initTorii();
  initMonkeys();
  initDust();
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
