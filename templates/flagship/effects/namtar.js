// Namtar — underworld dust, falling cuneiform wedges, and the pale glow of a death decree.
(function () {
  'use strict';
  const canvas = document.getElementById('namtar-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function readColor(attr, fb) {
    const v = canvas.getAttribute(attr);
    return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
  }
  const P = readColor('data-primary', '#8a9a7a');
  const S = readColor('data-secondary', '#b5a89a');

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

  let frame = 0;
  let dust = [];
  let wedges = [];
  let tablets = [];
  let pulses = [];

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function resetParticle(p, type) {
    if (type === 'dust') {
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = (Math.random() - 0.5) * 0.3;
      p.size = 0.5 + Math.random() * 1.5;
      p.alpha = 0.08 + Math.random() * 0.18;
      p.phase = Math.random() * Math.PI * 2;
    } else if (type === 'wedge') {
      p.x = Math.random() * width;
      p.y = -30 - Math.random() * 80;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = 0.4 + Math.random() * 0.9;
      p.size = 6 + Math.random() * 10;
      p.angle = Math.random() * Math.PI;
      p.spin = (Math.random() - 0.5) * 0.02;
      p.alpha = 0.06 + Math.random() * 0.14;
    } else if (type === 'tablet') {
      p.x = Math.random() * width;
      p.y = -60 - Math.random() * 120;
      p.vx = (Math.random() - 0.5) * 0.2;
      p.vy = 0.2 + Math.random() * 0.5;
      p.w = 24 + Math.random() * 32;
      p.h = 16 + Math.random() * 20;
      p.alpha = 0.04 + Math.random() * 0.1;
      p.angle = (Math.random() - 0.5) * 0.2;
    }
  }

  function initParticles() {
    dust = [];
    wedges = [];
    tablets = [];
    const dustCount = Math.min(140, Math.floor((width * height) / 12000));
    for (let i = 0; i < dustCount; i++) {
      const p = {};
      resetParticle(p, 'dust');
      dust.push(p);
    }
    const wedgeCount = Math.min(28, Math.floor(width / 60));
    for (let i = 0; i < wedgeCount; i++) {
      const p = {};
      resetParticle(p, 'wedge');
      p.y = Math.random() * height;
      wedges.push(p);
    }
    const tabletCount = Math.min(10, Math.floor(width / 160));
    for (let i = 0; i < tabletCount; i++) {
      const p = {};
      resetParticle(p, 'tablet');
      p.y = Math.random() * height;
      tablets.push(p);
    }
  }
  initParticles();

  function drawWedge(p) {
    const s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = rgba(P, 1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.5);
    ctx.lineTo(s * 0.2, s * 0.5);
    ctx.lineTo(0, -s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTablet(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = rgba(P, 1);
    ctx.lineWidth = 1;
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    // a few horizontal "lines" of text
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      const y = -p.h * 0.25 + i * p.h * 0.18;
      ctx.moveTo(-p.w * 0.35, y);
      ctx.lineTo(p.w * 0.35, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPulse() {
    if (pulses.length === 0 && Math.random() < 0.003) {
      pulses.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 10,
        maxR: 60 + Math.random() * 100,
        alpha: 0.18,
        decay: 0.004 + Math.random() * 0.004
      });
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.r += (p.maxR - p.r) * 0.04;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        pulses.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, rgba(P, p.alpha));
      g.addColorStop(0.6, rgba(P, p.alpha * 0.3));
      g.addColorStop(1, rgba(P, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#161412');
    g.addColorStop(0.55, '#1c1a18');
    g.addColorStop(1, '#23221f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // faint underworld glow from below
    const underglow = ctx.createRadialGradient(
      width * 0.5,
      height * 1.1,
      0,
      width * 0.5,
      height * 1.1,
      Math.max(width, height) * 0.8
    );
    underglow.addColorStop(0, rgba(S, 0.18));
    underglow.addColorStop(0.5, 'rgba(40, 38, 34, 0.08)');
    underglow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = underglow;
    ctx.fillRect(0, 0, width, height);
  }

  function draw() {
    frame++;
    drawBackground();
    if (reduced) return;

    // dust
    for (const p of dust) {
      p.x += p.vx + Math.sin(frame * 0.005 + p.phase) * 0.15;
      p.y += p.vy + Math.cos(frame * 0.004 + p.phase) * 0.1;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
      ctx.save();
      ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(frame * 0.02 + p.phase));
      ctx.fillStyle = rgba(S, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // tablets
    for (const p of tablets) {
      p.y += p.vy;
      p.x += p.vx;
      p.angle += Math.sin(frame * 0.002) * 0.0005;
      if (p.y > height + 60) resetParticle(p, 'tablet');
      drawTablet(p);
    }

    // wedges
    for (const p of wedges) {
      p.y += p.vy;
      p.x += p.vx;
      p.angle += p.spin;
      if (p.y > height + 30) resetParticle(p, 'wedge');
      drawWedge(p);
    }

    drawPulse();

    requestAnimationFrame(draw);
  }

  draw();
})();
