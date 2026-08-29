/* === SAMANTABHADRA — Universal Good Rays === */
(function () {
  'use strict';

  const canvas = document.getElementById('samantabhadra-canvas');
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

  const clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.4,
      r: 80 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.2,
      alpha: 0.05 + Math.random() * 0.05
    });
  }

  const petals = [];
  for (let i = 0; i < 20; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 5 + Math.random() * 10,
      vy: -0.25 - Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawElephant(x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(240, 248, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(8, -40);
    ctx.lineTo(12, -32);
    ctx.lineTo(25, -35);
    ctx.lineTo(30, -25);
    ctx.lineTo(50, -22);
    ctx.lineTo(55, -10);
    ctx.lineTo(52, 0);
    ctx.lineTo(60, 8);
    ctx.lineTo(58, 18);
    ctx.lineTo(48, 15);
    ctx.lineTo(45, 25);
    ctx.lineTo(38, 20);
    ctx.lineTo(32, 28);
    ctx.lineTo(25, 22);
    ctx.lineTo(18, 28);
    ctx.lineTo(10, 22);
    ctx.lineTo(5, 28);
    ctx.lineTo(0, 22);
    ctx.lineTo(-5, 28);
    ctx.lineTo(-10, 20);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(8, 10, 12, 0.15)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      const len = Math.min(width, height) * 0.42 + Math.sin(time * 0.004 + r.phase) * 15;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle + time * 0.0003) * len, cy + Math.sin(r.angle + time * 0.0003) * len);
      grad.addColorStop(0, 'rgba(255, 250, 205, 0.12)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle + time * 0.0003) * len, cy + Math.sin(r.angle + time * 0.0003) * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const c of clouds) {
      c.x += c.vx;
      if (c.x < -c.r) c.x = width + c.r;
      if (c.x > width + c.r) c.x = -c.r;
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const ex = (time * 0.2) % (width + 200) - 100;
    drawElephant(ex, height - 60, 0.8, 0.25);
    drawElephant(ex - 300, height - 50, 0.6, 0.18);

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
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.5})`;
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
