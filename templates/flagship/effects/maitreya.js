/* === MAITREYA — Future Sunrise === */
(function () {
  'use strict';

  const canvas = document.getElementById('maitreya-canvas');
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
  for (let i = 0; i < 24; i++) {
    rays.push({
      angle: (i / 24) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2
    });
  }

  const petals = [];
  for (let i = 0; i < 20; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 6 + Math.random() * 10,
      vy: -0.3 - Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    });
  }

  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.5,
      vy: -0.2 - Math.random() * 0.3,
      alpha: 0.2 + Math.random() * 0.4
    });
  }

  function drawStupa(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-20, -25);
    ctx.lineTo(20, -25);
    ctx.lineTo(30, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(0, -35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, 'rgba(20, 10, 6, 0.25)');
    bg.addColorStop(1, 'rgba(40, 15, 8, 0.05)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.4;
    time += 1;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      const len = Math.min(width, height) * 0.45 + Math.sin(time * 0.004 + r.phase) * 15;
      const grad = ctx.createLinearGradient(cx, cy + 20, cx + Math.cos(r.angle + time * 0.0003) * len, cy + Math.sin(r.angle + time * 0.0003) * len);
      grad.addColorStop(0, 'rgba(255, 140, 0, 0.14)');
      grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.08)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx + Math.cos(r.angle + time * 0.0003) * len, cy + Math.sin(r.angle + time * 0.0003) * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const p of petals) {
      p.y += p.vy;
      p.x += Math.sin(time * 0.003 + p.phase) * 0.3;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 0.001 + p.phase);
      ctx.fillStyle = `rgba(255, 182, 193, ${0.2 + 0.15 * Math.sin(time * 0.01 + p.phase)})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.7, -p.r * 0.3, p.r * 0.7, p.r * 0.3, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.3, -p.r * 0.7, -p.r * 0.3, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < 5; i++) {
      drawStupa(width * (0.15 + i * 0.18), height - 10, 0.8 + Math.sin(time * 0.002 + i) * 0.1);
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      p.y += p.vy;
      p.x += Math.sin(time * 0.005 + p.y * 0.01) * 0.2;
      if (p.y < 0) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  draw();
})();
