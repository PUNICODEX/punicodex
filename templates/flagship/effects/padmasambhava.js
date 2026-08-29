/* === PADMASAMBHAVA — Lotus-Born Lightning === */
(function () {
  'use strict';

  const canvas = document.getElementById('padmasambhava-canvas');
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

  const petals = [];
  for (let i = 0; i < 16; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 8 + Math.random() * 14,
      vy: -0.3 - Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2
    });
  }

  const bolts = [];
  for (let i = 0; i < 3; i++) {
    bolts.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      life: 0,
      cooldown: Math.random() * 100 + 50
    });
  }

  const particles = [];
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      alpha: 0.2 + Math.random() * 0.4
    });
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2);
    grad.addColorStop(0, 'rgba(72, 209, 204, 0.25)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -p.r);
    ctx.bezierCurveTo(p.r * 0.8, -p.r * 0.4, p.r * 0.8, p.r * 0.4, 0, p.r);
    ctx.bezierCurveTo(-p.r * 0.8, p.r * 0.4, -p.r * 0.8, -p.r * 0.4, 0, -p.r);
    ctx.fill();
    ctx.restore();
  }

  function drawBolt(b) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.beginPath();
    let x = b.x;
    let y = b.y;
    ctx.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x += (Math.random() - 0.5) * 40;
      y += Math.random() * 30 + 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 6, 14, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;

    for (const p of petals) {
      p.y += p.vy;
      p.rot += p.rotSpeed;
      p.x += Math.sin(time * 0.004 + p.phase) * 0.5;
      if (p.y < -30) {
        p.y = height + 30;
        p.x = Math.random() * width;
      }
      drawPetal(p);
    }

    for (const b of bolts) {
      b.life++;
      if (b.life > b.cooldown) {
        drawBolt(b);
        b.life = 0;
        b.x = Math.random() * width;
        b.y = Math.random() * height * 0.4;
        b.cooldown = Math.random() * 120 + 60;
      }
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      ctx.fillStyle = `rgba(147, 112, 219, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  draw();
})();
