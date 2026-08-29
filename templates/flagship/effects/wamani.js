/**
 * Wamani — Sacred Mountain
 * Bespoke hero canvas for the Incan sacred peak.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('wamani-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const STONE = { r: 112, g: 128, b: 144 };
  const SNOW = { r: 245, g: 250, b: 255 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const SKY = { r: 135, g: 206, b: 235 };

  const peaks = [];
  const clouds = [];
  const condors = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initElements();
  }

  function initElements() {
    peaks.length = 0;
    const peakCount = Math.min(5, Math.floor(width / 250)) + 2;
    for (let i = 0; i < peakCount; i++) {
      peaks.push({
        x: (width / (peakCount - 1)) * i - width * 0.1,
        baseY: height * 0.8,
        height: Math.random() * height * 0.35 + height * 0.15,
        width: Math.random() * 150 + 200,
        snowLine: Math.random() * 0.3 + 0.55,
      });
    }

    clouds.length = 0;
    for (let i = 0; i < 7; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.35 + height * 0.1,
        radius: Math.random() * 70 + 40,
        vx: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.1 + 0.04,
      });
    }

    condors.length = 0;
    for (let i = 0; i < 3; i++) {
      condors.push({
        x: -50 - Math.random() * 200,
        y: Math.random() * height * 0.4 + height * 0.1,
        vx: Math.random() * 0.8 + 0.4,
        size: Math.random() * 12 + 8,
        wingPhase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.3 + 0.15,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#050a10');
    grad.addColorStop(0.4, '#081018');
    grad.addColorStop(1, '#0c1820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawClouds() {
    for (const c of clouds) {
      c.x += c.vx;
      if (c.x < -150) c.x = width + 150;
      if (c.x > width + 150) c.x = -150;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, `rgba(${SNOW.r}, ${SNOW.g}, ${SNOW.b}, ${c.alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPeaks() {
    for (const p of peaks) {
      // Mountain body
      ctx.fillStyle = `rgba(${STONE.r}, ${STONE.g}, ${STONE.b}, 0.25)`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.baseY);
      ctx.lineTo(p.x + p.width * 0.5, p.baseY - p.height);
      ctx.lineTo(p.x + p.width, p.baseY);
      ctx.closePath();
      ctx.fill();

      // Ridge detail
      ctx.strokeStyle = `rgba(${STONE.r}, ${STONE.g}, ${STONE.b}, 0.2)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width * 0.5, p.baseY - p.height);
      ctx.lineTo(p.x + p.width * 0.35, p.baseY - p.height * 0.4);
      ctx.lineTo(p.x + p.width * 0.2, p.baseY);
      ctx.stroke();

      // Snow cap
      const snowY = p.baseY - p.height * p.snowLine;
      const snowWidth = p.width * (1 - p.snowLine) * 0.5;
      ctx.fillStyle = `rgba(${SNOW.r}, ${SNOW.g}, ${SNOW.b}, 0.55)`;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width * 0.5 - snowWidth, snowY);
      ctx.lineTo(p.x + p.width * 0.5, p.baseY - p.height);
      ctx.lineTo(p.x + p.width * 0.5 + snowWidth, snowY);
      ctx.closePath();
      ctx.fill();

      // Gold alpenglow edge
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 0.15)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width * 0.5, p.baseY - p.height);
      ctx.lineTo(p.x + p.width * 0.5 + snowWidth, snowY);
      ctx.stroke();
    }
  }

  function drawCondors() {
    for (const c of condors) {
      c.x += c.vx;
      c.wingPhase += 0.08;
      if (c.x > width + 80) {
        c.x = -80;
        c.y = Math.random() * height * 0.4 + height * 0.1;
      }

      const wingY = Math.sin(c.wingPhase) * c.size * 0.6;
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);
      ctx.fillStyle = `rgba(${STONE.r}, ${STONE.g}, ${STONE.b}, 0.9)`;

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, c.size, c.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.beginPath();
      ctx.moveTo(-c.size * 0.4, 0);
      ctx.quadraticCurveTo(-c.size * 2.2, -c.size * 0.8 + wingY, -c.size * 1.8, wingY);
      ctx.quadraticCurveTo(-c.size * 1.2, -c.size * 0.2 + wingY * 0.5, -c.size * 0.4, 0);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(c.size * 0.4, 0);
      ctx.quadraticCurveTo(c.size * 2.2, -c.size * 0.8 - wingY, c.size * 1.8, -wingY);
      ctx.quadraticCurveTo(c.size * 1.2, -c.size * 0.2 - wingY * 0.5, c.size * 0.4, 0);
      ctx.fill();

      ctx.restore();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawClouds();
    drawPeaks();
    drawCondors();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
