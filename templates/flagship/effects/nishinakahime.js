/**
 * NISHINAKAHIME — Water Princess
 * Gentle waves, pearls, moonlit water lilies
 */

(function () {
  'use strict';

  const canvas = document.getElementById('nishinakahime-canvas');
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

  const waves = [];
  const pearls = [];
  const lilies = [];

  function initWaves() {
    waves.length = 0;
    for (let i = 0; i < 8; i++) {
      waves.push({
        y: height * (0.45 + i * 0.06),
        amp: 10 + Math.random() * 20,
        freq: 0.003 + Math.random() * 0.003,
        speed: 0.008 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.06 - i * 0.005,
      });
    }
  }

  function initPearls() {
    pearls.length = 0;
    for (let i = 0; i < 25; i++) {
      pearls.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 4,
        opacity: 0.2 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  function initLilies() {
    lilies.length = 0;
    const count = Math.min(14, Math.floor(width / 90));
    for (let i = 0; i < count; i++) {
      lilies.push({
        x: Math.random() * width,
        y: height * 0.6 + Math.random() * height * 0.3,
        size: 12 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.004,
        opacity: 0.12 + Math.random() * 0.15,
      });
    }
  }

  function drawLily(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    const breathe = 1 + 0.04 * Math.sin(frame * l.speed + l.phase);
    ctx.scale(breathe, breathe);
    ctx.fillStyle = `rgba(200, 220, 240, ${l.opacity})`;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, -l.size * 0.5, l.size * 0.18, l.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(240, 250, 255, ${l.opacity * 0.8})`;
    ctx.beginPath();
    ctx.arc(0, 0, l.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(15, 25, 45, 0.35)');
    grad.addColorStop(1, 'rgba(8, 18, 35, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Moon reflection
    const moonX = width * 0.78;
    const moonY = height * 0.16;
    ctx.fillStyle = 'rgba(230, 240, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Waves
    for (const w of waves) {
      ctx.strokeStyle = `rgba(170, 200, 225, ${w.opacity})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = w.y + Math.sin(x * w.freq + frame * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Lilies
    for (const l of lilies) {
      drawLily(l);
    }

    // Pearls
    for (const p of pearls) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * p.speed + p.phase);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, `rgba(255, 255, 245, ${p.opacity * pulse})`);
      g.addColorStop(1, 'rgba(255, 255, 245, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initWaves();
  initPearls();
  initLilies();
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
