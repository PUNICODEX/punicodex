/**
 * Mamaqucha — Sea, Fishermen
 * Bespoke hero canvas for the Incan mother of the sea.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('mamaqucha-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;
  let frame = 0;

  const DEEP = { r: 0, g: 59, b: 92 };
  const AQUA = { r: 0, g: 206, b: 209 };
  const FOAM = { r: 240, g: 255, b: 255 };

  const waves = [];
  const bubbles = [];

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
    waves.length = 0;
    const waveCount = Math.min(7, Math.floor(height / 90));
    for (let i = 0; i < waveCount; i++) {
      waves.push({
        y: height * 0.45 + i * 55,
        amplitude: Math.random() * 15 + 8,
        frequency: Math.random() * 0.004 + 0.002,
        speed: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.12 - i * 0.015,
      });
    }

    bubbles.length = 0;
    const bubbleCount = Math.min(70, Math.floor(width * height / 16000));
    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        size: Math.random() * 3 + 0.5,
        speed: Math.random() * 0.8 + 0.3,
        sway: Math.random() * 2 + 0.5,
        swayPhase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#020d14');
    grad.addColorStop(0.5, '#031925');
    grad.addColorStop(1, '#042233');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Submarine light shafts
    for (let i = 0; i < 5; i++) {
      const x = width * (0.15 + i * 0.18);
      const gradShaft = ctx.createLinearGradient(x, 0, x + Math.sin(frame * 0.002 + i) * 60, height);
      gradShaft.addColorStop(0, `rgba(${AQUA.r}, ${AQUA.g}, ${AQUA.b}, 0.04)`);
      gradShaft.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradShaft;
      ctx.beginPath();
      ctx.moveTo(x - 30, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 100 + Math.sin(frame * 0.002 + i) * 40, height);
      ctx.lineTo(x - 60 + Math.sin(frame * 0.002 + i) * 40, height);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawWaves() {
    for (const w of waves) {
      w.phase += w.speed;
      ctx.strokeStyle = `rgba(${AQUA.r}, ${AQUA.g}, ${AQUA.b}, ${w.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 15) {
        const y = w.y + Math.sin(x * w.frequency + w.phase) * w.amplitude;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Foam crests
      ctx.fillStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, ${w.alpha * 0.5})`;
      for (let x = 0; x <= width; x += 15) {
        const y = w.y + Math.sin(x * w.frequency + w.phase) * w.amplitude;
        const slope = Math.cos(x * w.frequency + w.phase);
        if (slope > 0.8) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawBubbles() {
    for (const b of bubbles) {
      b.y -= b.speed;
      b.swayPhase += 0.03;
      b.x += Math.sin(b.swayPhase) * 0.3;
      if (b.y < -20) b.y = height + 20;

      ctx.strokeStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, ${b.alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(${FOAM.r}, ${FOAM.g}, ${FOAM.b}, ${b.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawWaves();
    drawBubbles();
    frame++;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduced) draw();
}());
