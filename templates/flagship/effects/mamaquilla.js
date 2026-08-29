/**
 * Mama Quilla — Moon, Marriage
 * Bespoke hero canvas for the Incan mother of the moon.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('mamaquilla-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const SILVER = { r: 192, g: 192, b: 192 };
  const MOON = { r: 245, g: 245, b: 250 };
  const COOL = { r: 74, g: 111, b: 165 };

  const stars = [];
  const rays = [];

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
    stars.length = 0;
    const starCount = Math.min(160, Math.floor(width * height / 8000));
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    rays.length = 0;
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        angle: (i / rayCount) * Math.PI * 2,
        length: Math.random() * 100 + 60,
        width: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#05070d');
    grad.addColorStop(0.6, '#080c16');
    grad.addColorStop(1, '#0a1020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawMoon() {
    const cx = width * 0.5;
    const cy = height * 0.38;
    const radius = Math.min(width, height) * 0.12;
    const phaseShift = Math.sin(frame * 0.01) * 0.12 + 0.25;

    // Moon glow
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 3);
    glow.addColorStop(0, `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, 0.12)`);
    glow.addColorStop(0.5, `rgba(${COOL.r}, ${COOL.g}, ${COOL.b}, 0.05)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // Crescent body
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
    ctx.bezierCurveTo(
      cx + radius * phaseShift, cy + radius,
      cx + radius * phaseShift, cy - radius,
      cx, cy - radius
    );
    ctx.closePath();
    ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, 0.9)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, 0.25)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawRays() {
    const cx = width * 0.5;
    const cy = height * 0.38;
    const radius = Math.min(width, height) * 0.14;
    for (const r of rays) {
      r.phase += 0.01;
      const alpha = 0.05 + 0.04 * Math.sin(r.phase);
      const x1 = cx + Math.cos(r.angle) * radius;
      const y1 = cy + Math.sin(r.angle) * radius;
      const x2 = cx + Math.cos(r.angle) * (radius + r.length);
      const y2 = cy + Math.sin(r.angle) * (radius + r.length);
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, ${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = r.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function drawStars() {
    for (const s of stars) {
      s.twinkle += 0.015;
      const alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawStars();
    drawRays();
    drawMoon();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
