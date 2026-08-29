/**
 * Wiraqucha — Creator, Sky, Sea Foam
 * Bespoke hero canvas for the Incan creator god.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('viracocha-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const GOLD = { r: 212, g: 175, b: 55 };
  const SKY = { r: 70, g: 130, b: 180 };
  const FOAM = { r: 224, g: 255, b: 255 };

  const stars = [];
  const foam = [];

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
    stars.length = 0;
    const starCount = Math.min(120, Math.floor(width * height / 12000));
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    foam.length = 0;
    const foamCount = Math.min(60, Math.floor(width * height / 18000));
    for (let i = 0; i < foamCount; i++) {
      foam.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#050a14');
    grad.addColorStop(0.5, '#0a1525');
    grad.addColorStop(1, '#06101c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawCreatorSpiral() {
    const cx = width * 0.5;
    const cy = height * 0.45;
    const phase = frame * 0.005;

    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${GOLD.r}, ${GOLD.g}, ${GOLD.b}, ${0.1 - ring * 0.02})`;
      ctx.lineWidth = 2;
      for (let t = 0; t <= Math.PI * 6; t += 0.05) {
        const r = 40 + ring * 35 + t * 8;
        const x = cx + Math.cos(t + phase * (ring % 2 === 0 ? 1 : -1)) * r;
        const y = cy + Math.sin(t + phase * (ring % 2 === 0 ? 1 : -1)) * r * 0.4;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Central creator glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    glow.addColorStop(0, `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, 0.2)`);
    glow.addColorStop(0.5, `rgba(${SKY.r}, ${SKY.g}, ${SKY.b}, 0.08)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStars() {
    for (const s of stars) {
      s.twinkle += 0.02;
      const alpha = s.alpha * (0.7 + 0.3 * Math.sin(s.twinkle));
      ctx.fillStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFoam() {
    for (const f of foam) {
      f.x += f.vx;
      f.y += f.vy;
      f.phase += 0.02;
      if (f.x < -20) f.x = width + 20;
      if (f.x > width + 20) f.x = -20;
      if (f.y < -20) f.y = height + 20;
      if (f.y > height + 20) f.y = -20;

      const alpha = f.alpha * (0.6 + 0.4 * Math.sin(f.phase));
      ctx.fillStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawStars();
    drawCreatorSpiral();
    drawFoam();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
