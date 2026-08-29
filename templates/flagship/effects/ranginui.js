// Ranginui — Māori sky father; star field, celestial nebula, embracing heavens
(function() {
  'use strict';

  const canvas = document.getElementById('ranginui-canvas');
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

  const P = readColor('data-primary', '#191970');
  const S = readColor('data-secondary', '#9370DB');

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

  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.005 + Math.random() * 0.02
    });
  }

  const nebulae = [];
  for (let i = 0; i < 5; i++) {
    nebulae.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 120 + Math.random() * 220,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.06 + Math.random() * 0.08
    });
  }

  const rays = [];
  for (let i = 0; i < 9; i++) {
    rays.push({
      angle: (i / 9) * Math.PI + Math.PI,
      length: 150 + Math.random() * 250,
      width: 30 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.03 + Math.random() * 0.04
    });
  }

  let frame = 0;
  let time = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.2}, ${P.g * 0.15}, ${P.b * 0.35}, 0.95)`);
    bg.addColorStop(1, `rgba(${S.r * 0.15}, ${S.g * 0.1}, ${S.b * 0.25}, 0.98)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    time = frame;

    // Celestial nebulae
    nebulae.forEach(n => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + n.phase);
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${n.alpha * pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sky-father rays from above
    const originX = width * 0.5;
    rays.forEach(r => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.002 + r.phase);
      ctx.save();
      ctx.translate(originX, -50);
      ctx.rotate(r.angle + Math.sin(time * 0.001 + r.phase) * 0.03);
      const g = ctx.createLinearGradient(0, 0, 0, r.length);
      g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${r.alpha * pulse})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r.width / 2, 0, r.width, r.length);
      ctx.restore();
    });

    // Stars
    stars.forEach(s => {
      const pulse = 0.6 + 0.4 * Math.sin(time * s.twinkle + s.phase);
      ctx.fillStyle = `rgba(255, 255, 245, ${s.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
