// Whiro — Māori lord of darkness and evil; shadow lizards, darkness tendrils, void stars
(function() {
  'use strict';

  const canvas = document.getElementById('whiro-canvas');
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

  const P = readColor('data-primary', '#4B0082');
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

  const tendrils = [];
  for (let i = 0; i < 8; i++) {
    tendrils.push({
      x: Math.random() * width,
      y: height + 20 + Math.random() * 100,
      length: 150 + Math.random() * 250,
      amplitude: 20 + Math.random() * 40,
      frequency: 0.004 + Math.random() * 0.006,
      speed: 0.003 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.08 + Math.random() * 0.1
    });
  }

  const lizards = [];
  for (let i = 0; i < 5; i++) {
    lizards.push({
      x: -80 - Math.random() * 400,
      y: height * (0.5 + Math.random() * 0.4),
      speed: 0.4 + Math.random() * 0.5,
      size: 16 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.12 + Math.random() * 0.1
    });
  }

  const voidStars = [];
  for (let i = 0; i < 70; i++) {
    voidStars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.5,
      alpha: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawLizard(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.scale(l.size / 16, l.size / 16);
    ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${l.opacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-26, -4);
    ctx.lineTo(-24, 4);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(-8 + k * 5, -6, 2, 0, Math.PI * 2);
      ctx.arc(-8 + k * 5, 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.08}, ${P.g * 0.05}, ${P.b * 0.12}, 0.95)`);
    bg.addColorStop(1, `rgba(${S.r * 0.08}, ${S.g * 0.02}, ${S.b * 0.02}, 0.98)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Void stars
    voidStars.forEach(s => {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.02 + s.phase);
      ctx.fillStyle = `rgba(${P.r + 80}, ${P.g + 20}, ${P.b + 80}, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Darkness tendrils rising
    tendrils.forEach(t => {
      ctx.beginPath();
      for (let py = 0; py <= t.length; py += 5) {
        const nx = t.x + Math.sin(py * t.frequency + time * t.speed + t.phase) * t.amplitude * (py / t.length);
        const ny = t.y - py;
        if (py === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny);
      }
      ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${t.alpha})`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // Shadow lizards
    lizards.forEach(l => {
      l.x += l.speed;
      l.y += Math.sin(time * 0.008 + l.phase) * 0.4;
      if (l.x > width + 80) {
        l.x = -80 - Math.random() * 400;
        l.y = height * (0.5 + Math.random() * 0.4);
      }
      drawLizard(l);
    });

    // Malevolent glow at centre bottom
    const glow = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, width * 0.5);
    glow.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.15)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
