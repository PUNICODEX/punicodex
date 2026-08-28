/**
 * SHIKOKU — Pilgrimage Island
 * Temple markers, mountain paths, surrounding sea
 */

(function () {
  'use strict';

  const canvas = document.getElementById('shikoku-canvas');
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

  const paths = [];
  const markers = [];
  const waves = [];

  function initPaths() {
    paths.length = 0;
    for (let i = 0; i < 4; i++) {
      const points = [];
      let x = Math.random() * width;
      let y = height + 10;
      while (y > -10) {
        x += (Math.random() - 0.5) * 80;
        y -= Math.random() * 50 + 30;
        points.push({ x, y });
      }
      paths.push({ points, opacity: 0.08 + Math.random() * 0.06 });
    }
  }

  function initMarkers() {
    markers.length = 0;
    const count = Math.min(20, Math.floor(width / 60));
    for (let i = 0; i < count; i++) {
      markers.push({
        x: Math.random() * width,
        y: height * 0.25 + Math.random() * height * 0.65,
        size: 3 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initWaves() {
    waves.length = 0;
    for (let i = 0; i < 5; i++) {
      waves.push({
        y: Math.random() * height,
        amp: 8 + Math.random() * 14,
        freq: 0.004 + Math.random() * 0.003,
        speed: 0.01 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.06 + Math.random() * 0.05,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(22, 30, 40, 0.35)');
    grad.addColorStop(1, 'rgba(10, 18, 25, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Pilgrimage paths
    for (const p of paths) {
      ctx.strokeStyle = `rgba(210, 200, 170, ${p.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Temple markers
    for (const m of markers) {
      const pulse = 0.7 + 0.3 * Math.sin(frame * 0.02 + m.phase);
      ctx.fillStyle = `rgba(220, 190, 120, ${m.opacity * pulse})`;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - m.size * 2);
      ctx.lineTo(m.x + m.size, m.y);
      ctx.lineTo(m.x - m.size, m.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(220, 190, 120, ${m.opacity * pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sea waves
    for (const w of waves) {
      ctx.strokeStyle = `rgba(160, 190, 210, ${w.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = w.y + Math.sin(x * w.freq + frame * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initPaths();
  initMarkers();
  initWaves();
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
