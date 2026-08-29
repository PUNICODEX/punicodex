/**
 * ARINNA — Hittite Sun Goddess of Arinna
 * Bespoke hero canvas: solar disk, golden rays, Anatolian bronze motifs.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('arinniti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Palette: Anatolian bronze and solar gold
  const BRONZE = { r: 184, g: 115, b: 51 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const AMBER = { r: 255, g: 191, b: 0 };
  const CREAM = { r: 255, g: 248, b: 220 };

  let t = 0;

  const rays = [];
  const RAY_COUNT = 36;
  for (let i = 0; i < RAY_COUNT; i++) {
    rays.push({
      angle: (i / RAY_COUNT) * Math.PI * 2,
      length: 140 + Math.random() * 120,
      width: 1 + Math.random() * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.005 + Math.random() * 0.01
    });
  }

  const motes = [];
  const MOTE_COUNT = 70;
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.4,
      alpha: 0.15 + Math.random() * 0.35,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  const rings = [];
  const RING_COUNT = 4;
  for (let i = 0; i < RING_COUNT; i++) {
    rings.push({
      radius: 80 + i * 55,
      alpha: 0.04 - i * 0.007,
      speed: 0.0003 + i * 0.0002
    });
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#0d0805');
    g.addColorStop(0.55, '#1a1008');
    g.addColorStop(1, '#120a05');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function drawSunDisk() {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const baseRadius = Math.min(width, height) * 0.13;
    const pulse = 1 + 0.04 * Math.sin(t * 0.03);

    // Outer corona glow
    const corona = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, baseRadius * 2.2 * pulse);
    corona.addColorStop(0, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0.22)`);
    corona.addColorStop(0.4, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.08)`);
    corona.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Main disk
    const diskGrad = ctx.createRadialGradient(cx - baseRadius * 0.25, cy - baseRadius * 0.25, 0, cx, cy, baseRadius);
    diskGrad.addColorStop(0, `rgb(${CREAM.r}, ${CREAM.g}, ${CREAM.b})`);
    diskGrad.addColorStop(0.55, `rgb(${AMBER.r}, ${AMBER.g}, ${AMBER.b})`);
    diskGrad.addColorStop(1, `rgb(${GOLD.r}, ${GOLD.g}, ${GOLD.b})`);
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner warm core
    ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, 0.45)`;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRays() {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const diskRadius = Math.min(width, height) * 0.13;
    const rotation = reduced ? 0 : t * 0.002;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    for (const r of rays) {
      r.pulsePhase += reduced ? 0 : r.pulseSpeed;
      const opacity = 0.08 + 0.06 * Math.sin(r.pulsePhase);
      const length = r.length * (0.9 + 0.1 * Math.sin(r.pulsePhase));

      ctx.save();
      ctx.rotate(r.angle);
      const grad = ctx.createLinearGradient(diskRadius, 0, diskRadius + length, 0);
      grad.addColorStop(0, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${opacity})`);
      grad.addColorStop(0.5, `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${opacity * 0.6})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(diskRadius, -r.width * 0.5);
      ctx.lineTo(diskRadius + length, -r.width * 1.5);
      ctx.lineTo(diskRadius + length, r.width * 1.5);
      ctx.lineTo(diskRadius, r.width * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawBronzeRings() {
    const cx = width * 0.5;
    const cy = height * 0.42;

    ctx.strokeStyle = `rgba(${BRONZE.r}, ${BRONZE.g}, ${BRONZE.b}, 0.18)`;
    ctx.lineWidth = 1.5;

    for (const ring of rings) {
      const rotation = reduced ? 0 : t * ring.speed;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Anatolian triangular ticks
      const ticks = 12;
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2;
        const x = Math.cos(a) * ring.radius;
        const y = Math.sin(a) * ring.radius;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a + Math.PI * 0.5) * 8, y + Math.sin(a + Math.PI * 0.5) * 8);
        ctx.lineTo(x + Math.cos(a - Math.PI * 0.5) * 8, y + Math.sin(a - Math.PI * 0.5) * 8);
        ctx.closePath();
        ctx.fillStyle = `rgba(${BRONZE.r}, ${BRONZE.g}, ${BRONZE.b}, ${ring.alpha * 2})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawMotes() {
    for (const m of motes) {
      if (!reduced) {
        m.x += m.vx;
        m.y += m.vy;
        m.twinkle += 0.03;
      }

      if (m.y < -10) m.y = height + 10;
      if (m.x < -10) m.x = width + 10;
      if (m.x > width + 10) m.x = -10;

      const alpha = m.alpha * (0.6 + 0.4 * Math.sin(m.twinkle));
      ctx.fillStyle = `rgba(${CREAM.r}, ${CREAM.g}, ${CREAM.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.42, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawBronzeRings();
    drawRays();
    drawSunDisk();
    drawMotes();
    drawVignette();
    t++;
    requestAnimationFrame(draw);
  }

  if (reduced) {
    // Render one static frame, then stop
    drawBackground();
    drawBronzeRings();
    drawRays();
    drawSunDisk();
    drawMotes();
    drawVignette();
  } else {
    draw();
  }
}());
