/**
 * OMONONUSHI — Great Mountain Deity
 * Coiled serpent paths, mountain mist, torii markers
 */

(function () {
  'use strict';

  const canvas = document.getElementById('omononushi-canvas');
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

  const serpents = [];
  const mist = [];
  const torii = [];

  function initSerpents() {
    serpents.length = 0;
    for (let i = 0; i < 4; i++) {
      serpents.push({
        yBase: height * (0.35 + i * 0.18),
        amp: 30 + Math.random() * 40,
        freq: 0.003 + Math.random() * 0.002,
        speed: 0.005 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 + Math.random() * 0.08,
        segments: 60,
      });
    }
  }

  function initMist() {
    mist.length = 0;
    for (let i = 0; i < 7; i++) {
      mist.push({
        x: Math.random() * width,
        y: height * 0.3 + Math.random() * height * 0.5,
        r: 80 + Math.random() * 130,
        speed: 0.12 + Math.random() * 0.2,
        opacity: 0.04 + Math.random() * 0.04,
      });
    }
  }

  function initTorii() {
    torii.length = 0;
    for (let i = 0; i < 4; i++) {
      torii.push({
        x: width * (0.2 + i * 0.2),
        y: height * 0.55 + i * 30,
        size: 25 + i * 8,
        opacity: 0.1 - i * 0.015,
      });
    }
  }

  function drawTorii(t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.strokeStyle = `rgba(190, 55, 35, ${t.opacity})`;
    ctx.lineWidth = 2.5;
    const s = t.size;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.35, -s);
    ctx.moveTo(s * 0.35, 0);
    ctx.lineTo(s * 0.35, -s);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.82);
    ctx.lineTo(s * 0.55, -s * 0.82);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.95);
    ctx.lineTo(s * 0.45, -s * 0.95);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(18, 25, 28, 0.4)');
    grad.addColorStop(1, 'rgba(8, 16, 14, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Mist
    for (const m of mist) {
      m.x += m.speed;
      if (m.x > width + m.r) m.x = -m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(200, 215, 215, ${m.opacity})`);
      g.addColorStop(1, 'rgba(200, 215, 215, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Serpents
    for (const s of serpents) {
      s.phase += s.speed;
      ctx.strokeStyle = `rgba(160, 190, 170, ${s.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= s.segments; i++) {
        const x = (i / s.segments) * width;
        const y = s.yBase + Math.sin(x * s.freq + s.phase) * s.amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Torii
    for (const t of torii) {
      drawTorii(t);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initSerpents();
  initMist();
  initTorii();
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
