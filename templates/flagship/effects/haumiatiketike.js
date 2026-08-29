// Haumiatiketike — Wild fernroot; unfurling koru fronds, forest spores, earth breath
(function() {
  'use strict';

  const canvas = document.getElementById('haumiatiketike-canvas');
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

  const P = readColor('data-primary', '#5D3A1A');
  const S = readColor('data-secondary', '#7A9E4A');

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

  const fronds = [];
  for (let i = 0; i < 9; i++) {
    fronds.push({
      x: 0.08 + (i / 8) * 0.84 + (Math.random() - 0.5) * 0.04,
      y: 0.82 + Math.random() * 0.1,
      scale: 0.5 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      handed: Math.random() > 0.5 ? 1 : -1,
      coils: 2 + Math.random() * 1.5
    });
  }

  const spores = [];
  for (let i = 0; i < 60; i++) {
    spores.push({
      x: Math.random(),
      y: 0.4 + Math.random() * 0.6,
      vy: 0.0003 + Math.random() * 0.0004,
      vx: (Math.random() - 0.5) * 0.0003,
      size: 0.6 + Math.random() * 1.6,
      alpha: 0.15 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? S : P
    });
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, `rgba(${P.r * 0.15}, ${P.g * 0.2}, ${P.b * 0.12}, 0.92)`);
    bg.addColorStop(1, `rgba(${P.r * 0.25}, ${P.g * 0.28}, ${P.b * 0.18}, 0.97)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    frame++;
    const time = frame;

    // Earth breathing hills
    for (let h = 0; h < 3; h++) {
      ctx.beginPath();
      const baseY = height * (0.72 + h * 0.08);
      const amp = height * (0.04 + h * 0.015);
      const breath = Math.sin(time * 0.0008 + h) * height * 0.01;
      for (let px = 0; px <= width; px += 6) {
        const nx = px / width;
        const y = baseY + breath + Math.sin(nx * Math.PI * 3 + time * 0.0003 + h) * amp;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${0.18 - h * 0.04})`;
      ctx.fill();
    }

    // Unfurling koru fronds
    fronds.forEach(f => {
      const cx = f.x * width;
      const cy = f.y * height;
      const breath = 1 + Math.sin(time * 0.001 + f.phase) * 0.05;
      const s = Math.min(width, height) * 0.04 * f.scale * breath;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(f.handed * breath, breath);
      ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.75)`;
      ctx.lineWidth = Math.max(1, s * 0.11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a <= f.coils * Math.PI; a += 0.1) {
        const r = (a / (f.coils * Math.PI)) * s;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.82;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Forest spores
    spores.forEach(p => {
      const sway = Math.sin(time * 0.001 + p.phase) * 10;
      const x = ((p.x + p.vx * time + sway / width) % 1.2 - 0.1) * width;
      const y = ((p.y - p.vy * time) % 1.2 + 0.05) * height;
      const alpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.002 + p.phase));
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
