/**
 * AIAS — Warrior, Bulwark of Achaeans
 * Bespoke hero canvas for the greek ASCII flagship temple.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ajax-canvas');
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


  // Bronze shield wall, spear arcs and sea spray
  const BRONZE = { r: 205, g: 127, b: 50 };
  const STEEL = { r: 176, g: 196, b: 222 };
  const SEA = { r: 70, g: 130, b: 180 };
  let frame = 0;

  const shields = [];
  for (let i = 0; i < 5; i++) {
    shields.push({
      x: Math.random(),
      y: 0.55 + Math.random() * 0.35,
      size: 60 + Math.random() * 50,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const spears = [];
  for (let i = 0; i < 7; i++) {
    spears.push({
      x: Math.random(),
      y: 0.6 + Math.random() * 0.3,
      angle: -0.4 + Math.random() * 0.8,
      length: 120 + Math.random() * 100,
      phase: Math.random() * Math.PI * 2,
    });
  }

  const spray = [];
  for (let i = 0; i < 60; i++) {
    spray.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.6 ? SEA : STEEL,
    });
  }

  function drawShield(s) {
    const cx = s.x * width;
    const cy = s.y * height;
    const r = s.size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.08 + 0.03 * Math.sin(frame * 0.01 + s.phase);
    ctx.fillStyle = 'rgba(205,127,50,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(205,127,50,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // boss
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212,175,55,0.35)';
    ctx.fill();
    ctx.restore();
  }

  function drawSpear(sp) {
    const cx = sp.x * width;
    const cy = sp.y * height;
    const len = sp.length;
    const flicker = 0.6 + 0.4 * Math.sin(frame * 0.03 + sp.phase);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sp.angle + Math.sin(frame * 0.005 + sp.phase) * 0.02);
    ctx.globalAlpha = 0.25 * flicker;
    ctx.strokeStyle = 'rgba(205,127,50,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    // spearhead
    ctx.fillStyle = 'rgba(176,196,222,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(-6, -len + 18);
    ctx.lineTo(6, -len + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0a0c10');
    bg.addColorStop(0.55, '#10151c');
    bg.addColorStop(1, '#15202b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const s of shields) drawShield(s);
    for (const sp of spears) drawSpear(sp);

    for (const p of spray) {
      p.x += p.vx * 0.003;
      p.y += p.vy * 0.003;
      if (p.y < 0) { p.y = 1; p.x = Math.random(); }
      ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(frame * 0.05 + p.x * 10));
      ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',1)';
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}());