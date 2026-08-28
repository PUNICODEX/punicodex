/**
 * IZANAMI — Creation and Underworld Goddess
 * Wisteria cascades, pale funeral flames, shadow petals
 */

(function () {
  'use strict';

  const canvas = document.getElementById('izanami-canvas');
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

  const vines = [];
  const flames = [];
  const petals = [];

  function initVines() {
    vines.length = 0;
    const count = Math.min(9, Math.floor(width / 140));
    for (let i = 0; i < count; i++) {
      vines.push({
        x: width * (0.1 + i * 0.1),
        y: -20,
        len: height * (0.4 + Math.random() * 0.35),
        sway: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.008,
        opacity: 0.12 + Math.random() * 0.1,
      });
    }
  }

  function initFlames() {
    flames.length = 0;
    for (let i = 0; i < 30; i++) {
      flames.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 5,
        vy: -(0.2 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        opacity: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function initPetals() {
    petals.length = 0;
    const count = Math.min(55, Math.floor(width / 18));
    for (let i = 0; i < count; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 3 + Math.random() * 5,
        speed: 0.4 + Math.random() * 0.9,
        sway: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.15 + Math.random() * 0.35,
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(22, 18, 32, 0.45)');
    grad.addColorStop(1, 'rgba(12, 10, 20, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Vines with wisteria clusters
    for (const v of vines) {
      v.phase += v.speed;
      ctx.strokeStyle = `rgba(120, 90, 130, ${v.opacity})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      for (let y = 0; y < v.len; y += 8) {
        const x = v.x + Math.sin(y * 0.02 + v.phase) * v.sway * (y / v.len);
        ctx.lineTo(x, v.y + y);
      }
      ctx.stroke();

      // Flower clusters
      for (let y = v.len * 0.3; y < v.len; y += 18) {
        const x = v.x + Math.sin(y * 0.02 + v.phase) * v.sway * (y / v.len);
        ctx.fillStyle = `rgba(160, 120, 180, ${v.opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, v.y + y, 3 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
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
      ctx.fillStyle = `rgba(180, 140, 170, ${p.opacity})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Pale flames
    for (const f of flames) {
      f.y += f.vy;
      f.x += f.vx + Math.sin(frame * 0.01 + f.phase) * 0.2;
      if (f.y < -20) {
        f.y = height + 10;
        f.x = Math.random() * width;
      }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
      g.addColorStop(0, `rgba(160, 220, 255, ${f.opacity})`);
      g.addColorStop(1, 'rgba(100, 160, 220, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initVines();
  initFlames();
  initPetals();
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
