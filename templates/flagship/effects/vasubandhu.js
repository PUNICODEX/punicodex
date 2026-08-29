/* === VASUBANDHU — Threads of Abhidharma === */
(function () {
  'use strict';

  const canvas = document.getElementById('vasubandhu-canvas');
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

  const threads = [];
  for (let i = 0; i < 16; i++) {
    threads.push({
      y: (i / 16) * height,
      speed: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.08 + Math.random() * 0.12
    });
  }

  const lotus = [];
  for (let i = 0; i < 3; i++) {
    lotus.push({
      radius: 40 + i * 50,
      rotSpeed: (i % 2 ? 1 : -1) * (0.002 + i * 0.001)
    });
  }

  const petals = [];
  for (let i = 0; i < 18; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 5 + Math.random() * 9,
      vy: -0.2 - Math.random() * 0.3,
      alpha: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2
    });
  }

  const particles = [];
  for (let i = 0; i < 35; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.5,
      vy: -0.1 - Math.random() * 0.2,
      alpha: 0.2 + Math.random() * 0.4
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(12, 8, 8, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    ctx.strokeStyle = 'rgba(255, 248, 220, 0.12)';
    ctx.lineWidth = 1;

    for (const th of threads) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 20) {
        const y = th.y + Math.sin((x + width) * 0.005 + time * 0.01 + th.phase) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      th.y -= th.speed * 0.1;
      if (th.y < -20) th.y = height + 20;
    }

    ctx.strokeStyle = 'rgba(128, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;

    for (const l of lotus) {
      const rot = time * l.rotSpeed;
      ctx.beginPath();
      ctx.arc(cx, cy, l.radius, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = rot + i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * l.radius, cy + Math.sin(a) * l.radius);
        ctx.stroke();
      }
    }

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
      ctx.fillStyle = `rgba(255, 248, 220, ${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.7, -p.r * 0.3, p.r * 0.7, p.r * 0.3, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.3, -p.r * 0.7, -p.r * 0.3, 0, -p.r);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      p.y += p.vy;
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
