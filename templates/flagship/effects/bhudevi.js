/**
 * BHŪDEVĪ FLAGSHIP TEMPLE — EARTH MOTHER CANVAS
 * Fertile green earth, golden grain, lotus roots, flowing rivers,
 * and the gentle pulse of an abundant world.
 */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Earth Mother Canvas ────────────────────────────────────────────────── */
  const canvas = document.getElementById('bhudevi-hero-canvas');
  if (!canvas || prefersReducedMotion) {
    if (canvas) canvas.style.display = 'none';
  } else {
    const ctx = canvas.getContext('2d');
    let width, height;
    let time = 0;
    let vines = [];
    let grains = [];
    let lotuses = [];
    let rivers = [];
    let fireflies = [];
    let earthPulse = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initRivers();
    }

    function makeLotusSprite(size) {
      const sprite = document.createElement('canvas');
      sprite.width = size * 2.4;
      sprite.height = size * 2.4;
      const sctx = sprite.getContext('2d');
      sctx.translate(size * 1.2, size * 1.2);
      for (let ring = 0; ring < 3; ring++) {
        const petals = 8 - ring;
        for (let i = 0; i < petals; i++) {
          sctx.save();
          sctx.rotate((i / petals) * Math.PI * 2 + ring * 0.22);
          sctx.beginPath();
          sctx.ellipse(0, -size * (0.42 + ring * 0.2), size * (0.24 - ring * 0.03), size * (0.52 - ring * 0.08), 0, 0, Math.PI * 2);
          const grad = sctx.createLinearGradient(0, 0, 0, -size);
          grad.addColorStop(0, `hsla(${110 + ring * 15}, 60%, ${55 - ring * 8}%, ${0.9 - ring * 0.15})`);
          grad.addColorStop(1, `hsla(${120 + ring * 10}, 70%, ${40 - ring * 6}%, ${0.8 - ring * 0.15})`);
          sctx.fillStyle = grad;
          sctx.fill();
          sctx.restore();
        }
      }
      sctx.beginPath();
      sctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
      sctx.fillStyle = 'hsla(50, 90%, 60%, 0.95)';
      sctx.fill();
      return sprite;
    }

    class Vine {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = height + 20 + Math.random() * 60;
        this.nodes = [];
        const segments = 12 + Math.floor(Math.random() * 8);
        let cx = this.x;
        let cy = this.y;
        for (let i = 0; i < segments; i++) {
          this.nodes.push({ x: cx, y: cy, angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6 });
          cx += Math.cos(this.nodes[i].angle) * (Math.random() * 25 + 15);
          cy += Math.sin(this.nodes[i].angle) * (Math.random() * 25 + 15);
        }
        this.leafPhase = Math.random() * Math.PI * 2;
        this.hue = 90 + Math.random() * 40;
        this.opacity = Math.random() * 0.25 + 0.15;
        this.growth = 0;
        this.growSpeed = Math.random() * 0.004 + 0.002;
      }
      update() {
        this.growth = Math.min(1, this.growth + this.growSpeed);
        this.leafPhase += 0.01;
      }
      draw() {
        const visible = Math.floor(this.nodes.length * this.growth);
        if (visible < 2) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = `hsla(${this.hue}, 55%, 35%, 0.85)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
        for (let i = 1; i < visible; i++) {
          const n = this.nodes[i];
          ctx.lineTo(n.x, n.y);
        }
        ctx.stroke();

        ctx.fillStyle = `hsla(${this.hue + 20}, 65%, 45%, 0.7)`;
        for (let i = 1; i < visible; i += 2) {
          const n = this.nodes[i];
          const leafSize = 6 + Math.sin(this.leafPhase + i) * 2;
          ctx.beginPath();
          ctx.ellipse(n.x, n.y, leafSize, leafSize * 0.5, n.angle + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    class Grain {
      constructor() { this.reset(true); }
      reset(randomY = false) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : -20 - Math.random() * 60;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = Math.random() * 0.7 + 0.25;
        this.size = Math.random() * 3 + 1.5;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.hue = Math.random() > 0.5 ? 45 : 50;
      }
      update(t) {
        this.x += this.vx + Math.sin(t * 0.6 + this.swayPhase) * 0.3;
        this.y += this.vy;
        if (this.y > height + 20) this.reset();
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = `hsla(${this.hue}, 90%, 55%, 0.95)`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size * 0.35, this.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class FloatingLotus {
      constructor() { this.reset(true); }
      reset(randomY = false) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : -40 - Math.random() * 80;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = Math.random() * 0.5 + 0.2;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.012;
        this.scale = Math.random() * 0.5 + 0.3;
        this.opacity = Math.random() * 0.4 + 0.25;
        this.sprite = makeLotusSprite(14);
      }
      update(t) {
        this.x += this.vx + Math.sin(t * 0.5) * 0.25;
        this.y += this.vy;
        this.rot += this.rotSpeed;
        if (this.y > height + 40) this.reset();
      }
      draw() {
        const s = this.sprite.width * this.scale * 0.5;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.drawImage(this.sprite, -s, -s, s * 2, s * 2);
        ctx.restore();
      }
    }

    function initRivers() {
      rivers = [];
      for (let i = 0; i < 4; i++) {
        rivers.push({
          yBase: height * (0.45 + i * 0.14),
          amplitude: Math.random() * 30 + 20,
          frequency: Math.random() * 0.003 + 0.002,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.008 + 0.004,
          opacity: Math.random() * 0.06 + 0.04,
        });
      }
    }

    class Firefly {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.8 + 0.5;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.008;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
      }
      update() {
        this.phase += this.speed;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -10) this.x = width + 10;
        if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        if (this.y > height + 10) this.y = -10;
      }
      draw() {
        const op = 0.2 + 0.5 * Math.sin(this.phase);
        ctx.save();
        ctx.globalAlpha = op;
        ctx.fillStyle = '#ccff66';
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(180, 255, 80, ${op * 0.6})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawRivers() {
      for (const r of rivers) {
        r.phase += r.speed;
        ctx.save();
        ctx.globalAlpha = r.opacity;
        ctx.strokeStyle = 'rgba(135, 206, 235, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const y = r.yBase + Math.sin(x * r.frequency + r.phase) * r.amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawEarthPulse() {
      const cx = width * 0.5;
      const cy = height * 0.65;
      for (let i = 0; i < 4; i++) {
        const r = Math.min(width, height) * (0.18 + i * 0.12) + Math.sin(time * 0.8 + i) * 15;
        ctx.save();
        ctx.globalAlpha = 0.04 - i * 0.008;
        ctx.strokeStyle = '#7cb342';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawOverlay() {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(6, 12, 4, 0)');
      grad.addColorStop(1, 'rgba(6, 12, 4, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    resize();
    for (let i = 0; i < 18; i++) vines.push(new Vine());
    for (let i = 0; i < 70; i++) grains.push(new Grain());
    for (let i = 0; i < 35; i++) lotuses.push(new FloatingLotus());
    for (let i = 0; i < 60; i++) fireflies.push(new Firefly());

    window.addEventListener('resize', resize);

    function animate() {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, 'hsla(85, 35%, 10%, 0.04)');
      bg.addColorStop(1, 'hsla(100, 40%, 8%, 0.12)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawEarthPulse();
      drawRivers();
      vines.forEach(v => { v.update(); v.draw(); });
      grains.forEach(g => { g.update(time); g.draw(); });
      lotuses.forEach(l => { l.update(time); l.draw(); });
      fireflies.forEach(f => { f.update(); f.draw(); });
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
