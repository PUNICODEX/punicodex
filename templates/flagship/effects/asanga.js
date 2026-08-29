/* === ASANGA — Mind-Only Lotus === */
(function () {
  'use strict';

  const canvas = document.getElementById('asanga-canvas');
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

  const wheels = [];
  for (let i = 0; i < 3; i++) {
    wheels.push({
      radius: 60 + i * 55,
      speed: (i % 2 ? 1 : -1) * (0.003 + i * 0.001)
    });
  }

  const strokes = [];
  for (let i = 0; i < 12; i++) {
    strokes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 30 + Math.random() * 60,
      angle: Math.random() * Math.PI,
      speed: 0.2 + Math.random() * 0.3,
      alpha: 0.1 + Math.random() * 0.2
    });
  }

  const petals = [];
  for (let i = 0; i < 12; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 4 + Math.random() * 8,
      vy: -0.3 - Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(8, 6, 12, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.strokeStyle = 'rgba(218, 165, 32, 0.12)';
    ctx.lineWidth = 1.5;

    for (const wheel of wheels) {
      const rot = time * wheel.speed;
      ctx.beginPath();
      ctx.arc(cx, cy, wheel.radius, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = rot + i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * wheel.radius, cy + Math.sin(a) * wheel.radius);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(221, 160, 221, 0.15)';
    ctx.lineWidth = 1;

    for (const s of strokes) {
      s.y -= s.speed;
      s.angle += 0.002;
      if (s.y < -s.len) {
        s.y = height + s.len;
        s.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) {
        const x = (j / 10 - 0.5) * s.len;
        const y = Math.sin(j * 0.8 + time * 0.05) * 3;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    for (const p of petals) {
      p.y += p.vy;
      p.x += Math.sin(time * 0.003 + p.phase) * 0.2;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
      grad.addColorStop(0, 'rgba(147, 112, 219, 0.25)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
