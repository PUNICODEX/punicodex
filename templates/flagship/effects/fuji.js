/**
 * FUJI — Sacred Mountain
 * Snow-capped peak, falling sakura, rising mist
 */

(function () {
  'use strict';

  const canvas = document.getElementById('fuji-canvas');
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
  const mist = [];

  function initPetals() {
    petals.length = 0;
    const count = Math.min(70, Math.floor(width / 15));
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
        opacity: 0.25 + Math.random() * 0.45,
      });
    }
  }

  function initMist() {
    mist.length = 0;
    for (let i = 0; i < 6; i++) {
      mist.push({
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * height * 0.4,
        r: 80 + Math.random() * 120,
        speed: 0.1 + Math.random() * 0.25,
        opacity: 0.03 + Math.random() * 0.04,
      });
    }
  }

  function drawMountain() {
    const baseX = width * 0.5;
    const baseY = height * 0.92;
    const peakY = height * 0.32;
    const halfBase = Math.min(width * 0.42, height * 0.45);

    ctx.fillStyle = 'rgba(30, 35, 50, 0.55)';
    ctx.beginPath();
    ctx.moveTo(baseX - halfBase, baseY);
    ctx.lineTo(baseX, peakY);
    ctx.lineTo(baseX + halfBase, baseY);
    ctx.closePath();
    ctx.fill();

    // Snow cap
    const snowY = height * 0.45;
    const snowWidth = halfBase * (1 - (snowY - peakY) / (baseY - peakY));
    ctx.fillStyle = 'rgba(235, 245, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(baseX - snowWidth, snowY);
    ctx.lineTo(baseX, peakY);
    ctx.lineTo(baseX + snowWidth, snowY);
    ctx.closePath();
    ctx.fill();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(40, 55, 85, 0.25)');
    grad.addColorStop(1, 'rgba(20, 30, 45, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    drawMountain();

    // Mist
    for (const m of mist) {
      m.x += m.speed;
      if (m.x > width + m.r) m.x = -m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(220, 230, 245, ${m.opacity})`);
      g.addColorStop(1, 'rgba(220, 230, 245, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Petals
    for (const p of petals) {
      p.y += p.speed;
      p.x += Math.sin(frame * 0.003 + p.phase) * p.sway * 0.3;
      p.rotation += p.rotSpeed;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `rgba(255, 200, 215, ${p.opacity})`;
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
  initMist();
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
