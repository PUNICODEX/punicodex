/**
 * PALLAS FLAGSHIP TEMPLE — WARCRAFT CANVAS
 * Celestial bronze, crossing spears, shield formations, constellation tactics,
 * and the cold spark of pre-Olympian strategy.
 */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Warcraft Canvas ────────────────────────────────────────────────────── */
  const canvas = document.getElementById('pallas-hero-canvas');
  if (!canvas || prefersReducedMotion) {
    if (canvas) canvas.style.display = 'none';
  } else {
    const ctx = canvas.getContext('2d');
    let width, height;
    let time = 0;
    let spears = [];
    let shields = [];
    let stars = [];
    let constellations = [];
    let sparks = [];
    let grids = [];
    let fog = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initSpears();
      initShields();
    }

    function initSpears() {
      spears = [];
      for (let i = 0; i < 16; i++) {
        spears.push({
          x: Math.random() * width,
          y: height * 0.45 + Math.random() * height * 0.5,
          angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.25,
          length: Math.random() * 160 + 120,
          opacity: Math.random() * 0.15 + 0.08,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.003 + 0.001,
        });
      }
    }

    function initShields() {
      shields = [];
      for (let i = 0; i < 7; i++) {
        shields.push({
          x: Math.random() * width,
          y: height * 0.55 + Math.random() * height * 0.35,
          radius: Math.random() * 35 + 25,
          opacity: Math.random() * 0.12 + 0.06,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.002,
        });
      }
    }

    class Star {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.55;
        this.size = Math.random() * 1.1 + 0.2;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.015 + 0.005;
        this.color = Math.random() > 0.7 ? '#b8d4e3' : '#e8dcc4';
      }
      update() {
        this.phase += this.speed;
      }
      draw() {
        const op = this.opacity * (0.5 + 0.5 * Math.sin(this.phase));
        ctx.save();
        ctx.globalAlpha = op;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Constellation {
      constructor() {
        this.cx = Math.random() * width;
        this.cy = Math.random() * height * 0.45;
        this.points = [];
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          this.points.push({
            x: this.cx + (Math.random() - 0.5) * 160,
            y: this.cy + (Math.random() - 0.5) * 120,
          });
        }
        this.opacity = Math.random() * 0.12 + 0.06;
        this.phase = Math.random() * Math.PI * 2;
      }
      update() {
        this.phase += 0.003;
      }
      draw() {
        const op = this.opacity * (0.7 + 0.3 * Math.sin(this.phase));
        ctx.save();
        ctx.globalAlpha = op;
        ctx.strokeStyle = 'rgba(184, 212, 227, 0.55)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(232, 220, 196, 0.8)';
        for (const p of this.points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    class Spark {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.opacity = 0;
        this.target = Math.random() * 0.6 + 0.2;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.01;
      }
      update() {
        this.phase += this.speed;
        this.opacity = this.target * (0.5 + 0.5 * Math.sin(this.phase));
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#cd7f32';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(205, 127, 50, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Fog {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 180 + 100;
        this.vx = (Math.random() - 0.5) * 0.12;
        this.vy = (Math.random() - 0.5) * 0.08;
        this.opacity = Math.random() * 0.04 + 0.02;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -250) this.x = width + 250;
        if (this.x > width + 250) this.x = -250;
        if (this.y < -250) this.y = height + 250;
        if (this.y > height + 250) this.y = -250;
      }
      draw() {
        ctx.save();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `rgba(135, 145, 155, ${this.opacity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawSpear(s) {
      s.swayPhase += s.swaySpeed;
      const sway = Math.sin(s.swayPhase) * 0.03;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle + sway);
      ctx.globalAlpha = s.opacity;

      ctx.strokeStyle = '#8c7853';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, s.length * 0.5);
      ctx.lineTo(0, -s.length * 0.5);
      ctx.stroke();

      ctx.fillStyle = '#cd7f32';
      ctx.beginPath();
      ctx.moveTo(0, -s.length * 0.52);
      ctx.lineTo(-6, -s.length * 0.38);
      ctx.lineTo(6, -s.length * 0.38);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#b87333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -s.length * 0.42);
      ctx.lineTo(0, -s.length * 0.35);
      ctx.stroke();
      ctx.restore();
    }

    function drawShield(s) {
      s.rotation += s.rotSpeed;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.globalAlpha = s.opacity;
      ctx.strokeStyle = '#9a7b4f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s.radius, Math.sin(a) * s.radius);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, s.radius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#7a5a3a';
      ctx.fill();
      ctx.restore();
    }

    function drawGrid() {
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#8fa3b3';
      ctx.lineWidth = 0.5;
      const spacing = 60;
      const offset = (time * 2) % spacing;
      for (let x = offset; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = offset; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawOverlay() {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(6, 8, 12, 0)');
      grad.addColorStop(1, 'rgba(6, 8, 12, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    resize();
    for (let i = 0; i < 90; i++) stars.push(new Star());
    for (let i = 0; i < 8; i++) constellations.push(new Constellation());
    for (let i = 0; i < 50; i++) sparks.push(new Spark());
    for (let i = 0; i < 9; i++) fog.push(new Fog());

    window.addEventListener('resize', resize);

    function animate() {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, 'hsla(210, 25%, 10%, 0.06)');
      bg.addColorStop(1, 'hsla(220, 20%, 8%, 0.14)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      fog.forEach(f => { f.update(); f.draw(); });
      drawGrid();
      stars.forEach(s => { s.update(); s.draw(); });
      constellations.forEach(c => { c.update(); c.draw(); });
      shields.forEach(s => drawShield(s));
      spears.forEach(s => drawSpear(s));
      sparks.forEach(s => { s.update(); s.draw(); });
      drawOverlay();

      requestAnimationFrame(animate);
    }

    animate();
  }

  /* ── Shared Temple Interactions ─────────────────────────────────────────── */
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-scale');
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => entry.target.classList.add('visible'), parseInt(delay, 10));
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('visible'));
  }

  const nav = document.querySelector('.main-nav');
  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.pageYOffset > 100);
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
      }
    });
  });

  const mascotImg = document.querySelector('.mascot-img');
  if (mascotImg && !prefersReducedMotion) {
    window.addEventListener('scroll', () => {
      const hero = document.getElementById('hero');
      if (hero && window.pageYOffset < hero.offsetTop + hero.offsetHeight) {
        mascotImg.style.transform = `translateY(${window.pageYOffset * 0.12}px)`;
      }
    }, { passive: true });
  }
})();
