/**
 * NAGOYA — Castle City
 * Castle silhouette, cherry blossoms, paper lanterns
 */

(function () {
  'use strict';

  const canvas = document.getElementById('nagoya-canvas');
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
  const lanterns = [];

  function initPetals() {
    petals.length = 0;
    const count = Math.min(65, Math.floor(width / 16));
    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 3 + Math.random() * 6,
        speed: 0.4 + Math.random() * 1,
        sway: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.2 + Math.random() * 0.45,
      });
    }
  }

  function initLanterns() {
    lanterns.length = 0;
    const count = Math.min(16, Math.floor(width / 80));
    for (let i = 0; i < count; i++) {
      lanterns.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 3,
        vy: -(0.15 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 0.3,
        opacity: 0.25 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawCastle() {
    const cx = width * 0.5;
    const baseY = height * 0.9;
    const w = Math.min(width * 0.35, height * 0.35);
    ctx.fillStyle = 'rgba(35, 38, 48, 0.55)';
    // base
    ctx.fillRect(cx - w * 0.6, baseY - w * 0.4, w * 1.2, w * 0.4);
    // middle
    ctx.fillRect(cx - w * 0.4, baseY - w * 0.75, w * 0.8, w * 0.35);
    // top
    ctx.fillRect(cx - w * 0.25, baseY - w * 1.15, w * 0.5, w * 0.4);

    // roofs
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.7, baseY - w * 0.4);
    ctx.lineTo(cx, baseY - w * 0.65);
    ctx.lineTo(cx + w * 0.7, baseY - w * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, baseY - w * 0.75);
    ctx.lineTo(cx, baseY - w * 0.98);
    ctx.lineTo(cx + w * 0.5, baseY - w * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.35, baseY - w * 1.15);
    ctx.lineTo(cx, baseY - w * 1.4);
    ctx.lineTo(cx + w * 0.35, baseY - w * 1.15);
    ctx.closePath();
    ctx.fill();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(30, 25, 45, 0.35)');
    grad.addColorStop(1, 'rgba(15, 15, 25, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    drawCastle();

    // Lanterns
    for (const l of lanterns) {
      l.y += l.vy;
      l.x += l.vx + Math.sin(frame * 0.005 + l.phase) * 0.2;
      if (l.y < -20) {
        l.y = height + 20;
        l.x = Math.random() * width;
      }
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 8);
      g.addColorStop(0, `rgba(255, 180, 80, ${l.opacity})`);
      g.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Petals
    for (const p of petals) {
      p.y += p.speed;
      p.x += Math.sin(frame * 0.004 + p.phase) * p.sway * 0.3;
      p.rotation += p.rotSpeed;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `rgba(255, 190, 210, ${p.opacity})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.6, -p.size * 0.5, p.size * 0.6, p.size * 0.5, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.25, p.size * 0.35, -p.size * 0.25, -p.size * 0.35, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initPetals();
  initLanterns();
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
