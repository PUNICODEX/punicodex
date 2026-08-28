/**
 * BENZAITEN — Goddess of Flow, Music, and Fortune
 * Flowing water waves, biwa strings, drifting musical notes
 */

(function () {
  'use strict';

  const canvas = document.getElementById('benzaiten-canvas');
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
  const strings = [];
  const notes = [];

  function initWaves() {
    waves.length = 0;
    for (let i = 0; i < 7; i++) {
      waves.push({
        y: height * (0.45 + i * 0.08),
        amp: 10 + Math.random() * 20,
        freq: 0.004 + Math.random() * 0.004,
        speed: 0.01 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 - i * 0.008,
      });
    }
  }

  function initStrings() {
    strings.length = 0;
    for (let i = 0; i < 6; i++) {
      strings.push({
        y: height * 0.18 + i * height * 0.1,
        amp: 3 + Math.random() * 5,
        freq: 0.02 + Math.random() * 0.02,
        speed: 0.03 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 + Math.random() * 0.1,
      });
    }
  }

  function initNotes() {
    notes.length = 0;
    const glyphs = ['♪', '♫', '♬', '♩'];
    for (let i = 0; i < 18; i++) {
      notes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        size: 10 + Math.random() * 14,
        speed: 0.3 + Math.random() * 0.6,
        sway: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.1 + Math.random() * 0.25,
        hue: 180 + Math.random() * 40,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Deep water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(20, 30, 50, 0.3)');
    grad.addColorStop(1, 'rgba(10, 25, 45, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Waves
    for (const w of waves) {
      ctx.strokeStyle = `rgba(160, 210, 230, ${w.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = w.y + Math.sin(x * w.freq + frame * w.speed + w.phase) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Biwa strings
    for (const s of strings) {
      ctx.strokeStyle = `rgba(220, 190, 140, ${s.opacity})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 6) {
        const y = s.y + Math.sin(x * s.freq + frame * s.speed + s.phase) * s.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Notes
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of notes) {
      n.y -= n.speed;
      n.x += Math.sin(frame * 0.005 + n.phase) * n.sway * 0.3;
      if (n.y < -20) {
        n.y = height + 20;
        n.x = Math.random() * width;
      }
      ctx.fillStyle = `hsla(${n.hue}, 70%, 75%, ${n.opacity})`;
      ctx.font = `${n.size}px serif`;
      ctx.fillText(n.glyph, n.x, n.y);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initWaves();
  initStrings();
  initNotes();
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
