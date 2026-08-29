// Kingu — Blood-Nebula Dragon
// Crimson dragon coils, pulsing Tablet of Destinies, falling blood droplets
// that spark into human-shaped stars.
(function () {
  'use strict';

  const canvas = document.getElementById('kingu-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function readColor(attr, fb) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
  }
  const P = readColor('data-primary', '#8a1c1c');
  const S = readColor('data-secondary', '#c9a227');

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
    buildDragon();
  }
  resize();
  window.addEventListener('resize', resize);

  let frameCount = 0;
  let dragonSegments = [];
  let droplets = [];
  let stars = [];
  let tabletPulse = 0;

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function drawSoftOrb(x, y, radius, r, g, b, alpha) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function buildDragon() {
    dragonSegments = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      dragonSegments.push({
        baseAngle: (i / count) * Math.PI * 2.2 - Math.PI * 0.6,
        radiusFrac: 0.18 + (i % 3) * 0.015,
        size: 6 + Math.sin((i / count) * Math.PI) * 10,
        phase: i * 0.4
      });
    }
  }

  function drawDragon(time) {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const baseR = Math.min(width, height) * 0.22;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    dragonSegments.forEach((seg, i) => {
      const sweep = time * 0.0006;
      const r = baseR * (1 + 0.18 * Math.sin(seg.phase + sweep));
      const a = seg.baseAngle + sweep * (i % 2 === 0 ? 1 : -1) * 0.3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.72;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + seg.phase);
      drawSoftOrb(x, y, seg.size * (1.5 + pulse), P.r, P.g, P.b, 0.18 * pulse);
    });
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(${Math.min(P.r + 20, 255)}, ${P.g}, ${P.b}, 0.22)`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    dragonSegments.forEach((seg, i) => {
      const sweep = time * 0.0006;
      const r = baseR * (1 + 0.18 * Math.sin(seg.phase + sweep));
      const a = seg.baseAngle + sweep * (i % 2 === 0 ? 1 : -1) * 0.3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.72;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawTablet(time) {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const unit = Math.min(width, height);
    const breathe = 0.85 + 0.15 * Math.sin(time * 0.0025);
    const outer = unit * 0.085 * breathe;
    const inner = outer * 0.62;

    tabletPulse += (Math.sin(time * 0.002) * 0.5 + 0.5 - tabletPulse) * 0.05;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const halo = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer * 2.2);
    halo.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
    halo.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, ${0.08 + tabletPulse * 0.08})`);
    halo.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, outer * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 18 + tabletPulse * 24;
    ctx.shadowColor = `rgba(${S.r}, ${S.g}, ${S.b}, 0.7)`;
    ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${0.45 + tabletPulse * 0.3})`;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(cx - inner, cy - inner * 0.72, inner * 2, inner * 1.44);

    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const wx = cx + i * inner * 0.45;
      ctx.moveTo(wx, cy - inner * 0.35);
      ctx.lineTo(wx - inner * 0.12, cy - inner * 0.15);
      ctx.lineTo(wx + inner * 0.12, cy - inner * 0.15);
    }
    ctx.stroke();

    ctx.restore();
  }

  class Droplet {
    constructor() {
      this.reset(true);
    }

    reset(scatter) {
      this.x = randomRange(width * 0.15, width * 0.85);
      this.y = scatter ? randomRange(-height * 0.2, height) : -randomRange(10, 80);
      this.vy = randomRange(0.8, 2.4);
      this.vx = randomRange(-0.3, 0.3);
      this.size = randomRange(1.2, 3.2);
      this.alpha = randomRange(0.35, 0.85);
      this.ignited = false;
      this.life = 0;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.015;

      if (!this.ignited && this.y > height * 0.65 && Math.random() < 0.04) {
        this.ignited = true;
        this.life = 60 + Math.random() * 40;
      }

      if (this.ignited) {
        this.life--;
        this.size *= 1.005;
      }

      if (this.y > height + 20 || (this.ignited && this.life <= 0)) {
        this.reset(false);
      }
    }

    draw() {
      if (this.ignited) {
        const fade = this.life / 100;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#f0d8a8';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(240, 216, 168, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.size, this.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.x - this.size * 0.6, this.y + this.size * 0.8);
        ctx.lineTo(this.x, this.y - this.size * 0.2);
        ctx.lineTo(this.x + this.size * 0.6, this.y + this.size * 0.8);
        ctx.strokeStyle = '#f0d8a8';
        ctx.lineWidth = this.size * 0.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `rgb(${Math.min(P.r + 40, 255)}, ${P.g}, ${P.b})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = randomRange(0.4, 1.4);
      this.phase = Math.random() * Math.PI * 2;
      this.speed = randomRange(0.003, 0.012);
      this.warm = Math.random() < 0.35;
    }

    draw(time) {
      this.phase += this.speed;
      const alpha = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(this.phase));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.warm ? '#f0d8a8' : `rgb(${S.r}, ${S.g}, ${S.b})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  droplets = [];
  stars = [];
  for (let i = 0; i < 70; i++) droplets.push(new Droplet());
  for (let i = 0; i < 90; i++) stars.push(new Star());

  function draw(time) {
    if (typeof time !== 'number') time = performance.now();
    frameCount++;

    ctx.clearRect(0, 0, width, height);

    const nebula = ctx.createRadialGradient(
      width * 0.5,
      height * 0.45,
      0,
      width * 0.5,
      height * 0.45,
      Math.max(width, height) * 0.9
    );
    nebula.addColorStop(0, `rgba(${Math.max(P.r - 40, 0)}, ${Math.max(P.g - 20, 0)}, ${P.b}, 0.55)`);
    nebula.addColorStop(0.45, `rgba(${Math.max(P.r - 80, 0)}, ${Math.max(P.g - 40, 0)}, ${Math.max(P.b - 10, 0)}, 0.32)`);
    nebula.addColorStop(1, 'rgba(18, 6, 8, 0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    if (!reduced) {
      stars.forEach((s) => s.draw(time));
      drawDragon(time);
      drawTablet(time);
      droplets.forEach((d) => {
        d.update();
        d.draw();
      });
    } else {
      stars.slice(0, 30).forEach((s) => s.draw(time));
      drawTablet(time);
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
