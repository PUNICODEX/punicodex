/**
 * Ekkeko — Luck, Abundance
 * Bespoke hero canvas for the Incan household god of prosperity.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('ekkeko-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const GOLD = { r: 212, g: 175, b: 55 };
  const OCHRE = { r: 204, g: 119, b: 34 };
  const MAIZE = { r: 255, g: 215, b: 0 };
  const POTATO = { r: 139, g: 90, b: 43 };

  const gifts = [];
  const sparks = [];
  const smoke = [];

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
    gifts.length = 0;
    const giftCount = Math.min(40, Math.floor(width * height / 22000));
    const types = ['grain', 'potato', 'coin', 'corn'];
    for (let i = 0; i < giftCount; i++) {
      gifts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 4,
        type: types[Math.floor(Math.random() * types.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.25 - 0.05,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    sparks.length = 0;
    for (let i = 0; i < 50; i++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    smoke.length = 0;
    for (let i = 0; i < 8; i++) {
      smoke.push({
        x: Math.random() * width,
        y: height - Math.random() * height * 0.3,
        radius: Math.random() * 80 + 40,
        vy: -Math.random() * 0.3 - 0.1,
        vx: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.08 + 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#150c05');
    grad.addColorStop(0.5, '#1f1207');
    grad.addColorStop(1, '#2a1708');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm hearth glow from below
    const hearth = ctx.createRadialGradient(width * 0.5, height, 0, width * 0.5, height, width * 0.7);
    hearth.addColorStop(0, `rgba(${OCHRE.r}, ${OCHRE.g}, ${OCHRE.b}, 0.15)`);
    hearth.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hearth;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGift(g) {
    g.x += g.vx;
    g.y += g.vy;
    g.rotation += g.rotSpeed;
    g.pulse += 0.03;
    if (g.y < -30) g.y = height + 30;
    if (g.x < -30) g.x = width + 30;
    if (g.x > width + 30) g.x = -30;

    const alpha = g.alpha * (0.8 + 0.2 * Math.sin(g.pulse));
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rotation);
    ctx.globalAlpha = alpha;

    if (g.type === 'grain') {
      ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 1)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, g.size, g.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (g.type === 'potato') {
      ctx.fillStyle = `rgba(${POTATO.r}, ${POTATO.g}, ${POTATO.b}, 1)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, g.size * 0.9, g.size * 0.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (g.type === 'coin') {
      ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, 1)`;
      ctx.beginPath();
      ctx.arc(0, 0, g.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${MAIZE.r}, ${MAIZE.g}, ${MAIZE.b}, 0.8)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Corn
      ctx.fillStyle = `rgba(${MAIZE.r}, ${MAIZE.g}, ${MAIZE.b}, 1)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, g.size * 0.5, g.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${POTATO.r}, ${POTATO.g}, ${POTATO.b}, 0.6)`;
      for (let r = -2; r <= 2; r++) {
        ctx.beginPath();
        ctx.ellipse(r * g.size * 0.2, 0, g.size * 0.08, g.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawGifts() {
    for (const g of gifts) drawGift(g);
  }

  function drawSparks() {
    for (const s of sparks) {
      s.pulse += 0.04;
      const alpha = s.alpha * (0.5 + 0.5 * Math.sin(s.pulse));
      ctx.fillStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSmoke() {
    for (const s of smoke) {
      s.y += s.vy;
      s.x += s.vx;
      s.phase += 0.01;
      if (s.y < -100) s.y = height + 50;
      const alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.phase));
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
      grad.addColorStop(0, `rgba(${OCHRE.r}, ${OCHRE.g}, ${OCHRE.b}, ${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawSmoke();
    drawGifts();
    drawSparks();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
