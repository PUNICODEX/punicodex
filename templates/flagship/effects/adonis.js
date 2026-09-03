/**
 * ADONIS FLAGSHIP TEMPLE — ANEMONE HERO CANVAS
 * Anemone blood-flowers, golden Levant light, hunting spears, boar-shadow,
 * and the pale river-mist of rebirth.
 */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Anemone Canvas ─────────────────────────────────────────────────────── */
  const canvas = document.getElementById('adonis-hero-canvas');
  if (!canvas || prefersReducedMotion) {
    if (canvas) canvas.style.display = 'none';
  } else {
    const ctx = canvas.getContext('2d');
    let width, height;
    let time = 0;
    let petals = [];
    let rays = [];
    let spears = [];
    let boars = [];
    let sparks = [];
    let mistBlobs = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initRays();
      initSpears();
    }

    function makeAnemoneSprite(size) {
      const sprite = document.createElement('canvas');
      sprite.width = size * 2.6;
      sprite.height = size * 2.6;
      const sctx = sprite.getContext('2d');
      sctx.translate(size * 1.3, size * 1.3);
      sctx.globalAlpha = 0.92;
      const hue = 348 + Math.random() * 14;
      for (let i = 0; i < 6; i++) {
        sctx.save();
        sctx.rotate((i / 6) * Math.PI * 2);
        sctx.beginPath();
        sctx.ellipse(0, -size * 0.6, size * 0.28, size * 0.78, 0, 0, Math.PI * 2);
        const grad = sctx.createLinearGradient(0, 0, 0, -size);
        grad.addColorStop(0, `hsla(${hue}, 82%, 52%, 0.95)`);
        grad.addColorStop(0.6, `hsla(${hue}, 78%, 42%, 0.85)`);
        grad.addColorStop(1, `hsla(${hue}, 90%, 28%, 0.75)`);
        sctx.fillStyle = grad;
        sctx.fill();
        sctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.35)`;
        sctx.lineWidth = 0.5;
        sctx.stroke();
        sctx.restore();
      }
      sctx.beginPath();
      sctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      sctx.fillStyle = `hsla(${hue + 10}, 90%, 35%, 0.95)`;
      sctx.fill();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        sctx.beginPath();
        sctx.moveTo(0, 0);
        sctx.lineTo(Math.cos(a) * size * 0.18, Math.sin(a) * size * 0.18);
        sctx.strokeStyle = `hsla(45, 90%, 65%, 0.55)`;
        sctx.lineWidth = 0.8;
        sctx.stroke();
      }
      return sprite;
    }

    class AnemonePetal {
      constructor() { this.reset(true); }
      reset(randomY = false) {
        this.x = Math.random() * width;
        this.y = randomY ? Math.random() * height : -40 - Math.random() * 80;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = Math.random() * 0.9 + 0.35;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.025;
        this.scale = Math.random() * 0.7 + 0.45;
        this.swayPhase = Math.random() * Math.PI * 2;
        this.opacity = Math.random() * 0.45 + 0.35;
        this.sprite = makeAnemoneSprite(14);
      }
      update(t) {
        this.x += this.vx + Math.sin(t * 0.7 + this.swayPhase) * 0.55;
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

    function initRays() {
      rays = [];
      for (let i = 0; i < 18; i++) {
        rays.push({
          angle: (i / 18) * Math.PI * 2 + Math.random() * 0.3,
          length: Math.random() * 280 + 180,
          width: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.06 + 0.02,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.004 + 0.002,
        });
      }
    }

    function initSpears() {
      spears = [];
      for (let i = 0; i < 5; i++) {
        spears.push({
          x: width * (0.15 + i * 0.18) + (Math.random() - 0.5) * 60,
          y: height * 0.55 + Math.random() * height * 0.35,
          angle: (Math.random() - 0.5) * 0.12,
          length: Math.random() * 140 + 100,
          opacity: Math.random() * 0.08 + 0.04,
        });
      }
    }

    class BoarShadow {
      constructor() { this.reset(); }
      reset() {
        this.x = -120;
        this.y = height * 0.62 + Math.random() * height * 0.18;
        this.speed = Math.random() * 0.7 + 0.4;
        this.scale = Math.random() * 0.6 + 0.7;
        this.opacity = 0;
        this.targetOpacity = Math.random() * 0.08 + 0.04;
        this.phase = 0;
      }
      update() {
        this.x += this.speed;
        this.phase += 0.02;
        if (this.x < 200) this.opacity += 0.001;
        else if (this.x > width - 200) this.opacity -= 0.001;
        else this.opacity = this.targetOpacity * (0.9 + 0.1 * Math.sin(this.phase));
        if (this.opacity <= 0 && this.x > width) this.reset();
      }
      draw() {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.fillStyle = '#1a0a0a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 55, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(45, -12, 18, 22, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(58, -8);
        ctx.lineTo(70, -2);
        ctx.lineTo(60, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(48, 8);
        ctx.lineTo(55, 22);
        ctx.lineTo(45, 20);
        ctx.fill();
        ctx.restore();
      }
    }

    class Spark {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2.5 + 0.5;
        this.opacity = 0;
        this.targetOpacity = Math.random() * 0.5 + 0.2;
        this.fadeSpeed = Math.random() * 0.015 + 0.008;
        this.phase = Math.random() * Math.PI * 2;
      }
      update() {
        this.phase += this.fadeSpeed;
        this.opacity = this.targetOpacity * (0.5 + 0.5 * Math.sin(this.phase));
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class MistBlob {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 160 + 90;
        this.vx = (Math.random() - 0.5) * 0.18;
        this.vy = (Math.random() - 0.5) * 0.12;
        this.opacity = Math.random() * 0.04 + 0.02;
        this.pulse = Math.random() * Math.PI * 2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += 0.004;
        if (this.x < -250) this.x = width + 250;
        if (this.x > width + 250) this.x = -250;
        if (this.y < -250) this.y = height + 250;
        if (this.y > height + 250) this.y = -250;
      }
      draw() {
        ctx.save();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsla(35, 60%, 78%, ${this.opacity * (0.8 + 0.2 * Math.sin(this.pulse))})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawRays() {
      const cx = width * 0.72;
      const cy = height * 0.22;
      ctx.save();
      ctx.translate(cx, cy);
      for (const r of rays) {
        r.pulsePhase += r.pulseSpeed;
        const op = r.opacity * (0.6 + 0.4 * Math.sin(r.pulsePhase));
        ctx.save();
        ctx.rotate(r.angle + time * 0.00015);
        ctx.strokeStyle = `rgba(255, 215, 140, ${op})`;
        ctx.lineWidth = r.width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r.length, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawSpears() {
      ctx.save();
      for (const s of spears) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.strokeStyle = `rgba(212, 175, 55, ${s.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -s.length * 0.5);
        ctx.lineTo(0, s.length * 0.5);
        ctx.stroke();
        ctx.fillStyle = `rgba(184, 134, 11, ${s.opacity * 1.5})`;
        ctx.beginPath();
        ctx.moveTo(0, -s.length * 0.55);
        ctx.lineTo(-5, -s.length * 0.42);
        ctx.lineTo(5, -s.length * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawOverlay() {
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75);
      grad.addColorStop(0, 'rgba(18, 8, 8, 0)');
      grad.addColorStop(1, 'rgba(18, 8, 8, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    resize();
    for (let i = 0; i < 55; i++) petals.push(new AnemonePetal());
    for (let i = 0; i < 3; i++) boars.push(new BoarShadow());
    for (let i = 0; i < 40; i++) sparks.push(new Spark());
    for (let i = 0; i < 7; i++) mistBlobs.push(new MistBlob());

    window.addEventListener('resize', resize);

    function animate() {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, 'hsla(30, 45%, 12%, 0.05)');
      bg.addColorStop(1, 'hsla(350, 35%, 10%, 0.12)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      mistBlobs.forEach(m => { m.update(); m.draw(); });
      drawRays();
      drawSpears();
      boars.forEach(b => { b.update(); b.draw(); });
      sparks.forEach(s => { s.update(); s.draw(); });
      petals.forEach(p => { p.update(time); p.draw(); });
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
