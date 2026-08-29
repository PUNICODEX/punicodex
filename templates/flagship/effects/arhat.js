/* === ARHAT — Still Flame of Liberation === */
(function () {
  'use strict';

  const canvas = document.getElementById('arhat-canvas');
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
  for (let i = 0; i < 18; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 6 + Math.random() * 10,
      speed: 0.2 + Math.random() * 0.4,
      sway: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02
    });
  }

  const flames = [];
  for (let i = 0; i < 5; i++) {
    flames.push({
      x: Math.random() * width,
      y: height - 20 - Math.random() * 40,
      h: 30 + Math.random() * 40,
      w: 15 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2
    });
  }

  const sparks = [];
  for (let i = 0; i < 30; i++) {
    sparks.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.7,
      r: 0.5 + Math.random() * 1.5,
      vy: -0.2 - Math.random() * 0.4,
      alpha: 0.2 + Math.random() * 0.4
    });
  }

  function drawLotusPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = `rgba(255, 153, 51, ${0.15 + 0.1 * Math.sin(time * 0.01 + p.sway)})`;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.3, p.size * 0.7, p.size * 0.3, 0, p.size);
    ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.3, -p.size * 0.7, -p.size * 0.3, 0, -p.size);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(10, 8, 6, 0.2)';
    ctx.fillRect(0, 0, width, height);
    time += 1;

    for (const p of petals) {
      p.y -= p.speed;
      p.x += Math.sin(time * 0.005 + p.sway) * 0.2;
      p.rotation += p.rotSpeed;
      if (p.y < -20) {
        p.y = height + 20;
        p.x = Math.random() * width;
      }
      drawLotusPetal(p);
    }

    for (const f of flames) {
      const flicker = 0.6 + 0.4 * Math.sin(time * 0.05 + f.phase);
      const grad = ctx.createLinearGradient(f.x, f.y, f.x, f.y - f.h);
      grad.addColorStop(0, 'rgba(255, 153, 51, 0.25)');
      grad.addColorStop(0.5, 'rgba(255, 69, 0, 0.15)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(f.x - f.w * flicker, f.y);
      ctx.quadraticCurveTo(f.x - f.w * 0.5, f.y - f.h * 0.5, f.x, f.y - f.h * flicker);
      ctx.quadraticCurveTo(f.x + f.w * 0.5, f.y - f.h * 0.5, f.x + f.w * flicker, f.y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';

    for (const s of sparks) {
      s.y += s.vy;
      s.alpha = 0.3 + 0.3 * Math.sin(time * 0.02 + s.y * 0.01);
      if (s.y < 0) {
        s.y = height * 0.8 + Math.random() * height * 0.2;
        s.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 200, 100, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  draw();
})();
