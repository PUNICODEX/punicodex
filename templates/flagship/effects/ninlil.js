// Ninlil — Lady of the Wind; drifting wind-ribbons, cuneiform breath-glyphs, and grain-seed motes
(function () {
  'use strict';
  const canvas = document.getElementById('ninlil-hero-canvas');
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
  const P = readColor('data-primary', '#d8c6a0');
  const S = readColor('data-secondary', '#a8c4d9');

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

  const CUNEIFORM_GLYPHS = ['𒀭', '𒊩', '𒌆', '𒆤', '𒀯', '𒆠'];

  let ribbons = [];
  let motes = [];
  let glyphs = [];
  let sheaves = [];

  class WindRibbon {
    constructor(index, total) {
      this.index = index;
      this.total = total;
      this.depth = index / Math.max(total - 1, 1);
      this.reset(true);
    }
    reset(scatter) {
      this.yBase = scatter
        ? Math.random() * height
        : height * (0.15 + this.depth * 0.7);
      this.amplitude = 18 + this.depth * 42;
      this.wavelength = 0.003 + this.depth * 0.004;
      this.speed = 0.002 + this.depth * 0.003;
      this.phase = Math.random() * Math.PI * 2;
      this.opacity = 0.04 + this.depth * 0.12;
      this.stroke = 1.2 + this.depth * 2.2;
    }
    draw(t) {
      const y0 = this.yBase + Math.sin(t * 0.0005 + this.index) * height * 0.08;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
      ctx.lineWidth = this.stroke;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let x = -40; x <= width + 40; x += 24) {
        const y =
          y0 +
          Math.sin(x * this.wavelength + this.phase + t * this.speed) * this.amplitude +
          Math.sin(x * this.wavelength * 2.1 - t * this.speed * 1.3) *
            (this.amplitude * 0.35);
        if (x === -40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  class GrainMote {
    constructor() {
      this.reset(true);
    }
    reset(scatter) {
      this.x = scatter ? Math.random() * width : -10;
      this.y = scatter ? Math.random() * height : height * (0.2 + Math.random() * 0.6);
      this.size = 0.6 + Math.random() * 1.8;
      this.speedX = 0.3 + Math.random() * 1.2;
      this.speedY = (Math.random() - 0.5) * 0.4;
      this.alpha = 0.15 + Math.random() * 0.35;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY + Math.sin(this.x * 0.01) * 0.2;
      if (this.x > width + 10 || this.y < -10 || this.y > height + 10) {
        this.x = -10;
        this.y = height * (0.2 + Math.random() * 0.6);
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class BreathGlyph {
    constructor() {
      this.reset(true);
    }
    reset(scatter) {
      this.char = CUNEIFORM_GLYPHS[Math.floor(Math.random() * CUNEIFORM_GLYPHS.length)];
      this.x = scatter ? Math.random() * width : -60;
      this.y = height * (0.1 + Math.random() * 0.8);
      this.size = 14 + Math.random() * 22;
      this.speedX = 0.2 + Math.random() * 0.6;
      this.speedY = (Math.random() - 0.5) * 0.25;
      this.alpha = 0;
      this.targetAlpha = 0.06 + Math.random() * 0.12;
      this.phase = Math.random() * Math.PI * 2;
      this.life = 0;
      this.maxLife = 300 + Math.random() * 300;
    }
    update() {
      this.life++;
      this.x += this.speedX;
      this.y += this.speedY + Math.sin(this.life * 0.01 + this.phase) * 0.3;
      const fadeIn = Math.min(this.life / 80, 1);
      const fadeOut =
        this.life > this.maxLife - 120
          ? Math.max((this.maxLife - this.life) / 120, 0)
          : 1;
      this.alpha = this.targetAlpha * fadeIn * fadeOut;
      if (this.life >= this.maxLife || this.x > width + 60) {
        this.reset(false);
      }
    }
    draw() {
      if (this.alpha <= 0.001) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
      ctx.font = this.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.char, this.x, this.y);
      ctx.restore();
    }
  }

  class ReedSheaf {
    constructor(x) {
      this.x = x;
      this.height = 40 + Math.random() * 70;
      this.lean = (Math.random() - 0.5) * 0.2;
      this.swayPhase = Math.random() * Math.PI * 2;
    }
    draw(t) {
      const sway = Math.sin(t * 0.002 + this.swayPhase) * 6;
      const topX = this.x + sway + this.lean * this.height;
      const topY = height - this.height;
      ctx.save();
      ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, height);
      ctx.quadraticCurveTo(
        this.x + sway * 0.5,
        height - this.height * 0.5,
        topX,
        topY,
      );
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
      ctx.beginPath();
      ctx.ellipse(topX, topY, 3, 9, this.lean, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function rebuildScene() {
    ribbons = [];
    for (let i = 0; i < 7; i++) ribbons.push(new WindRibbon(i, 7));

    sheaves = [];
    const sheafCount = Math.floor(width / 35);
    for (let i = 0; i < sheafCount; i++) {
      sheaves.push(new ReedSheaf((i + 0.5) * (width / sheafCount)));
    }
  }
  rebuildScene();
  window.addEventListener('resize', rebuildScene);

  motes = [];
  for (let i = 0; i < 90; i++) motes.push(new GrainMote());

  glyphs = [];
  for (let i = 0; i < 8; i++) glyphs.push(new BreathGlyph());

  let frame = 0;
  function draw() {
    frame++;
    const t = frame;

    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#151821');
    grad.addColorStop(0.55, '#1d2029');
    grad.addColorStop(1, '#2a2520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.25,
      0,
      width * 0.5,
      height * 0.25,
      Math.max(width, height) * 0.6,
    );
    glow.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)');
    glow.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.03)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ribbons.forEach((r) => r.draw(t));
    sheaves.forEach((s) => s.draw(t));
    motes.forEach((m) => {
      m.update();
      m.draw();
    });
    glyphs.forEach((g) => {
      g.update();
      g.draw();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
