/* === BODDHISATTVA — Lotus Vow Light === */
(function () {
  'use strict';

  const canvas = document.getElementById('boddhisattva-canvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let width, height, time = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const rays = [];
  for (let i = 0; i < 20; i++) {
    rays.push({
      angle: (i / 20) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2
    });
  }

  const petals = [];
  for (let i = 0; i < 24; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 5 + Math.random() * 10,
      vy: -0.2 - Math.random() * 0.4,
      alpha: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }

  const vows = [];
  for (let i = 0; i < 8; i++) {
    vows.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 3 + Math.random() * 5,
      vy: -0.5 - Math.random() * 0.5,
      alpha: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 8, 8, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      const len = Math.min(width, height) * 0.4 + Math.sin(time * 0.005 + r.phase) * 20;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle + time * 0.0005) * len, cy + Math.sin(r.angle + time * 0.0005) * len);
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.12)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle + time * 0.0005) * len, cy + Math.sin(r.angle + time * 0.0005) * len);
      ctx.stroke();
    }

    for (const v of vows) {
      v.y += v.vy;
      v.x += Math.sin(time * 0.01 + v.phase) * 0.3;
      if (v.y < -20) {
        v.y = height + 20;
        v.x = Math.random() * width;
      }
      const flicker = 0.6 + 0.4 * Math.sin(time * 0.05 + v.phase);
      ctx.fillStyle = `rgba(255, 140, 0, ${v.alpha * flicker})`;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const p of petals) {
      p.y += p.vy;
      p.x += Math.sin(time * 0.004 + p.phase) * 0.3;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 0.002 + p.phase);
      ctx.fillStyle = `rgba(255, 240, 245, ${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.7, -p.r * 0.3, p.r * 0.7, p.r * 0.3, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.3, -p.r * 0.7, -p.r * 0.3, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
