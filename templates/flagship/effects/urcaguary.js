/**
 * Urcaguary — Underworld Jewels
 * Bespoke hero canvas for the Incan god of subterranean treasure.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('urcaguary-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const EMERALD = { r: 80, g: 200, b: 120 };
  const GOLD = { r: 212, g: 175, b: 55 };
  const AMETHYST = { r: 153, g: 102, b: 204 };
  const STONE = { r: 60, g: 55, b: 50 };

  const gems = [];
  const veins = [];
  const sparks = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initElements();
  }

  function initElements() {
    gems.length = 0;
    const gemCount = Math.min(30, Math.floor(width * height / 22000));
    const colors = [EMERALD, GOLD, AMETHYST];
    for (let i = 0; i < gemCount; i++) {
      gems.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        facets: Math.floor(Math.random() * 3) + 4,
      });
    }

    veins.length = 0;
    const veinCount = Math.min(12, Math.floor(width / 120));
    for (let i = 0; i < veinCount; i++) {
      veins.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        length: Math.random() * 150 + 80,
        width: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? GOLD : EMERALD,
        alpha: Math.random() * 0.25 + 0.1,
      });
    }

    sparks.length = 0;
  }

  function spawnSpark() {
    if (Math.random() > 0.08) return;
    const gem = gems[Math.floor(Math.random() * gems.length)];
    sparks.push({
      x: gem.x,
      y: gem.y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 2 + 0.5,
      color: gem.color,
      alpha: 1,
      life: 40,
    });
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0908');
    grad.addColorStop(0.5, '#110f0c');
    grad.addColorStop(1, '#181410');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawVeins() {
    for (const v of veins) {
      ctx.strokeStyle = `rgba(${v.color.r}, ${v.color.g}, ${v.color.b}, ${v.alpha})`;
      ctx.lineWidth = v.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let cx = v.x;
      let cy = v.y;
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += Math.cos(v.angle + (Math.random() - 0.5) * 0.8) * (v.length / 5);
        cy += Math.sin(v.angle + (Math.random() - 0.5) * 0.8) * (v.length / 5);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }

  function drawGem(g) {
    g.pulse += 0.03;
    const alpha = g.alpha * (0.7 + 0.3 * Math.sin(g.pulse));

    // Glow
    const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.size * 3);
    glow.addColorStop(0, `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${alpha * 0.6})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Faceted body
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = `rgba(${g.color.r}, ${g.color.g}, ${g.color.b}, ${alpha})`;
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= g.facets; i++) {
      const a = (i / g.facets) * Math.PI * 2;
      const r = i % 2 === 0 ? g.size : g.size * 0.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGems() {
    for (const g of gems) drawGem(g);
  }

  function drawSparks() {
    spawnSpark();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      s.alpha = (s.life / 40) * 0.9;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawVeins();
    drawGems();
    drawSparks();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
