// Telipinu — Vanishing God Field
// A canvas effect that breathes between fertile gold and withdrawn brown,
// tracing the Hittite god's departure and ritual return across an Anatolian plain.
(function() {
  'use strict';

  const canvas = document.getElementById('telipinu-hero-canvas');
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

  const P = readColor('data-primary', '#c9a227'); // fertile gold
  const S = readColor('data-secondary', '#4a7c59'); // Anatolian green

  let width, height, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStalks();
  }

  resize();
  window.addEventListener('resize', resize);

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  const STALK_COUNT = 180;
  const PATH_MOTE_COUNT = 40;

  let stalks = [];
  let pathMotes = [];
  let bee = null;
  let sunPulse = 0;
  let mood = 0; // 0 = withdrawn/brown, 1 = fertile/gold
  let targetMood = 1;

  function seedStalks() {
    stalks = [];
    for (let i = 0; i < STALK_COUNT; i++) {
      stalks.push({
        x: Math.random() * width,
        baseY: height * (0.78 + Math.random() * 0.12),
        h: 40 + Math.random() * 90,
        lean: (Math.random() - 0.5) * 0.25,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.002 + Math.random() * 0.004,
        thickness: 1.2 + Math.random() * 1.6,
        headSize: 2 + Math.random() * 4,
        depth: Math.random() // 0 distant, 1 near
      });
    }
    stalks.sort((a, b) => a.depth - b.depth);
  }

  class PathMote {
    constructor() {
      this.reset(true);
    }

    reset(scatter) {
      this.x = scatter ? Math.random() * width : -20;
      this.y = height * (0.55 + Math.random() * 0.25);
      this.vx = 0.3 + Math.random() * 0.5;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.size = 0.8 + Math.random() * 1.6;
      this.alpha = 0.08 + Math.random() * 0.18;
      this.wobble = Math.random() * Math.PI * 2;
    }

    update() {
      this.wobble += 0.03;
      this.x += this.vx + Math.sin(this.wobble) * 0.2;
      this.y += this.vy;
      if (this.x > width + 20) this.reset(false);
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#f5eac7';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Bee {
    constructor() {
      this.x = width * 0.85;
      this.y = height * 0.35;
      this.tx = this.x;
      this.ty = this.y;
      this.phase = 0;
      this.size = 3.2;
      this.trail = [];
    }

    update(t) {
      this.phase += 0.08;
      // Wander in a lazy figure-eight over the field
      this.tx = width * (0.5 + 0.35 * Math.sin(t * 0.0004));
      this.ty = height * (0.28 + 0.14 * Math.sin(t * 0.0007));
      this.x += (this.tx - this.x) * 0.015;
      this.y += (this.ty - this.y) * 0.015;

      this.trail.push({ x: this.x, y: this.y, life: 1 });
      this.trail.forEach(p => { p.life -= 0.03; });
      this.trail = this.trail.filter(p => p.life > 0);
      if (this.trail.length > 24) this.trail.shift();
    }

    draw() {
      // Trail
      ctx.save();
      this.trail.forEach((p, i) => {
        const a = p.life * 0.35 * (i / this.trail.length);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Body
      ctx.save();
      ctx.translate(this.x, this.y);
      const buzz = Math.sin(this.phase) * 1.2;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#f4a261';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stripes
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(-1.2, -1.6, 0.8, 3.2);
      ctx.fillRect(0.6, -1.4, 0.7, 2.8);
      // Wings
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#e9ecef';
      ctx.beginPath();
      ctx.ellipse(-1.5, -2.4 + buzz, 2.6, 1.1, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1.5, -2.4 - buzz, 2.6, 1.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  seedStalks();
  for (let i = 0; i < PATH_MOTE_COUNT; i++) pathMotes.push(new PathMote());
  bee = new Bee();

  function drawSky(t) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a1814');
    g.addColorStop(0.55, '#2d2418');
    g.addColorStop(1, '#3d2f1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Distant sun / divine presence, tinted by theme colors
    const sx = width * 0.72;
    const sy = height * 0.22;
    sunPulse = 0.92 + 0.08 * Math.sin(t * 0.0012);
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(width, height) * 0.35);
    glow.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${0.12 * sunPulse})`);
    glow.addColorStop(0.45, `rgba(${P.r}, ${P.g}, ${P.b}, ${0.05 * sunPulse})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function drawField(t) {
    // Mood eases between withdrawn (brown) and fertile (gold-green)
    mood += (targetMood - mood) * 0.003;
    const cycle = 0.5 + 0.5 * Math.sin(t * 0.00035);
    targetMood = 0.35 + 0.65 * cycle; // gentle oscillation

    const baseHue = lerp(32, 48, mood); // brown-gold to warm gold
    const sat = lerp(35, 72, mood);
    const lit = lerp(22, 46, mood);

    // Ground plane
    const groundY = height * 0.58;
    const g = ctx.createLinearGradient(0, groundY, 0, height);
    g.addColorStop(0, `hsl(${baseHue}, ${sat}%, ${lit - 6}%)`);
    g.addColorStop(1, `hsl(${baseHue}, ${sat - 10}%, ${lit - 14}%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, width, height - groundY);

    // Stalks
    stalks.forEach(s => {
      const sway = Math.sin(t * s.swaySpeed + s.swayPhase) * (0.05 + mood * 0.04);
      const tipX = s.x + Math.sin(s.lean + sway) * s.h * 0.5;
      const tipY = s.baseY - s.h;
      const d = s.depth;
      const alpha = 0.35 + d * 0.55;
      const stalkHue = lerp(34, 46, mood * d);
      const stalkLit = lerp(26, 58, mood * d);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${stalkHue}, ${sat - 10 + d * 15}%, ${stalkLit}%)`;
      ctx.lineWidth = s.thickness * (0.6 + d * 0.7);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.baseY);
      ctx.quadraticCurveTo(s.x + Math.sin(s.lean) * s.h * 0.25, s.baseY - s.h * 0.5, tipX, tipY);
      ctx.stroke();

      // Grain head
      ctx.fillStyle = `hsl(${stalkHue + 6}, ${sat + 10}%, ${stalkLit + 12}%)`;
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, s.headSize * (0.7 + d * 0.6), s.headSize * (0.4 + d * 0.3), sway, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    drawSky(time);
    drawField(time);

    pathMotes.forEach(m => { m.update(); m.draw(); });

    if (bee) {
      bee.update(time);
      bee.draw();
    }

    if (!reduced) requestAnimationFrame(draw);
  }

  function handleVisibility() {
    if (document.hidden) {
      // Animation loop naturally stops because the next RAF is deferred by the browser.
    } else {
      requestAnimationFrame(draw);
    }
  }

  document.addEventListener('visibilitychange', handleVisibility);

  draw(performance.now());
})();
