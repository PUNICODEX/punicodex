/**
 * MARDUK FLAGSHIP TEMPLE — COSMIC ARCHITECT CANVAS
 * Winged solar disc, four rotating wind streams, drifting cuneiform sparks,
 * and storm-flashes over a lapis-and-gold Babylonian field.
 *
 * Production pattern: self-executing IIFE, reads data-primary/data-secondary,
 * handles DPR, resize, and prefers-reduced-motion. No exports.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('marduk-hero-canvas');
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

  function lighten(c, f) {
    return {
      r: Math.min(255, Math.round(c.r + (255 - c.r) * f)),
      g: Math.min(255, Math.round(c.g + (255 - c.g) * f)),
      b: Math.min(255, Math.round(c.b + (255 - c.b) * f))
    };
  }

  const P = readColor('data-primary', '#1a3a5c');
  const S = readColor('data-secondary', '#d4af37');
  const PL = lighten(P, 0.45);
  const SG = lighten(S, 0.55);

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
  window.addEventListener('resize', resize, { passive: true });

  let glyphSprites = [];
  function buildGlyphSprites() {
    glyphSprites = [];
    for (let v = 0; v < 8; v++) {
      const sprite = document.createElement('canvas');
      sprite.width = 40;
      sprite.height = 40;
      const g = sprite.getContext('2d');
      g.translate(20, 20);
      const wedges = 2 + (v % 4);
      for (let i = 0; i < wedges; i++) {
        const angle = (i / wedges) * Math.PI * 1.3 + v * 0.7;
        const len = 8 + ((v * 5 + i * 4) % 10);
        const wid = 2 + ((v + i) % 3);
        g.save();
        g.rotate(angle);
        g.shadowBlur = 5;
        g.shadowColor = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
        g.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.92)';
        g.beginPath();
        g.moveTo(1, -wid);
        g.lineTo(len, 0);
        g.lineTo(1, wid);
        g.closePath();
        g.fill();
        g.restore();
      }
      glyphSprites.push(sprite);
    }
  }
  buildGlyphSprites();

  class WindStream {
    constructor(index) {
      this.index = index;
      this.angle = (index / 4) * Math.PI * 2;
      this.speed = 0.004 + Math.random() * 0.003;
      this.radius = 0.12 + Math.random() * 0.08;
    }

    draw(t) {
      const cx = width * 0.5;
      const cy = height * 0.32;
      const orbitR = Math.min(width, height) * this.radius;
      const rot = this.angle + t * this.speed;

      ctx.save();
      ctx.strokeStyle = 'rgba(' + PL.r + ',' + PL.g + ',' + PL.b + ',0.08)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      for (let i = 0; i < 24; i++) {
        const a = rot + (i / 24) * Math.PI * 2;
        const r = orbitR + Math.sin(t * 0.02 + i * 0.7) * orbitR * 0.25;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.55;
        const len = 18 + Math.sin(t * 0.03 + i) * 8;
        const tx = Math.cos(a + Math.PI / 2);
        const ty = Math.sin(a + Math.PI / 2) * 0.55;
        ctx.beginPath();
        ctx.moveTo(x - tx * len, y - ty * len);
        ctx.lineTo(x + tx * len, y + ty * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  class Spark {
    constructor() {
      this.reset(true);
    }

    reset(scatter) {
      this.x = scatter ? Math.random() * width : width * 0.5;
      this.y = scatter ? Math.random() * height : height * 0.32;
      const a = Math.random() * Math.PI * 2;
      const s = 0.15 + Math.random() * 0.55;
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
      this.life = 80 + Math.random() * 120;
      this.maxLife = this.life;
      this.sprite = glyphSprites[Math.floor(Math.random() * glyphSprites.length)];
      this.size = 6 + Math.random() * 10;
      this.angle = Math.random() * Math.PI * 2;
      this.spin = (Math.random() - 0.5) * 0.02;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.angle += this.spin;
      this.life--;
      if (this.life <= 0 || this.x < -30 || this.x > width + 30 || this.y < -30 || this.y > height + 30) {
        this.reset(false);
      }
    }

    draw() {
      const fade = this.life / this.maxLife;
      ctx.save();
      ctx.globalAlpha = fade * 0.55;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.drawImage(this.sprite, -this.size / 2, -this.size / 2, this.size, this.size);
      ctx.restore();
    }
  }

  class Flash {
    constructor() {
      this.active = false;
      this.cooldown = 200 + Math.random() * 400;
      this.x = 0;
      this.y = 0;
      this.life = 0;
      this.maxLife = 1;
      this.segments = [];
    }

    trigger() {
      this.active = true;
      this.x = Math.random() * width;
      this.y = Math.random() * height * 0.5;
      this.maxLife = 12 + Math.random() * 14;
      this.life = this.maxLife;
      this.segments = [];
      let cx = this.x;
      let cy = this.y;
      for (let i = 0; i < 5; i++) {
        const nx = cx + (Math.random() - 0.5) * 120;
        const ny = cy + 30 + Math.random() * 80;
        this.segments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx;
        cy = ny;
      }
    }

    update() {
      if (!this.active) {
        this.cooldown--;
        if (this.cooldown <= 0) this.trigger();
        return;
      }
      this.life--;
      if (this.life <= 0) {
        this.active = false;
        this.cooldown = 180 + Math.random() * 380;
      }
    }

    draw() {
      if (!this.active) return;
      const fade = this.life / this.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(200, 220, 235,' + (0.6 * fade) + ')';
      ctx.lineWidth = 1.5 + fade * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      this.segments.forEach((seg, i) => {
        if (i === 0) ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  class Star {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = 0.3 + Math.random() * 0.9;
      this.alpha = 0.1 + Math.random() * 0.35;
      this.twinkle = Math.random() * Math.PI * 2;
      this.twinkleSpeed = 0.01 + Math.random() * 0.03;
    }

    update() {
      this.twinkle += this.twinkleSpeed;
    }

    draw() {
      const a = this.alpha * (0.6 + 0.4 * Math.sin(this.twinkle));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(' + SG.r + ',' + SG.g + ',' + SG.b + ',1)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const windStreams = [];
  for (let i = 0; i < 4; i++) windStreams.push(new WindStream(i));

  const sparks = [];
  for (let i = 0; i < 70; i++) sparks.push(new Spark());

  const flashes = [];
  for (let i = 0; i < 3; i++) flashes.push(new Flash());

  const starField = [];
  for (let i = 0; i < 140; i++) starField.push(new Star());

  const pointer = { x: 0.5, y: 0.5, active: false };
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) {
    window.addEventListener('mousemove', (e) => {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.active = true;
    }, { passive: true });
  }

  let running = true;
  let rafId = null;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else {
      running = true;
      if (!reduced) rafId = requestAnimationFrame(draw);
    }
  });

  function drawWingedDisc(t) {
    const cx = width * 0.5;
    const cy = height * 0.32;
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.015);
    const discR = Math.min(width, height) * 0.055 * pulse;

    // Royal beam downward
    const beam = ctx.createLinearGradient(cx, cy, cx, height * 0.82);
    beam.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.08 * pulse) + ')');
    beam.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
    ctx.save();
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.008, cy);
    ctx.lineTo(cx + width * 0.008, cy);
    ctx.lineTo(cx + width * 0.04, height * 0.82);
    ctx.lineTo(cx - width * 0.04, height * 0.82);
    ctx.closePath();
    ctx.fill();

    // Wings
    const flap = Math.sin(t * 0.008) * 0.06;
    ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.10)';
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.35 * pulse) + ')';
    ctx.lineWidth = 1.2;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(side, 1);
      ctx.rotate(flap);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(discR * 1.6, -discR * 1.4, discR * 3.2, -discR * 0.9, discR * 4.2, 0);
      ctx.bezierCurveTo(discR * 3.0, discR * 0.6, discR * 1.6, discR * 0.4, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Outer halo
    const halo = ctx.createRadialGradient(cx, cy, discR * 0.6, cx, cy, discR * 2.2);
    halo.addColorStop(0, 'rgba(255, 246, 214,' + (0.35 * pulse) + ')');
    halo.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.15 * pulse) + ')');
    halo.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, discR * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Disc body
    ctx.fillStyle = 'rgba(30, 26, 16,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.6 * pulse) + ')';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Inner sun
    ctx.fillStyle = 'rgba(255, 246, 214,' + (0.9 * pulse) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, discR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBackground(t) {
    // Deep lapis radial glow
    const grad = ctx.createRadialGradient(
      width * 0.5, height * 0.28, 0,
      width * 0.5, height * 0.28, Math.max(width, height) * 0.9
    );
    grad.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.55 + 0.05 * Math.sin(t * 0.005)) + ')');
    grad.addColorStop(0.5, 'rgba(15, 31, 51,0.85)');
    grad.addColorStop(1, 'rgba(8, 16, 28,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Horizon city silhouette (Esagila / Etemenanki)
    ctx.save();
    ctx.fillStyle = 'rgba(8, 16, 28, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.82);
    const towerX = width * 0.5;
    const baseY = height * 0.82;
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const w = width * (0.18 - i * 0.025);
      const y = baseY - height * (0.04 + i * 0.035);
      ctx.lineTo(towerX - w / 2, y);
      ctx.lineTo(towerX - w / 2, y - height * 0.02);
      ctx.lineTo(towerX + w / 2, y - height * 0.02);
      ctx.lineTo(towerX + w / 2, y);
    }
    ctx.lineTo(towerX, height * 0.45);
    ctx.lineTo(width, height * 0.82);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let t = 0;
  function draw() {
    if (!running || !ctx) return;
    t += 1;

    ctx.clearRect(0, 0, width, height);

    drawBackground(t);

    starField.forEach((s) => {
      s.update();
      s.draw();
    });

    // Parallax tilt toward pointer
    const targetTiltX = pointer.active ? pointer.x - 0.5 : 0;
    const targetTiltY = pointer.active ? pointer.y - 0.5 : 0;
    const tiltX = targetTiltX + Math.sin(t * 0.001) * 0.02;
    const tiltY = targetTiltY + Math.cos(t * 0.0015) * 0.02;

    ctx.save();
    ctx.translate(width * 0.5, height * 0.32);
    ctx.rotate(tiltX * 0.04);
    ctx.translate(-width * 0.5, -height * 0.32);

    drawWingedDisc(t);
    windStreams.forEach((w) => w.draw(t));
    ctx.restore();

    sparks.forEach((s) => {
      s.update();
      s.draw();
    });
    flashes.forEach((f) => {
      f.update();
      f.draw();
    });

    if (!reduced) rafId = requestAnimationFrame(draw);
  }

  draw();
})();
