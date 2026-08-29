/**
 * INARAS — Hittite Goddess of Wild Animals and the Hunt
 * Bespoke hero canvas: mountain forests, running stags, spears, moonlight.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('inaras-canvas');
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

  // Palette: midnight mountains, forest shadows, moon silver, spear steel
  const MIDNIGHT = { r: 12, g: 18, b: 32 };
  const FOREST = { r: 20, g: 40, b: 28 };
  const MOON = { r: 220, g: 230, b: 240 };
  const SILVER = { r: 176, g: 196, b: 222 };
  const SPEAR = { r: 140, g: 155, b: 170 };

  let t = 0;

  const stars = [];
  const STAR_COUNT = 90;
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.65,
      r: 0.4 + Math.random() * 1.2,
      alpha: 0.15 + Math.random() * 0.45,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  const stags = [];
  const STAG_COUNT = 3;
  for (let i = 0; i < STAG_COUNT; i++) {
    stags.push({
      x: Math.random() * width,
      y: height * (0.62 + Math.random() * 0.08),
      scale: 0.6 + Math.random() * 0.5,
      speed: 0.4 + Math.random() * 0.5,
      opacity: 0.12 + Math.random() * 0.08
    });
  }

  const spears = [];
  const SPEAR_COUNT = 5;
  for (let i = 0; i < SPEAR_COUNT; i++) {
    spears.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      length: 40 + Math.random() * 50,
      speed: 1 + Math.random() * 1.5,
      opacity: 0.08 + Math.random() * 0.1,
      angle: Math.PI * 0.08 + (Math.random() - 0.5) * 0.15
    });
  }

  const fireflies = [];
  const FIREFLY_COUNT = 35;
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    fireflies.push({
      x: Math.random() * width,
      y: height * 0.55 + Math.random() * height * 0.45,
      r: 0.6 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: 0.2 + Math.random() * 0.3,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#05070c');
    g.addColorStop(0.45, '#0b1220');
    g.addColorStop(0.75, '#0d1a16');
    g.addColorStop(1, '#08100d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function drawMoon() {
    const cx = width * 0.78;
    const cy = height * 0.22;
    const r = Math.min(width, height) * 0.09;

    const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.2);
    glow.addColorStop(0, `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, 0.18)`);
    glow.addColorStop(0.5, `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, 0.06)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgb(${MOON.r}, ${MOON.g}, ${MOON.b})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Soft crater shadow
    ctx.fillStyle = 'rgba(160, 175, 195, 0.15)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy + r * 0.15, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStars() {
    for (const s of stars) {
      if (!reduced) s.twinkle += 0.02;
      const alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMountainLayer(color, peakFactor, offsetY, roughness) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 12) {
      const nx = x / width;
      const y = offsetY - peakFactor * height * (
        Math.sin(nx * Math.PI * 2.5 + roughness) * 0.5 +
        Math.sin(nx * Math.PI * 5 + roughness * 2) * 0.25 +
        Math.sin(nx * Math.PI * 9 + roughness * 3) * 0.12
      );
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  function drawMountains() {
    drawMountainLayer('rgba(16, 28, 40, 0.85)', 0.22, height * 0.82, 0.5);
    drawMountainLayer('rgba(14, 34, 28, 0.9)', 0.16, height * 0.86, 1.2);
    drawMountainLayer('rgba(8, 22, 16, 1)', 0.1, height * 0.9, 2.1);
  }

  function drawForest() {
    const treeBase = height * 0.9;
    const count = Math.floor(width / 80);
    ctx.fillStyle = 'rgba(6, 18, 12, 0.95)';

    for (let i = 0; i < count; i++) {
      const x = (i / count) * width + (Math.random() - 0.5) * 20;
      const h = height * (0.12 + Math.random() * 0.08);
      const w = h * 0.35;

      ctx.beginPath();
      ctx.moveTo(x, treeBase);
      ctx.lineTo(x + w * 0.5, treeBase - h * 0.2);
      ctx.lineTo(x + w * 0.25, treeBase - h * 0.2);
      ctx.lineTo(x + w * 0.6, treeBase - h * 0.55);
      ctx.lineTo(x + w * 0.3, treeBase - h * 0.55);
      ctx.lineTo(x + w * 0.8, treeBase - h * 0.9);
      ctx.lineTo(x - w * 0.8, treeBase - h * 0.9);
      ctx.lineTo(x - w * 0.3, treeBase - h * 0.55);
      ctx.lineTo(x - w * 0.6, treeBase - h * 0.55);
      ctx.lineTo(x - w * 0.25, treeBase - h * 0.2);
      ctx.lineTo(x - w * 0.5, treeBase - h * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawStag(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.scale, s.scale);
    ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, ${s.opacity})`;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck and head
    ctx.beginPath();
    ctx.moveTo(22, -8);
    ctx.quadraticCurveTo(34, -22, 44, -18);
    ctx.quadraticCurveTo(48, -14, 42, -8);
    ctx.quadraticCurveTo(34, -6, 28, 2);
    ctx.closePath();
    ctx.fill();

    // Antlers
    ctx.strokeStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, ${s.opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, -20);
    ctx.lineTo(42, -36);
    ctx.lineTo(38, -44);
    ctx.moveTo(42, -36);
    ctx.lineTo(48, -42);
    ctx.moveTo(40, -20);
    ctx.lineTo(36, -34);
    ctx.lineTo(30, -40);
    ctx.stroke();

    // Legs (running pose)
    ctx.lineWidth = 3;
    const stride = Math.sin(t * 0.08 + s.x * 0.01) * 12;
    ctx.beginPath();
    ctx.moveTo(-18, 10); ctx.lineTo(-22 + stride, 30);
    ctx.moveTo(-8, 10); ctx.lineTo(-4 - stride, 30);
    ctx.moveTo(14, 10); ctx.lineTo(18 + stride, 30);
    ctx.moveTo(22, 10); ctx.lineTo(26 - stride, 30);
    ctx.stroke();

    ctx.restore();
  }

  function drawSpear(sp) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.angle);

    const grad = ctx.createLinearGradient(0, 0, 0, sp.length);
    grad.addColorStop(0, `rgba(${SPEAR.r}, ${SPEAR.g}, ${SPEAR.b}, 0)`);
    grad.addColorStop(0.5, `rgba(${SPEAR.r}, ${SPEAR.g}, ${SPEAR.b}, ${sp.opacity})`);
    grad.addColorStop(1, `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, 0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, sp.length);
    ctx.stroke();

    // Spearhead
    ctx.fillStyle = `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, ${sp.opacity * 1.5})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, 10);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawFireflies() {
    for (const f of fireflies) {
      if (!reduced) {
        f.x += f.vx;
        f.y += f.vy;
        f.pulse += 0.04;
      }

      if (f.x < -10) f.x = width + 10;
      if (f.x > width + 10) f.x = -10;
      if (f.y < height * 0.5) f.y = height * 0.95;
      if (f.y > height + 10) f.y = height * 0.55;

      const alpha = f.alpha * (0.5 + 0.5 * Math.sin(f.pulse));
      ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g} - 20, ${MOON.b - 40}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.4, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawStars();
    drawMoon();

    if (!reduced) {
      for (const sp of spears) {
        sp.y += sp.speed;
        if (sp.y > height * 0.65) {
          sp.y = -sp.length;
          sp.x = Math.random() * width;
        }
        drawSpear(sp);
      }

      for (const s of stags) {
        s.x += s.speed;
        if (s.x > width + 80) s.x = -80;
        drawStag(s);
      }
    } else {
      spears.forEach(drawSpear);
      stags.forEach(drawStag);
    }

    drawMountains();
    drawForest();
    drawFireflies();
    drawVignette();

    t++;
    requestAnimationFrame(draw);
  }

  if (reduced) {
    drawBackground();
    drawStars();
    drawMoon();
    spears.forEach(drawSpear);
    stags.forEach(drawStag);
    drawMountains();
    drawForest();
    drawFireflies();
    drawVignette();
  } else {
    draw();
  }
}());
