/**
 * Supay — Underworld, Death
 * Bespoke hero canvas for the Incan lord of the underworld.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('supay-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const PURPLE = { r: 75, g: 0, b: 130 };
  const CRIMSON = { r: 139, g: 0, b: 0 };
  const ASH = { r: 120, g: 110, b: 105 };

  const spirits = [];
  const embers = [];
  const shards = [];

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
    spirits.length = 0;
    const spiritCount = Math.min(12, Math.floor(width / 100));
    for (let i = 0; i < spiritCount; i++) {
      spirits.push({
        x: Math.random() * width,
        y: height + Math.random() * 100,
        vy: -Math.random() * 0.5 - 0.2,
        size: Math.random() * 30 + 20,
        alpha: 0,
        state: 'rising',
        phase: Math.random() * Math.PI * 2,
      });
    }

    embers.length = 0;
    const emberCount = Math.min(80, Math.floor(width * height / 16000));
    for (let i = 0; i < emberCount; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        vy: -Math.random() * 1.2 - 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    shards.length = 0;
    for (let i = 0; i < 40; i++) {
      shards.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 4 + 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        alpha: Math.random() * 0.25 + 0.05,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.7, 0, width * 0.5, height * 0.7, Math.max(width, height));
    grad.addColorStop(0, 'rgba(40, 0, 40, 0.25)');
    grad.addColorStop(0.5, 'rgba(15, 0, 20, 0.15)');
    grad.addColorStop(1, 'rgba(5, 0, 8, 0)');
    ctx.fillStyle = '#0a050a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawSpirits() {
    for (const s of spirits) {
      s.y += s.vy;
      s.phase += 0.02;
      if (s.state === 'rising') {
        s.alpha += 0.005;
        if (s.alpha >= 0.35) s.state = 'fading';
      } else {
        s.alpha -= 0.003;
        if (s.alpha <= 0) {
          s.y = height + 50;
          s.x = Math.random() * width;
          s.state = 'rising';
          s.alpha = 0;
        }
      }

      const drift = Math.sin(s.phase) * 0.5;
      const grad = ctx.createRadialGradient(s.x + drift, s.y, 0, s.x + drift, s.y, s.size);
      grad.addColorStop(0, `rgba(${PURPLE.r}, ${PURPLE.g}, ${PURPLE.b}, ${s.alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x + drift, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // Face hint
      ctx.fillStyle = `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${s.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(s.x + drift - s.size * 0.25, s.y - s.size * 0.15, s.size * 0.12, 0, Math.PI * 2);
      ctx.arc(s.x + drift + s.size * 0.25, s.y - s.size * 0.15, s.size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEmbers() {
    for (const e of embers) {
      e.y += e.vy;
      e.x += e.vx;
      e.pulse += 0.04;
      if (e.y < -20) {
        e.y = height + 20;
        e.x = Math.random() * width;
      }
      const alpha = e.alpha * (0.5 + 0.5 * Math.sin(e.pulse));
      ctx.fillStyle = `rgba(${CRIMSON.r}, ${CRIMSON.g}, ${CRIMSON.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShards() {
    for (const s of shards) {
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.rotSpeed;
      if (s.x < -50) s.x = width + 50;
      if (s.x > width + 50) s.x = -50;
      if (s.y < -50) s.y = height + 50;
      if (s.y > height + 50) s.y = -50;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.strokeStyle = `rgba(${ASH.r}, ${ASH.g}, ${ASH.b}, ${s.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s.size, 0);
      ctx.lineTo(s.size, 0);
      ctx.lineTo(0, s.size * 1.2);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawShards();
    drawSpirits();
    drawEmbers();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
