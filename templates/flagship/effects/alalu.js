// Alalu — celestial throne; golden motes; drifting cuneiform glyphs; pole-star radiance
(function () {
  'use strict';

  const canvas = document.getElementById('alalu-hero-canvas');
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

  const P = readColor('data-primary', '#d4af37');
  const S = readColor('data-secondary', '#8a7fb5');

  let width, height, dpr;
  let particles = [];
  let glyphs = [];
  let frameCount = 0;
  let rafId = null;
  let running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function rgb(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function makeSprite(r, colorStops) {
    const s = document.createElement('canvas');
    s.width = r * 2;
    s.height = r * 2;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    colorStops.forEach(function (stop) {
      grad.addColorStop(stop[0], stop[1]);
    });
    g.fillStyle = grad;
    g.fillRect(0, 0, r * 2, r * 2);
    return s;
  }

  let glowSprite = null;
  let moteSprite = null;

  function buildSprites() {
    glowSprite = makeSprite(64, [
      [0, 'rgba(240, 230, 200, 0.85)'],
      [0.2, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)'],
      [0.55, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)'],
      [1, 'rgba(26, 20, 46, 0)'],
    ]);
    moteSprite = makeSprite(32, [
      [0, 'rgba(240, 230, 200, 1)'],
      [0.35, rgb(P, 0.45)],
      [1, rgb(P, 0)],
    ]);
  }
  buildSprites();

  class Mote {
    constructor() {
      this.reset(true);
    }

    reset(scatter) {
      this.x = Math.random() * width;
      this.y = scatter ? Math.random() * height : height + 20;
      this.vy = -random(0.15, 0.55);
      this.vx = (Math.random() - 0.5) * 0.25;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = random(0.005, 0.015);
      this.size = random(2, 7);
      this.alpha = random(0.15, 0.55);
      this.warm = Math.random() < 0.35;
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = random(0.02, 0.05);
    }

    update() {
      this.wobble += this.wobbleSpeed;
      this.pulse += this.pulseSpeed;
      this.x += this.vx + Math.sin(this.wobble) * 0.25;
      this.y += this.vy;
      if (this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset(false);
      }
    }

    draw() {
      const alpha = this.alpha * (0.7 + 0.3 * Math.sin(this.pulse));
      const color = this.warm ? '#e8c86a' : rgb(P, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      const s = this.size * 3;
      ctx.drawImage(moteSprite, this.x - s / 2, this.y - s / 2, s, s);
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Glyph {
    constructor() {
      this.reset(true);
    }

    reset(scatter) {
      this.x = scatter ? Math.random() * width : -60;
      this.y = random(height * 0.15, height * 0.85);
      this.vx = random(0.08, 0.22);
      this.size = random(14, 28);
      this.alpha = random(0.04, 0.12);
      this.fadeDir = Math.random() < 0.5 ? -1 : 1;
      this.symbol = String.fromCharCode(0x12000 + Math.floor(Math.random() * 200));
      this.phase = Math.random() * Math.PI * 2;
    }

    update() {
      this.x += this.vx;
      this.phase += 0.008;
      this.alpha += Math.sin(this.phase) * 0.0006 * this.fadeDir;
      if (this.alpha < 0.02) this.alpha = 0.02;
      if (this.alpha > 0.16) this.alpha = 0.16;
      if (this.x > width + 60) this.reset(false);
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = rgb(S, 1);
      ctx.font = this.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.symbol, this.x, this.y);
      ctx.restore();
    }
  }

  for (let i = 0; i < 90; i++) particles.push(new Mote());
  for (let i = 0; i < 14; i++) glyphs.push(new Glyph());

  function drawThrone(t) {
    const cx = width * 0.5;
    const cy = height * 0.62;
    const w = Math.min(width, height) * 0.22;
    const h = w * 0.9;

    ctx.save();
    ctx.globalAlpha = 0.06 + 0.025 * Math.sin(t * 0.003);
    ctx.fillStyle = '#0d0a18';
    ctx.strokeStyle = rgb(P, 1);
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy - h * 0.25);
    ctx.lineTo(cx - w * 0.18, cy - h * 0.55);
    ctx.lineTo(cx, cy - h * 0.35);
    ctx.lineTo(cx + w * 0.18, cy - h * 0.55);
    ctx.lineTo(cx + w / 2, cy - h * 0.25);
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, cy + h * 0.05);
    ctx.lineTo(cx + w * 0.42, cy + h * 0.05);
    ctx.stroke();

    ctx.restore();
  }

  function drawPoleStar(t) {
    const cx = width * 0.5;
    const cy = height * 0.22;
    const pulse = 0.75 + 0.25 * Math.sin(t * 0.01);
    const r = 90 + pulse * 30;

    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * pulse;
    ctx.drawImage(glowSprite, cx - r, cy - r, r * 2, r * 2);

    ctx.strokeStyle = 'rgba(240, 230, 200, ' + (0.25 * pulse) + ')';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    const arm = 28 + pulse * 12;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy);
    ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm * 1.2);
    ctx.lineTo(cx, cy + arm * 1.2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 252, 238, ' + (0.85 * pulse) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAmbience(t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.002);
    const grad = ctx.createRadialGradient(
      width * 0.5, height * 0.25, 0,
      width * 0.5, height * 0.25, Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'hsla(255, 35%, 28%, ' + (0.12 + pulse * 0.05) + ')');
    grad.addColorStop(0.55, 'hsla(255, 30%, 14%, ' + (0.06 + pulse * 0.03) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw() {
    if (!running) return;
    frameCount++;
    const t = frameCount;

    ctx.clearRect(0, 0, width, height);
    drawAmbience(t);
    drawThrone(t);
    drawPoleStar(t);

    glyphs.forEach(function (g) {
      g.update();
      g.draw();
    });

    particles.forEach(function (p) {
      p.update();
      p.draw();
    });

    if (!reduced) rafId = requestAnimationFrame(draw);
  }

  function destroy() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('resize', resize);
  }

  window.addEventListener('beforeunload', destroy);

  draw();
})();
