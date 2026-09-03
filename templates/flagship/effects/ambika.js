/**
 * AMBIKĀ FLAGSHIP TEMPLE — DEVĪ WARRIOR CANVAS
 * Many-armed Divine Mother, lioness eyes, whirling weapons, lotus fire,
 * and the golden-red radiance of protective fury.
 */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Devī Warrior Canvas ────────────────────────────────────────────────── */
  const canvas = document.getElementById('ambika-hero-canvas');
  if (!canvas || prefersReducedMotion) {
    if (canvas) canvas.style.display = 'none';
  } else {
    const ctx = canvas.getContext('2d');
    let width, height;
    let time = 0;
    let weapons = [];
    let lotusPetals = [];
    let eyes = [];
    let flames = [];
    let rings = [];
    let stars = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initWeapons();
    }

    function makeLotusSprite(size) {
      const sprite = document.createElement('canvas');
      sprite.width = size * 2.4;
      sprite.height = size * 2.4;
      const sctx = sprite.getContext('2d');
      sctx.translate(size * 1.2, size * 1.2);
      const colors = [
        { r: 255, g: 69, b: 0 },
        { r: 255, g: 140, b: 0 },
        { r: 255, g: 215, b: 0 },
      ];
      for (let ring = 0; ring < 3; ring++) {
        const petals = 8 - ring;
        const rBase = colors[ring];
        for (let i = 0; i < petals; i++) {
          sctx.save();
          sctx.rotate((i / petals) * Math.PI * 2 + ring * 0.25);
          sctx.beginPath();
          sctx.ellipse(0, -size * (0.45 + ring * 0.22), size * (0.22 - ring * 0.04), size * (0.55 - ring * 0.1), 0, 0, Math.PI * 2);
          sctx.fillStyle = `rgba(${rBase.r}, ${rBase.g}, ${rBase.b}, ${0.85 - ring * 0.15})`;
          sctx.fill();
          sctx.restore();
        }
      }
      sctx.beginPath();
      sctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
      sctx.fillStyle = '#ffd700';
      sctx.fill();
      return sprite;
    }

    class LotusPetal {
      constructor() { this.reset(true); }
      reset(randomY = false) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : -30 - Math.random() * 60;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = Math.random() * 0.8 + 0.3;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
        this.scale = Math.random() * 0.55 + 0.35;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.sprite = makeLotusSprite(12);
      }
      update(t) {
        this.x += this.vx + Math.sin(t * 0.8 + this.swayPhase) * 0.45;
        this.y += this.vy;
        this.rot += this.rotSpeed;
        if (this.y > height + 30) this.reset();
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

    function initWeapons() {
      weapons = [];
      const cx = width * 0.72;
      const cy = height * 0.28;
      const types = ['trident', 'discus', 'sword', 'mace', 'bow'];
      for (let i = 0; i < 12; i++) {
        weapons.push({
          type: types[i % types.length],
          angle: (i / 12) * Math.PI * 2,
          radius: Math.min(width, height) * 0.22 + (i % 3) * 35,
          speed: (Math.random() > 0.5 ? 1 : -1) * (0.0004 + Math.random() * 0.0003),
          size: Math.random() * 18 + 14,
          opacity: Math.random() * 0.12 + 0.08,
        });
      }
    }

    class Eye {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 18 + 10;
        this.openness = 0;
        this.targetOpen = Math.random() * 0.6 + 0.3;
        this.blinkPhase = Math.random() * Math.PI * 2;
        this.blinkSpeed = Math.random() * 0.003 + 0.002;
        this.hue = Math.random() > 0.5 ? 25 : 45;
      }
      update() {
        this.blinkPhase += this.blinkSpeed;
        const blink = Math.sin(this.blinkPhase);
        this.openness = this.targetOpen * (blink > 0.85 ? 0.1 : 1);
      }
      draw() {
        if (this.openness < 0.05) return;
        ctx.save();
        ctx.globalAlpha = this.openness * 0.35;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `hsla(${this.hue}, 100%, 65%, 0.9)`);
        grad.addColorStop(0.4, `hsla(${this.hue}, 90%, 45%, 0.5)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size * 1.4, this.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = this.openness * 0.8;
        ctx.fillStyle = `hsla(${this.hue}, 100%, 55%, 0.95)`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size * 0.45, this.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a0500';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.size * 0.22, this.size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Flame {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 40;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -(Math.random() * 1.2 + 0.6);
        this.size = Math.random() * 6 + 2;
        this.life = Math.random() * 120 + 80;
        this.maxLife = this.life;
        this.hue = Math.random() > 0.6 ? 18 : (Math.random() > 0.4 ? 30 : 45);
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx += (Math.random() - 0.5) * 0.03;
        this.life--;
        if (this.life <= 0 || this.y < -20) this.reset();
      }
      draw() {
        const lifeRatio = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = lifeRatio * 0.55;
        ctx.fillStyle = `hsl(${this.hue}, 90%, 55%)`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `hsla(${this.hue}, 90%, 50%, 0.45)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class Star {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.65;
        this.size = Math.random() * 1.2 + 0.2;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.006;
      }
      update() {
        this.phase += this.speed;
      }
      draw() {
        const op = 0.3 + 0.3 * Math.sin(this.phase);
        ctx.save();
        ctx.globalAlpha = op;
        ctx.fillStyle = '#ffe4b5';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawWeapon(w) {
      w.angle += w.speed;
      const cx = width * 0.72;
      const cy = height * 0.28;
      const x = cx + Math.cos(w.angle) * w.radius;
      const y = cy + Math.sin(w.angle) * w.radius;
      const rot = w.angle + Math.PI / 2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = w.opacity;
      ctx.strokeStyle = '#d4af37';
      ctx.fillStyle = '#b8860b';
      ctx.lineWidth = 1.5;

      if (w.type === 'trident') {
        ctx.beginPath();
        ctx.moveTo(0, -w.size);
        ctx.lineTo(0, w.size);
        ctx.stroke();
        for (const dx of [-w.size * 0.35, 0, w.size * 0.35]) {
          ctx.beginPath();
          ctx.moveTo(dx, -w.size);
          ctx.lineTo(dx, -w.size * 1.45);
          ctx.stroke();
        }
      } else if (w.type === 'discus') {
        ctx.beginPath();
        ctx.arc(0, 0, w.size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, w.size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * w.size * 0.5, Math.sin(a) * w.size * 0.5);
          ctx.stroke();
        }
      } else if (w.type === 'sword') {
        ctx.beginPath();
        ctx.moveTo(0, -w.size * 0.9);
        ctx.lineTo(0, w.size * 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w.size * 0.25, w.size * 0.5);
        ctx.lineTo(w.size * 0.25, w.size * 0.5);
        ctx.stroke();
      } else if (w.type === 'mace') {
        ctx.beginPath();
        ctx.moveTo(0, -w.size * 0.7);
        ctx.lineTo(0, w.size * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -w.size * 0.7, w.size * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.type === 'bow') {
        ctx.beginPath();
        ctx.arc(0, 0, w.size * 0.7, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -w.size * 0.5);
        ctx.lineTo(0, w.size * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawRings() {
      const cx = width * 0.72;
      const cy = height * 0.28;
      for (let i = 0; i < 3; i++) {
        const r = Math.min(width, height) * (0.16 + i * 0.06);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * (0.0002 + i * 0.0001) * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(212, 175, 55, ${0.05 - i * 0.012})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawOverlay() {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(12, 4, 4, 0)');
      grad.addColorStop(1, 'rgba(12, 4, 4, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    resize();
    for (let i = 0; i < 50; i++) lotusPetals.push(new LotusPetal());
    for (let i = 0; i < 8; i++) eyes.push(new Eye());
    for (let i = 0; i < 45; i++) flames.push(new Flame());
    for (let i = 0; i < 80; i++) stars.push(new Star());

    window.addEventListener('resize', resize);

    function animate() {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, 'hsla(10, 55%, 9%, 0.05)');
      bg.addColorStop(1, 'hsla(25, 60%, 8%, 0.14)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      stars.forEach(s => { s.update(); s.draw(); });
      drawRings();
      weapons.forEach(w => drawWeapon(w));
      eyes.forEach(e => { e.update(); e.draw(); });
      flames.forEach(f => { f.update(); f.draw(); });
      lotusPetals.forEach(p => { p.update(time); p.draw(); });
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
