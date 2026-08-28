/**
 * ENKIDU — Wild Man at the Watering Hole
 * Bespoke hero canvas effect for the Enkidu flagship temple.
 *
 * Visual theme: the Mesopotamian steppe at night, a clay-born figure at the
 * edge of the watering hole where the wild and the civilized first meet.
 * Gazelles streak past as living brushstrokes, dust and clay motes rise from
 * the earth, and a faint twin-pulse recalls the friendship with Gilgamesh.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('enkidu-hero-canvas');
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

  const P = readColor('data-primary', '#8B5A2B');
  const S = readColor('data-secondary', '#C4A77D');

  let width, height, dpr;
  let stars = [];
  let gazelleStreaks = [];
  let clayMotes = [];
  let reeds = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  resize();
  window.addEventListener('resize', resize);

  function seed() {
    seedStars();
    seedGazelles();
    seedClay();
    seedReeds();
  }

  function seedStars() {
    stars = [];
    const count = Math.max(40, Math.floor((width * height) / 18000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.65,
        size: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.015
      });
    }
  }

  function seedGazelles() {
    gazelleStreaks = [];
    const count = Math.max(5, Math.floor(width / 220));
    for (let i = 0; i < count; i++) {
      gazelleStreaks.push(makeGazelle(true));
    }
  }

  function makeGazelle(scatter) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    return {
      x: scatter ? Math.random() : direction === 1 ? -0.1 : 1.1,
      y: 0.62 + Math.random() * 0.18,
      speed: (0.0004 + Math.random() * 0.0006) * direction,
      size: 0.5 + Math.random() * 0.6,
      alpha: 0.12 + Math.random() * 0.14,
      phase: Math.random() * Math.PI * 2
    };
  }

  function seedClay() {
    clayMotes = [];
    const count = Math.max(30, Math.floor((width * height) / 25000));
    for (let i = 0; i < count; i++) {
      clayMotes.push({
        x: Math.random(),
        y: 0.75 + Math.random() * 0.25,
        vy: -(0.0002 + Math.random() * 0.0004),
        vx: (Math.random() - 0.5) * 0.0002,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.08 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function seedReeds() {
    reeds = [];
    const count = Math.max(18, Math.floor(width / 60));
    for (let i = 0; i < count; i++) {
      reeds.push({
        x: i / (count - 1),
        h: 0.08 + Math.random() * 0.12,
        lean: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#2F3A30' : '#3A2F20'
      });
    }
  }

  function draw(timestamp) {
    const t = timestamp * 0.001;

    ctx.clearRect(0, 0, width, height);

    // Night steppe gradient.
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#101418');
    sky.addColorStop(0.55, '#1A1E1A');
    sky.addColorStop(0.78, '#2A2219');
    sky.addColorStop(1, '#3D2E1E');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    drawStars(t);
    drawWateringHole(t);
    drawReeds(t);
    drawTwinPulse(t);
    drawGazelles(t);
    drawClayMotes(t);

    if (!reduced) {
      requestAnimationFrame(draw);
    }
  }

  function drawStars(t) {
    ctx.save();
    for (const s of stars) {
      const alpha = 0.25 + 0.25 * Math.sin(t * s.speed + s.phase);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#E8DCC8';
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWateringHole(t) {
    const horizonY = height * 0.68;
    const pondW = width * 0.85;
    const pondH = height * 0.16;
    const cx = width * 0.5;
    const cy = horizonY + pondH * 0.35;

    // Dark water surface.
    ctx.save();
    ctx.globalAlpha = 0.55;
    const water = ctx.createRadialGradient(cx, cy, 0, cx, cy, pondW * 0.6);
    water.addColorStop(0, '#1C2E2E');
    water.addColorStop(0.6, '#142222');
    water.addColorStop(1, 'rgba(20,34,34,0)');
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pondW * 0.5, pondH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Slow ripple lines.
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const rx = pondW * (0.25 + i * 0.12 + 0.04 * Math.sin(t * 0.4 + i));
      const ry = pondH * (0.25 + i * 0.07);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawReeds(t) {
    const baseY = height * 0.82;
    ctx.save();
    for (const r of reeds) {
      const x = r.x * width;
      const reedH = r.h * height;
      const sway = Math.sin(t * 0.7 + r.phase) * 6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.5 + Math.random() * 0.5;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(
        x + sway + r.lean * width,
        baseY - reedH * 0.6,
        x + sway * 1.5 + r.lean * width * 1.5,
        baseY - reedH
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTwinPulse(t) {
    // A faint vertical bond between two silhouettes: Enkidu and Gilgamesh.
    const cx = width * 0.5;
    const baseY = height * 0.72;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);
    ctx.save();
    ctx.globalAlpha = 0.06 + pulse * 0.05;
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -t * 4;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.06, baseY);
    ctx.lineTo(cx - width * 0.02, height * 0.42);
    ctx.lineTo(cx + width * 0.02, height * 0.42);
    ctx.lineTo(cx + width * 0.06, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Twin heartbeats.
    ctx.globalAlpha = 0.12 + pulse * 0.08;
    ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
    for (const dx of [-width * 0.06, width * 0.06]) {
      ctx.beginPath();
      ctx.arc(cx + dx, baseY, 4 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGazelles(t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < gazelleStreaks.length; i++) {
      const g = gazelleStreaks[i];
      if (!reduced) {
        g.x += g.speed;
        if (g.x > 1.15) g.x = -0.15;
        if (g.x < -0.15) g.x = 1.15;
      }

      const x = g.x * width;
      const y = g.y * height;
      const size = g.size * 22;
      const leap = Math.sin(t * 3 + g.phase) * 6;

      ctx.globalAlpha = g.alpha;

      // Gazelle silhouette: small head, arched neck, bounding legs.
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, y + leap);
      ctx.quadraticCurveTo(
        x - size * 0.2,
        y - size * 0.4 + leap,
        x + size * 0.2,
        y - size * 0.3 + leap
      );
      ctx.quadraticCurveTo(
        x + size * 0.55,
        y - size * 0.1 + leap,
        x + size * 0.7,
        y + leap
      );
      ctx.stroke();

      // Legs.
      ctx.beginPath();
      ctx.moveTo(x - size * 0.1, y + leap);
      ctx.lineTo(x - size * 0.25, y + size * 0.45 + leap * 0.3);
      ctx.moveTo(x + size * 0.15, y + leap);
      ctx.lineTo(x + size * 0.35, y + size * 0.45 - leap * 0.3);
      ctx.stroke();

      // Horns.
      ctx.beginPath();
      ctx.moveTo(x + size * 0.35, y - size * 0.25 + leap);
      ctx.quadraticCurveTo(
        x + size * 0.5,
        y - size * 0.55 + leap,
        x + size * 0.55,
        y - size * 0.35 + leap
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawClayMotes(t) {
    ctx.save();
    ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
    for (const m of clayMotes) {
      if (!reduced) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < 0.45) {
          m.y = 0.95;
          m.x = Math.random();
        }
      }
      const drift = Math.sin(t * 0.5 + m.phase) * 2;
      ctx.globalAlpha = m.alpha * (0.6 + 0.4 * Math.sin(t + m.phase));
      ctx.beginPath();
      ctx.arc(m.x * width + drift, m.y * height, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  draw();
})();
