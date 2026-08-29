/* === AMOGHASIDDHI — Accomplishing Winds === */
(function () {
  'use strict';

  const canvas = document.getElementById('amoghasiddhi-canvas');
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
  for (let i = 0; i < 16; i++) {
    rays.push({
      angle: (i / 16) * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.002
    });
  }

  const petals = [];
  for (let i = 0; i < 7; i++) {
    petals.push({
      radius: 60 + i * 45,
      speed: (i % 2 ? 1 : -1) * (0.003 + i * 0.001),
      offset: i
    });
  }

  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: 0.2 + Math.random() * 0.3
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(6, 10, 8, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      r.angle += r.speed;
      const len = Math.min(width, height) * 0.35 + Math.sin(time * 0.01 + r.angle * 3) * 20;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle) * len, cy + Math.sin(r.angle) * len);
      grad.addColorStop(0, 'rgba(46, 139, 87, 0.18)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle) * len, cy + Math.sin(r.angle) * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const p of petals) {
      const rotation = time * p.speed + p.offset;
      ctx.strokeStyle = 'rgba(152, 251, 152, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rotation + i * Math.PI / 3;
        const x = cx + Math.cos(a) * p.radius;
        const y = cy + Math.sin(a) * p.radius * 0.6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = rotation + i * Math.PI * 2 / 3;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * p.radius, cy + Math.sin(a) * p.radius * 0.6);
      }
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      ctx.fillStyle = `rgba(152, 251, 152, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  draw();
})();
