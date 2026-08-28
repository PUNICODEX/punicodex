/**
 * RAIJIN — Thunder God
 * Lightning bolts, taiko drum rings, storm clouds
 */

(function () {
  'use strict';

  const canvas = document.getElementById('raijin-canvas');
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

  const bolts = [];
  const drums = [];
  const rain = [];

  function initBolts() {
    bolts.length = 0;
    for (let i = 0; i < 4; i++) {
      bolts.push({
        active: false,
        cooldown: Math.random() * 180 + 60,
        segments: [],
        opacity: 0,
        flash: 0,
      });
    }
  }

  function initDrums() {
    drums.length = 0;
    for (let i = 0; i < 5; i++) {
      drums.push({
        x: width * (0.2 + i * 0.15),
        y: height * (0.2 + (i % 2) * 0.5),
        r: 25 + Math.random() * 20,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.02,
        opacity: 0.08 + Math.random() * 0.08,
      });
    }
  }

  function initRain() {
    rain.length = 0;
    for (let i = 0; i < 120; i++) {
      rain.push({
        x: Math.random() * width,
        y: Math.random() * -height,
        vy: 10 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1,
        len: 10 + Math.random() * 15,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }
  }

  function triggerBolt(b) {
    b.active = true;
    b.opacity = 1;
    b.flash = 0.12;
    b.segments = [];
    let x = Math.random() * width;
    let y = 0;
    const targetY = Math.random() * height * 0.5 + height * 0.2;
    while (y < targetY) {
      const nx = x + (Math.random() - 0.5) * 60;
      const ny = y + Math.random() * 25 + 12;
      b.segments.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
      if (Math.random() < 0.25) {
        let bx = x;
        let by = y;
        for (let i = 0; i < 3; i++) {
          const bnx = bx + (Math.random() - 0.5) * 40;
          const bny = by + Math.random() * 18 + 8;
          b.segments.push({ x1: bx, y1: by, x2: bnx, y2: bny, branch: true });
          bx = bnx;
          by = bny;
        }
      }
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(14, 14, 20, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // Rain
    for (const r of rain) {
      r.y += r.vy;
      r.x += r.vx;
      if (r.y > height + 20) {
        r.y = -20;
        r.x = Math.random() * width;
      }
      ctx.strokeStyle = `rgba(170, 190, 210, ${r.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.vx, r.y + r.len);
      ctx.stroke();
    }

    // Drums
    for (const d of drums) {
      d.phase += d.speed;
      const pulse = 1 + 0.08 * Math.sin(d.phase);
      ctx.strokeStyle = `rgba(200, 180, 120, ${d.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * pulse * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bolts
    for (const b of bolts) {
      if (!b.active) {
        b.cooldown--;
        if (b.cooldown <= 0) triggerBolt(b);
      } else {
        b.opacity -= 0.07;
        b.flash -= 0.015;
        if (b.opacity <= 0) {
          b.active = false;
          b.cooldown = Math.random() * 200 + 100;
        }
      }

      if (b.flash > 0) {
        ctx.fillStyle = `rgba(220, 230, 245, ${b.flash})`;
        ctx.fillRect(0, 0, width, height);
      }
      if (b.active) {
        ctx.strokeStyle = `rgba(240, 245, 255, ${b.opacity})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(180, 200, 255, 0.6)';
        for (const s of b.segments) {
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.lineWidth = s.branch ? 1 : 2.5;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }

    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }

  initBolts();
  initDrums();
  initRain();
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
