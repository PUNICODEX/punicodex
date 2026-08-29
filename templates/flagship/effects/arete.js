/**
 * ARETE — Excellence, Virtue
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('arete-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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


  // Laurel wreath, golden rays and ascending light
  const GOLD = { r: 212, g: 175, b: 55 };
  const WHITE = { r: 245, g: 245, b: 240 };
  const MARBLE = { r: 176, g: 196, b: 222 };
  let frame = 0;

  const rays = [];
  for (let i = 0; i < 24; i++) {
    rays.push({
      angle: (i / 24) * Math.PI * 2,
      length: 120 + Math.random() * 180,
      width: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const leaves = [];
  for (let i = 0; i < 40; i++) {
    leaves.push({
      angle: (i / 40) * Math.PI * 2,
      dist: 90 + Math.random() * 30,
      size: 8 + Math.random() * 6,
      phase: Math.random() * Math.PI * 2,
      side: i % 2 === 0 ? 1 : -1,
    });
  }

  const motes = [];
  for (let i = 0; i < 50; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -Math.random() * 0.6 - 0.2,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, width * 0.8);
    bg.addColorStop(0, '#15120a');
    bg.addColorStop(0.6, '#0e0c08');
    bg.addColorStop(1, '#080705');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width * 0.5;
    const cy = height * 0.45;

    for (const r of rays) {
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.01 + r.phase);
      ctx.globalAlpha = 0.03 * pulse;
      ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.6)';
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(r.angle) * r.length, cy + Math.sin(r.angle) * r.length);
      ctx.stroke();
    }

    for (const l of leaves) {
      const a = l.angle + Math.sin(frame * 0.002 + l.phase) * 0.02;
      const x = cx + Math.cos(a) * l.dist;
      const y = cy + Math.sin(a) * l.dist * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2 * l.side);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.7)';
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const m of motes) {
      m.y += m.vy;
      if (m.y < -10) m.y = height + 10;
      ctx.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(frame * 0.04 + m.phase));
      ctx.fillStyle = 'rgba(' + WHITE.r + ',' + WHITE.g + ',' + WHITE.b + ',1)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());