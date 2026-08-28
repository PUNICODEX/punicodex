/**
 * HACHIMAN — God of War, Archery, and Doves
 * Flying arrows, banner streamers, peaceful doves
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hachiman-canvas');
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

  const arrows = [];
  const banners = [];
  const doves = [];

  function initArrows() {
    arrows.length = 0;
    const count = Math.min(18, Math.floor(width / 70));
    for (let i = 0; i < count; i++) {
      arrows.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 40 + Math.random() * 50,
        speed: 2 + Math.random() * 3,
        angle: -Math.PI / 6 + (Math.random() - 0.5) * 0.3,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }
  }

  function initBanners() {
    banners.length = 0;
    for (let i = 0; i < 5; i++) {
      banners.push({
        x: width * (0.15 + i * 0.18),
        y: -20 - Math.random() * 80,
        len: 80 + Math.random() * 60,
        width: 12 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.02,
        opacity: 0.1 + Math.random() * 0.15,
        hue: 0 + Math.random() * 20,
      });
    }
  }

  function initDoves() {
    doves.length = 0;
    const count = Math.min(10, Math.floor(width / 120));
    for (let i = 0; i < count; i++) {
      doves.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 6 + Math.random() * 8,
        speed: 0.5 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
  }

  function drawDove(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.strokeStyle = `rgba(240, 240, 230, ${d.opacity})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-d.size, 0);
    ctx.quadraticCurveTo(-d.size * 0.3, -d.size * 0.8, 0, 0);
    ctx.quadraticCurveTo(d.size * 0.3, -d.size * 0.8, d.size, 0);
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(18, 16, 18, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // Banners
    for (const b of banners) {
      b.phase += b.speed;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = `hsla(${b.hue}, 60%, 45%, ${b.opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y < b.len; y += 4) {
        const wave = Math.sin(y * 0.05 + b.phase) * 6;
        ctx.lineTo(wave, y);
      }
      ctx.lineTo(0, b.len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Arrows
    for (const a of arrows) {
      a.x += Math.cos(a.angle) * a.speed;
      a.y += Math.sin(a.angle) * a.speed;
      if (a.x > width + a.len || a.y < -a.len) {
        a.x = -a.len;
        a.y = Math.random() * height;
      }
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.strokeStyle = `rgba(220, 200, 160, ${a.opacity})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.5, 0);
      ctx.stroke();
      ctx.fillStyle = `rgba(180, 60, 40, ${a.opacity})`;
      ctx.beginPath();
      ctx.moveTo(a.len * 0.5, 0);
      ctx.lineTo(a.len * 0.35, -3);
      ctx.lineTo(a.len * 0.35, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Doves
    for (const d of doves) {
      d.x += d.speed;
      d.y += Math.sin(frame * 0.03 + d.phase) * 0.4;
      if (d.x > width + 30) {
        d.x = -30;
        d.y = Math.random() * height;
      }
      drawDove(d);
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initArrows();
  initBanners();
  initDoves();
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
