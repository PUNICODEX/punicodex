// Pele — Hawaiian volcano goddess; lava rivers, volcanic sparks, lightning forks
(function() {
  'use strict';

  const canvas = document.getElementById('pele-canvas');
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

  const P = readColor('data-primary', '#FF4500');
  const S = readColor('data-secondary', '#8B0000');

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

  const flows = [];
  for (let i = 0; i < 5; i++) {
    flows.push({
      x: 0.1 + (i / 4) * 0.8 + (Math.random() - 0.5) * 0.1,
      width: 40 + Math.random() * 90,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      color: i % 2 === 0 ? P : { r: 255, g: 100, b: 0 }
    });
  }

  const sparks = [];
  for (let i = 0; i < 90; i++) {
    sparks.push({
      x: Math.random() * width,
      y: Math.random() * height + height * 0.3,
      vy: -(0.6 + Math.random() * 1.2),
      vx: (Math.random() - 0.5) * 0.6,
      size: 0.8 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.7 ? { r: 255, g: 255, b: 150 } : P
    });
  }

  const bolts = [];
  for (let i = 0; i < 4; i++) {
    bolts.push({ x: Math.random(), cooldown: Math.random() * 200 + 100, active: 0, segs: [] });
  }

  let frame = 0;
  let time = 0;
  function drawBolt(b) {
    if (b.active <= 0) return;
    ctx.strokeStyle = `rgba(255, 255, 200, ${b.active})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    b.segs.forEach((s, i) => {
      if (i === 0) ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    });
    ctx.stroke();
  }

  function triggerBolt(b) {
    b.active = 1;
    b.segs = [];
    let x = b.x * width;
    let y = 0;
    while (y < height * 0.6) {
      const nx = x + (Math.random() - 0.5) * 60;
      const ny = y + Math.random() * 30 + 15;
      b.segs.push({ x1: x, y1: y, x2: nx, y2: ny });
      x = nx;
      y = ny;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${S.r * 0.2}, ${S.g * 0.05}, ${S.b * 0.05}, 0.95)`);
    bg.addColorStop(1, `rgba(${P.r * 0.25}, ${P.g * 0.08}, ${P.b * 0.02}, 0.98)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Lava flows at bottom
    flows.forEach(f => {
      ctx.beginPath();
      const baseY = height * 0.75;
      for (let px = 0; px <= width; px += 8) {
        const nx = px / width;
        const dist = Math.abs(nx - f.x);
        const wave = Math.sin(nx * Math.PI * 4 + time * f.speed + f.phase) * 20;
        const spread = Math.max(0, 1 - dist * 6);
        const y = baseY - spread * height * 0.25 + wave * spread;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, baseY - height * 0.2, 0, height);
      g.addColorStop(0, `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, 0.55)`);
      g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0.85)`);
      ctx.fillStyle = g;
      ctx.fill();
    });

    // Volcanic sparks
    sparks.forEach(s => {
      s.y += s.vy;
      s.x += s.vx;
      if (s.y < -10) {
        s.y = height + 10;
        s.x = Math.random() * width;
      }
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.08 + s.phase);
      ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Lightning
    bolts.forEach(b => {
      if (b.active > 0) {
        b.active -= 0.06;
        drawBolt(b);
      } else {
        b.cooldown--;
        if (b.cooldown <= 0) {
          triggerBolt(b);
          b.cooldown = 120 + Math.random() * 250;
        }
      }
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
