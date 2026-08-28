// Adad — storm canvas: forked lightning, driving rain, churning storm clouds, and thunder-pulse ambience
(function () {
  'use strict';

  const canvas = document.getElementById('adad-hero-canvas');
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

  const P = readColor('data-primary', '#ffd700');   // lightning / gold
  const S = readColor('data-secondary', '#e0fbfc'); // ice-cloud / rain

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
    seedClouds();
    seedDrops();
  }

  resize();
  window.addEventListener('resize', resize);

  let drops = [];
  let bolts = [];
  let clouds = [];
  let flashes = [];

  let frameCount = 0;
  let lastFlash = 0;
  let nextFlash = 2000;

  function seedClouds() {
    clouds = [];
    const count = 5 + Math.floor(Math.min(width, height) / 120);
    for (let i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.35,
        r: 60 + Math.random() * 120,
        speed: 0.05 + Math.random() * 0.15,
        alpha: 0.06 + Math.random() * 0.08
      });
    }
  }

  function seedDrops() {
    drops = [];
    const count = Math.floor((width * height) / 9000);
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: 8 + Math.random() * 18,
        speed: 12 + Math.random() * 16,
        alpha: 0.12 + Math.random() * 0.22
      });
    }
  }

  function createBolt(originX, originY) {
    const segments = [];
    let x = originX;
    let y = originY;
    const targetY = height * (0.55 + Math.random() * 0.45);
    while (y < targetY) {
      const nextX = x + (Math.random() - 0.5) * 60;
      const nextY = y + 20 + Math.random() * 40;
      segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
      x = nextX;
      y = nextY;
      if (Math.random() < 0.25) {
        const forkAngle = (Math.random() - 0.5) * 1.2;
        const fx = x + Math.sin(forkAngle) * 40;
        const fy = y + Math.cos(forkAngle) * 40;
        segments.push({ x1: x, y1: y, x2: fx, y2: fy, fork: true });
      }
    }
    return {
      segments,
      life: 8 + Math.floor(Math.random() * 8),
      maxLife: 0,
      branch: Math.random() < 0.4
    };
  }

  function drawClouds(t) {
    const sr = Math.round(S.r * 0.9);
    const sg = Math.round(S.g * 0.9);
    const sb = Math.round(S.b * 0.9);
    const mr = Math.round(S.r * 0.55);
    const mg = Math.round(S.g * 0.6);
    const mb = Math.round(S.b * 0.7);

    clouds.forEach((c) => {
      c.x += c.speed;
      if (c.x - c.r > width) c.x = -c.r;
      const pulse = 0.9 + 0.1 * Math.sin(t * 0.001 + c.x * 0.01);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, 'rgba(' + sr + ',' + sg + ',' + sb + ',' + c.alpha * pulse + ')');
      g.addColorStop(0.6, 'rgba(' + mr + ',' + mg + ',' + mb + ',' + c.alpha * 0.6 * pulse + ')');
      g.addColorStop(1, 'rgba(30, 40, 55, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawRain() {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgb(' + S.r + ',' + S.g + ',' + S.b + ')';
    drops.forEach((d) => {
      d.y += d.speed;
      if (d.y > height) {
        d.y = -d.len;
        d.x = Math.random() * width;
      }
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y + d.len);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawBolts() {
    bolts = bolts.filter((b) => {
      b.life--;
      if (b.life <= 0) return false;
      const intensity = b.life / b.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 18 + intensity * 20;
      ctx.shadowColor = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + intensity + ')';
      ctx.strokeStyle = 'rgba(255, 252, 235, ' + (0.5 + intensity * 0.5) + ')';
      ctx.lineWidth = 1.5 + intensity * 1.5;
      ctx.lineCap = 'round';
      b.segments.forEach((s) => {
        if (s.fork) {
          ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + intensity * 0.65 + ')';
        }
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      });
      ctx.restore();
      return true;
    });
  }

  function drawFlashes() {
    flashes = flashes.filter((f) => {
      f.life--;
      if (f.life <= 0) return false;
      const alpha = (f.life / f.maxLife) * f.strength;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      g.addColorStop(0, 'rgba(255, 250, 235, ' + alpha * 0.35 + ')');
      g.addColorStop(0.4, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + alpha * 0.12 + ')');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });
  }

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#111621');
    g.addColorStop(0.55, '#1b263b');
    g.addColorStop(1, '#243447');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    const pulse = 0.5 + 0.5 * Math.sin(t * 0.003);
    const tg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.2,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75
    );
    tg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + 0.08 * pulse + ')');
    tg.addColorStop(1, 'rgba(17, 22, 33, 0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(timestamp) {
    frameCount++;
    const t = timestamp || frameCount;

    ctx.clearRect(0, 0, width, height);
    drawBackground(t);
    drawClouds(t);

    if (!reduced && t > nextFlash) {
      const bx = Math.random() * width * 0.8 + width * 0.1;
      const by = Math.random() * height * 0.15;
      const bolt = createBolt(bx, by);
      bolt.maxLife = bolt.life;
      bolts.push(bolt);
      flashes.push({
        x: bx,
        y: by,
        radius: 120 + Math.random() * 180,
        strength: 0.4 + Math.random() * 0.4,
        life: 10 + Math.floor(Math.random() * 10),
        maxLife: 0
      });
      flashes[flashes.length - 1].maxLife = flashes[flashes.length - 1].life;
      lastFlash = t;
      nextFlash = t + 1800 + Math.random() * 3200;
    }

    drawFlashes();
    drawBolts();
    drawRain();

    if (!reduced) requestAnimationFrame(draw);
  }

  draw();
})();
