/**
 * MARISHITEN — Warrior Goddess of the Sun and Stars
 * Spinning sun wheels, flight of arrows, stellar mandala
 */

(function () {
  'use strict';

  const canvas = document.getElementById('marishiten-canvas');
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

  const wheels = [];
  const arrows = [];
  const stars = [];

  function initWheels() {
    wheels.length = 0;
    for (let i = 0; i < 5; i++) {
      wheels.push({
        x: width * (0.2 + i * 0.15),
        y: height * (0.2 + (i % 2) * 0.45),
        r: 25 + Math.random() * 20,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.1,
      });
    }
  }

  function initArrows() {
    arrows.length = 0;
    const count = Math.min(24, Math.floor(width / 50));
    for (let i = 0; i < count; i++) {
      arrows.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 30 + Math.random() * 40,
        angle: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.12,
      });
    }
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.4,
        opacity: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  function drawWheel(w) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.phase);
    ctx.strokeStyle = `rgba(220, 180, 80, ${w.opacity})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, w.r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w.r, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w.r * 0.7, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 180, 80, ${w.opacity * 0.7})`;
      ctx.fill();
    }
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(12, 12, 18, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Stars
    for (const s of stars) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * s.speed + s.phase);
      ctx.fillStyle = `rgba(240, 240, 220, ${s.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wheels
    for (const w of wheels) {
      w.phase += w.speed;
      drawWheel(w);
    }

    // Arrows
    for (const a of arrows) {
      a.x += Math.cos(a.angle) * a.speed;
      a.y += Math.sin(a.angle) * a.speed;
      if (a.x > width + a.len) a.x = -a.len;
      if (a.x < -a.len) a.x = width + a.len;
      if (a.y > height + a.len) a.y = -a.len;
      if (a.y < -a.len) a.y = height + a.len;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.strokeStyle = `rgba(220, 200, 160, ${a.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.5, 0);
      ctx.stroke();
      ctx.fillStyle = `rgba(180, 60, 40, ${a.opacity})`;
      ctx.beginPath();
      ctx.moveTo(a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.35, -2);
      ctx.lineTo(a.len * 0.35, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initWheels();
  initArrows();
  initStars();
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
