/**
 * AMATERASU — Sun Goddess
 * Golden solar rays, mirror-light particles, celestial radiance
 */

(function () {
  'use strict';

  const canvas = document.getElementById('amaterasu-canvas');
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

  const sun = { x: width * 0.72, y: height * 0.32 };
  const rays = [];
  const particles = [];
  const flares = [];

  function initRays() {
    rays.length = 0;
    for (let i = 0; i < 48; i++) {
      rays.push({
        angle: (i / 48) * Math.PI * 2,
        length: 180 + Math.random() * 260,
        width: 0.5 + Math.random() * 2,
        speed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.05 + Math.random() * 0.12,
      });
    }
  }

  function initParticles() {
    particles.length = 0;
    const count = Math.min(80, Math.floor(width / 16));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.1 + Math.random() * 0.4,
      });
    }
  }

  function spawnFlare() {
    if (Math.random() > 0.015) return;
    flares.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 20 + Math.random() * 60,
      opacity: 0,
      target: 0.1 + Math.random() * 0.2,
      life: 0,
      maxLife: 120 + Math.random() * 120,
      state: 'in',
    });
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    sun.x = width * 0.72;
    sun.y = height * 0.32;

    // Warm ambient glow
    const glow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, Math.max(width, height) * 0.65);
    glow.addColorStop(0, 'rgba(255, 220, 150, 0.14)');
    glow.addColorStop(0.4, 'rgba(255, 180, 80, 0.05)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Rotating rays
    ctx.save();
    ctx.translate(sun.x, sun.y);
    for (const r of rays) {
      const pulse = 0.6 + 0.4 * Math.sin(frame * r.speed + r.phase);
      ctx.rotate(r.angle + frame * 0.0002);
      ctx.strokeStyle = `rgba(255, 215, 120, ${r.opacity * pulse})`;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r.length, 0);
      ctx.stroke();
      ctx.rotate(-r.angle - frame * 0.0002);
    }
    ctx.restore();

    // Sun core
    const core = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 120);
    core.addColorStop(0, 'rgba(255, 245, 220, 0.35)');
    core.addColorStop(0.5, 'rgba(255, 210, 100, 0.12)');
    core.addColorStop(1, 'rgba(255, 160, 40, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 120, 0, Math.PI * 2);
    ctx.fill();

    // Particles
    for (const p of particles) {
      p.y -= p.speed;
      p.x += Math.sin(frame * 0.005 + p.phase) * 0.3;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 230, 160, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flares
    spawnFlare();
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i];
      f.life++;
      if (f.state === 'in') {
        f.opacity += 0.006;
        if (f.opacity >= f.target) f.state = 'active';
      } else if (f.state === 'active' && f.life > f.maxLife) {
        f.state = 'out';
      } else if (f.state === 'out') {
        f.opacity -= 0.006;
        if (f.opacity <= 0) {
          flares.splice(i, 1);
          continue;
        }
      }
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255, 220, 140, ${f.opacity})`);
      g.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initRays();
  initParticles();
  draw();

  /* Standard interactions */
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
