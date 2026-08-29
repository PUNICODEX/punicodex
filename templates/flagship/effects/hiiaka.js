// Hiiaka — Hula, magic, healing; hibiscus petals, lei garlands, golden fireflies
(function() {
  'use strict';

  const canvas = document.getElementById('hiiaka-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!canvas || !ctx) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function readColor(attr, fallback) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
  }

  const P = readColor('data-primary', '#FF69B4');
  const S = readColor('data-secondary', '#228B22');

  let width, height, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const petals = [];
  for (let i = 0; i < 40; i++) {
    petals.push({
      x: Math.random() * width,
      y: Math.random() * height - height,
      size: 6 + Math.random() * 10,
      speed: 0.4 + Math.random() * 0.7,
      sway: 1 + Math.random() * 3,
      swaySpeed: 0.01 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      alpha: 0.2 + Math.random() * 0.3,
      color: Math.random() > 0.6 ? P : S
    });
  }

  const fireflies = [];
  for (let i = 0; i < 35; i++) {
    fireflies.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    });
  }

  const garlands = [];
  for (let i = 0; i < 5; i++) {
    garlands.push({
      x: Math.random() * width,
      y: height * 0.2 + Math.random() * height * 0.6,
      phase: Math.random() * Math.PI * 2,
      length: 80 + Math.random() * 120
    });
  }

  let frame = 0;
  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.12}, ${P.g * 0.15}, ${P.b * 0.18}, 0.9)`);
    bg.addColorStop(1, `rgba(${S.r * 0.08}, ${S.g * 0.18}, ${S.b * 0.1}, 0.95)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    const time = frame;

    // Lei garlands (gentle arcs)
    garlands.forEach(g => {
      const sway = Math.sin(time * 0.0008 + g.phase) * 20;
      ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        const x = g.x + (t - 0.5) * g.length + sway * t;
        const y = g.y + Math.sin(t * Math.PI * 2 + time * 0.001 + g.phase) * 12;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // Petals
    petals.forEach(p => {
      p.y += p.speed;
      p.x += Math.sin(time * p.swaySpeed + p.phase) * p.sway;
      p.rotation += p.rotSpeed;
      if (p.y > height + 20) {
        p.y = -20;
        p.x = Math.random() * width;
      }
      drawPetal(p);
    });

    // Healing fireflies
    fireflies.forEach(f => {
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < -10) f.x = width + 10;
      if (f.x > width + 10) f.x = -10;
      if (f.y < -10) f.y = height + 10;
      if (f.y > height + 10) f.y = -10;
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.03 + f.phase);
      ctx.fillStyle = `rgba(${S.r + 60}, ${S.g + 40}, ${S.b + 30}, ${f.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
