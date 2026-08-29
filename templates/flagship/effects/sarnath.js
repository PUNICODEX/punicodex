/* === SARNATH — Dharma Wheel Dawn === */
(function () {
  'use strict';

  const canvas = document.getElementById('sarnath-canvas');
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

  const wheel = { radius: 80, rotation: 0 };

  const leaves = [];
  for (let i = 0; i < 20; i++) {
    leaves.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 5 + Math.random() * 9,
      vy: -0.2 - Math.random() * 0.4,
      rot: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2
    });
  }

  const deer = [
    { x: width * 0.25, y: height - 80, dir: 1, alpha: 0.2 },
    { x: width * 0.75, y: height - 80, dir: -1, alpha: 0.2 }
  ];

  const rays = [];
  for (let i = 0; i < 16; i++) {
    rays.push({
      angle: (i / 16) * Math.PI * 2,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawDeer(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.dir * 0.8, 0.8);
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = 'rgba(139, 90, 43, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(3, -55);
    ctx.lineTo(1, -42);
    ctx.lineTo(6, -52);
    ctx.lineTo(5, -38);
    ctx.lineTo(12, -35);
    ctx.lineTo(25, -20);
    ctx.lineTo(45, -15);
    ctx.lineTo(55, -8);
    ctx.lineTo(52, 0);
    ctx.lineTo(60, 5);
    ctx.lineTo(58, 12);
    ctx.lineTo(48, 10);
    ctx.lineTo(45, 18);
    ctx.lineTo(38, 14);
    ctx.lineTo(32, 20);
    ctx.lineTo(25, 16);
    ctx.lineTo(18, 20);
    ctx.lineTo(10, 16);
    ctx.lineTo(5, 20);
    ctx.lineTo(0, 16);
    ctx.lineTo(-5, 18);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, -22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWheel(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(218, 165, 32, 0.2)';
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 10, 6, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;
    time += 1;
    wheel.rotation += 0.003;

    ctx.globalCompositeOperation = 'lighter';

    for (const r of rays) {
      const len = Math.min(width, height) * 0.4 + Math.sin(time * 0.004 + r.phase) * 10;
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle + time * 0.0002) * len, cy + Math.sin(r.angle + time * 0.0002) * len);
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle + time * 0.0002) * len, cy + Math.sin(r.angle + time * 0.0002) * len);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';

    drawWheel(cx, cy, wheel.radius, wheel.rotation);
    drawDeer(deer[0]);
    drawDeer(deer[1]);

    for (const l of leaves) {
      l.y += l.vy;
      l.x += Math.sin(time * 0.004 + l.phase) * 0.3;
      l.rot += 0.01;
      if (l.y < -20) {
        l.y = height + 20;
        l.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = `rgba(34, 139, 34, ${0.2 + 0.1 * Math.sin(time * 0.01 + l.phase)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.r, l.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
