/**
 * GOSHIN — Five Guardian Elements
 * Protective pentagrams, elemental sparks, sacred geometry
 */

(function () {
  'use strict';

  const canvas = document.getElementById('goshin-canvas');
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

  const elements = [
    { name: 'wood', hue: 120 },
    { name: 'fire', hue: 10 },
    { name: 'earth', hue: 35 },
    { name: 'metal', hue: 50 },
    { name: 'water', hue: 200 },
  ];
  const sigils = [];
  const sparks = [];

  function initSigils() {
    sigils.length = 0;
    for (let i = 0; i < 5; i++) {
      sigils.push({
        x: width * (0.2 + i * 0.15),
        y: height * (0.25 + (i % 2) * 0.45),
        r: 28 + Math.random() * 16,
        speed: 0.003 + Math.random() * 0.003,
        phase: i * Math.PI * 2 / 5,
        hue: elements[i].hue,
        opacity: 0.12 + Math.random() * 0.08,
      });
    }
  }

  function initSparks() {
    sparks.length = 0;
    for (let i = 0; i < 60; i++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 0.8 + Math.random() * 1.8,
        hue: elements[Math.floor(Math.random() * 5)].hue,
        opacity: 0.15 + Math.random() * 0.3,
        life: Math.random() * 200,
      });
    }
  }

  function drawPentagram(x, y, r, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Dark protective field
    ctx.fillStyle = 'rgba(12, 15, 22, 0.45)';
    ctx.fillRect(0, 0, width, height);

    for (const s of sigils) {
      s.phase += s.speed;
      const rot = s.phase;
      ctx.strokeStyle = `hsla(${s.hue}, 70%, 60%, ${s.opacity})`;
      ctx.lineWidth = 1.2;
      drawPentagram(s.x, s.y, s.r, rot);

      // Outer ring
      ctx.strokeStyle = `hsla(${s.hue}, 60%, 55%, ${s.opacity * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Connecting field lines
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.04)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i < sigils.length; i++) {
      const a = sigils[i];
      const b = sigils[(i + 2) % sigils.length];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    // Sparks
    for (const p of sparks) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        p.vx = (Math.random() - 0.5) * 0.6;
        p.vy = (Math.random() - 0.5) * 0.6;
        p.life = 200 + Math.random() * 200;
      }
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initSigils();
  initSparks();
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
