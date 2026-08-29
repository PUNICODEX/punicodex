/**
 * NINURTA — Lord of the Earth
 * Hero canvas: a bronze storm-mace hangs at the center of a slow cyclone;
 * defeated stones from the Kur drift outward and settle into furrows below.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('ninurta-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function readColor(attr, fb) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
  }

  const P = readColor('data-primary', '#8c5e2e');
  const S = readColor('data-secondary', '#6b7d8f');

  // Theme accents kept close to the original palette.
  const GOLD = '#d4af37';
  const DEEP_EARTH = '#2d241e';
  const BRONZE_LIGHT = '#b8863e';
  const STONE = '#a89f91';
  const FURROW = '#4a6741';

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
    buildFurrows();
  }
  resize();
  window.addEventListener('resize', resize);

  let frame = 0;
  let motes = [];
  let stones = [];
  let furrows = [];

  const STONE_COUNT = 28;
  const MOTE_COUNT = 90;

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function buildFurrows() {
    furrows = [];
    const baseY = height * 0.82;
    const count = Math.max(2, Math.floor(width / 80));
    for (let i = 0; i < count; i++) {
      furrows.push({
        x: (i / Math.max(1, count - 1)) * width,
        y: baseY + Math.sin(i * 1.7) * 8,
        w: randomRange(60, 140),
        alpha: randomRange(0.12, 0.28)
      });
    }
  }

  function initMotes() {
    motes = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: randomRange(0.5, 2.2),
        alpha: randomRange(0.08, 0.35),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function initStones() {
    stones = [];
    for (let i = 0; i < STONE_COUNT; i++) {
      resetStone(i, true);
    }
  }

  function resetStone(i, scatter) {
    const angle = randomRange(0, Math.PI * 2);
    const radius = scatter ? randomRange(40, Math.min(width, height) * 0.42) : randomRange(20, 60);
    const color = hexToRgb(STONE);
    stones[i] = {
      x: width * 0.5 + Math.cos(angle) * radius,
      y: height * 0.42 + Math.sin(angle) * radius * 0.55,
      vx: Math.cos(angle) * randomRange(0.15, 0.45),
      vy: Math.sin(angle) * randomRange(0.05, 0.25) + 0.1,
      size: randomRange(2, 5.5),
      rot: randomRange(0, Math.PI * 2),
      rotSpeed: randomRange(-0.02, 0.02),
      alpha: randomRange(0.18, 0.45),
      color: color,
      settled: false,
      settleY: height * randomRange(0.76, 0.92)
    };
  }

  function drawMace(cx, cy, t) {
    const scale = Math.min(width, height) * 0.00042;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.003) * 0.04);
    ctx.scale(scale, scale);

    // Storm radiance behind mace (secondary color)
    const rays = 16;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + t * 0.002;
      const len = 220 + Math.sin(t * 0.04 + i) * 30;
      const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
      g.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.16)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }

    // Mace head (octagonal) — primary color
    ctx.fillStyle = 'rgb(' + P.r + ',' + P.g + ',' + P.b + ')';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 55 : 42;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Mace head highlight
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    // Mace shaft
    ctx.fillStyle = DEEP_EARTH;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(-10, 0, 20, 260);
    ctx.strokeStyle = BRONZE_LIGHT;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(-10, 0, 20, 260);

    // Inscribed band (the "speaking" mace)
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.008);
    ctx.fillRect(-14, 100, 28, 12);

    ctx.restore();
  }

  function drawCyclone(cx, cy, t) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.55);
    g.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)');
    g.addColorStop(0.6, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.03)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.12)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const turns = 2.5 + i * 0.4;
      const maxR = 120 + i * 60;
      for (let a = 0; a < turns * Math.PI * 2; a += 0.08) {
        const r = (a / (turns * Math.PI * 2)) * maxR;
        const x = Math.cos(a + t * 0.002 * (i % 2 === 0 ? 1 : -1)) * r;
        const y = Math.sin(a + t * 0.002 * (i % 2 === 0 ? 1 : -1)) * r * 0.55;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFurrows() {
    ctx.save();
    ctx.lineWidth = 2;
    const c = hexToRgb(FURROW);
    furrows.forEach(f => {
      ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + f.alpha + ')';
      ctx.beginPath();
      ctx.moveTo(f.x - f.w / 2, f.y);
      ctx.quadraticCurveTo(f.x, f.y + 6, f.x + f.w / 2, f.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function updateAndDrawMotes(t) {
    motes.forEach(m => {
      m.x += m.vx;
      m.y += m.vy;
      if (m.x < -10) m.x = width + 10;
      if (m.x > width + 10) m.x = -10;
      if (m.y < -10) m.y = height + 10;
      if (m.y > height + 10) m.y = -10;

      ctx.fillStyle = 'rgba(212,200,180,' + (m.alpha * (0.7 + 0.3 * Math.sin(t * 0.01 + m.phase))) + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function updateAndDrawStones(t) {
    stones.forEach((s, i) => {
      if (s.settled) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = 'rgba(' + s.color.r + ',' + s.color.g + ',' + s.color.b + ',' + s.alpha + ')';
        ctx.fillRect(-s.size, -s.size * 0.7, s.size * 2, s.size * 1.4);
        ctx.restore();
        return;
      }

      s.x += s.vx;
      s.y += s.vy;
      s.rot += s.rotSpeed;
      s.vx *= 0.995;
      s.vy *= 0.995;
      s.vy += 0.02;

      if (s.y >= s.settleY) {
        s.settled = true;
        s.y = s.settleY + Math.sin(i) * 4;
      }

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = 'rgba(' + s.color.r + ',' + s.color.g + ',' + s.color.b + ',' + s.alpha + ')';
      ctx.beginPath();
      ctx.moveTo(-s.size, -s.size * 0.6);
      ctx.lineTo(s.size * 0.7, -s.size);
      ctx.lineTo(s.size, s.size * 0.5);
      ctx.lineTo(-s.size * 0.6, s.size * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Respawn settled stones slowly to keep the cycle alive
    if (frame % 240 === 0) {
      const settled = stones.filter(s => s.settled);
      if (settled.length > 5) {
        const idx = stones.indexOf(settled[Math.floor(Math.random() * settled.length)]);
        resetStone(idx, false);
      }
    }
  }

  initMotes();
  initStones();

  function draw() {
    frame++;
    const t = frame;

    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.38;

    drawCyclone(cx, cy, t);
    drawFurrows();
    drawMace(cx, cy, t);
    updateAndDrawStones(t);
    updateAndDrawMotes(t);

    if (!reduced) {
      requestAnimationFrame(draw);
    }
  }

  draw();
})();
