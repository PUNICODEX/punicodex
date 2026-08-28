/**
 * EBISU — God of Fishermen and Fortune
 * Swimming fish, drifting nets, calm sea waves
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ebisu-canvas');
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

  const fish = [];
  const nets = [];
  const bubbles = [];

  function initFish() {
    fish.length = 0;
    const count = Math.min(28, Math.floor(width / 45));
    for (let i = 0; i < count; i++) {
      fish.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 8 + Math.random() * 18,
        speed: 0.4 + Math.random() * 1.2,
        direction: Math.random() > 0.5 ? 1 : -1,
        sway: 2 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
  }

  function initNets() {
    nets.length = 0;
    for (let i = 0; i < 4; i++) {
      nets.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 60 + Math.random() * 80,
        speed: 0.05 + Math.random() * 0.1,
        opacity: 0.04 + Math.random() * 0.05,
      });
    }
  }

  function initBubbles() {
    bubbles.length = 0;
    for (let i = 0; i < 40; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        r: 1 + Math.random() * 3,
        speed: 0.3 + Math.random() * 0.8,
        opacity: 0.1 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawFish(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.direction, 1);
    ctx.fillStyle = `rgba(180, 210, 220, ${f.opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, f.size, f.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-f.size * 0.8, 0);
    ctx.lineTo(-f.size * 1.4, -f.size * 0.5);
    ctx.lineTo(-f.size * 1.4, f.size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(15, 35, 50, 0.35)');
    grad.addColorStop(1, 'rgba(5, 25, 40, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Net patterns
    for (const n of nets) {
      n.y -= n.speed;
      if (n.y < -n.size) n.y = height + n.size;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.strokeStyle = `rgba(200, 220, 230, ${n.opacity})`;
      ctx.lineWidth = 0.5;
      const step = 12;
      for (let x = -n.size; x <= n.size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -n.size);
        ctx.lineTo(x, n.size);
        ctx.stroke();
      }
      for (let y = -n.size; y <= n.size; y += step) {
        ctx.beginPath();
        ctx.moveTo(-n.size, y);
        ctx.lineTo(n.size, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Fish
    for (const f of fish) {
      f.x += f.speed * f.direction;
      f.y += Math.sin(frame * 0.02 + f.phase) * 0.3;
      if (f.direction === 1 && f.x > width + 40) f.x = -40;
      if (f.direction === -1 && f.x < -40) f.x = width + 40;
      drawFish(f);
    }

    // Bubbles
    for (const b of bubbles) {
      b.y -= b.speed;
      b.x += Math.sin(frame * 0.01 + b.phase) * 0.3;
      if (b.y < -10) {
        b.y = height + 10;
        b.x = Math.random() * width;
      }
      ctx.strokeStyle = `rgba(200, 230, 255, ${b.opacity})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initFish();
  initNets();
  initBubbles();
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
