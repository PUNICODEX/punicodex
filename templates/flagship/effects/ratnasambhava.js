/* === RATNASAMBHAVA — Jewel Mandala === */
(function () {
  'use strict';

  const canvas = document.getElementById('ratnasambhava-canvas');
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

  const rings = [];
  for (let i = 0; i < 5; i++) {
    rings.push({
      radius: 50 + i * 55,
      speed: (i % 2 ? 1 : -1) * (0.003 + i * 0.001)
    });
  }

  const gems = [];
  for (let i = 0; i < 20; i++) {
    gems.push({
      angle: Math.random() * Math.PI * 2,
      dist: 80 + Math.random() * 200,
      r: 1 + Math.random() * 2,
      speed: 0.002 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2
    });
  }

  const petals = [];
  for (let i = 0; i < 18; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 5 + Math.random() * 9,
      vy: -0.2 - Math.random() * 0.3,
      alpha: 0.15 + Math.random() * 0.25
    });
  }

  function drawJewel(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(12, 10, 6, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      r.angle += r.speed;
      const len = Math.min(width, height) * 0.38 + Math.sin(time * 0.005 + r.angle * 2) * 15;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle) * len, cy + Math.sin(r.angle) * len);
      grad.addColorStop(0, 'rgba(212, 175, 55, 0.18)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle) * len, cy + Math.sin(r.angle) * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const ring of rings) {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      const rot = time * ring.speed;
      for (let i = 0; i < 6; i++) {
        const a = rot + i * Math.PI / 3;
        drawJewel(cx + Math.cos(a) * ring.radius, cy + Math.sin(a) * ring.radius, 1.2);
      }
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const gem of gems) {
      const a = gem.angle + time * gem.speed + Math.sin(time * 0.003 + gem.phase) * 0.2;
      const x = cx + Math.cos(a) * gem.dist;
      const y = cy + Math.sin(a) * gem.dist * 0.6;
      ctx.fillStyle = `rgba(255, 223, 128, ${0.4 + 0.4 * Math.sin(time * 0.02 + gem.phase)})`;
      ctx.beginPath();
      ctx.arc(x, y, gem.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (const p of petals) {
      p.y += p.vy;
      p.x += Math.sin(time * 0.003 + p.y * 0.01) * 0.3;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(218, 165, 32, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
