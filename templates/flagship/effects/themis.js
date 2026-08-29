/**
 * THEMIS — Divine Law, Order, Custom
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('themis-canvas');
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


  // Scales of justice, columns and balanced light
  const GOLD = { r: 212, g: 175, b: 55 };
  const WHITE = { r: 245, g: 245, b: 240 };
  const BLUE = { r: 70, g: 130, b: 180 };
  let frame = 0;

  const columns = [];
  for (let i = 0; i < 3; i++) {
    columns.push({
      x: 0.15 + i * 0.35,
      width: 35 + Math.random() * 15,
      heightFrac: 0.5 + Math.random() * 0.12,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const scales = { x: 0.5, y: 0.42, size: 70, angle: 0 };

  const motes = [];
  for (let i = 0; i < 50; i++) {
    motes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.35 + 0.1,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function drawScales() {
    scales.angle = Math.sin(frame * 0.01) * 0.08;
    const cx = scales.x * width;
    const cy = scales.y * height;
    const s = scales.size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(scales.angle);
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.8)';
    ctx.lineWidth = 2;
    // pillar
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.lineTo(0, -s * 0.2);
    ctx.stroke();
    // beam
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.2);
    ctx.lineTo(s, -s * 0.2);
    ctx.stroke();
    // pans
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s, -s * 0.2);
      ctx.lineTo(side * s, s * 0.3 + Math.sin(frame * 0.02 + side) * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * s, s * 0.38 + Math.sin(frame * 0.02 + side) * 4, s * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawColumn(c) {
    const cx = c.x * width;
    const ch = c.heightFrac * height;
    const cw = c.width;
    ctx.save();
    ctx.globalAlpha = 0.1 + 0.02 * Math.sin(frame * 0.003 + c.phase);
    const grad = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
    grad.addColorStop(0, 'rgba(40,45,55,0.4)');
    grad.addColorStop(0.5, 'rgba(200,200,210,0.15)');
    grad.addColorStop(1, 'rgba(40,45,55,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - cw / 2, height - ch, cw, ch);
    ctx.fillStyle = 'rgba(' + GOLD.r + ',' + GOLD.g + ',' + GOLD.b + ',0.15)';
    ctx.fillRect(cx - cw * 0.65, height - ch - 8, cw * 1.3, 8);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.4, width * 0.85);
    bg.addColorStop(0, '#0c1018');
    bg.addColorStop(0.6, '#080a10');
    bg.addColorStop(1, '#040508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const c of columns) drawColumn(c);
    drawScales();

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