// Lahamu — primordial hair-water: tangled strands drift upward through the deep
(function () {
  'use strict';
  const canvas = document.getElementById('lahamu-hero-canvas');
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
  const P = readColor('data-primary', '#6a8a94');
  const S = readColor('data-secondary', '#c4b6a0');

  let width, height, dpr;
  let strands = [];
  let motes = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStrands();
    seedMotes();
  }
  resize();
  window.addEventListener('resize', resize);

  function createStrand(scatter) {
    const depth = Math.random();
    return {
      x: Math.random() * width,
      y: scatter ? Math.random() * height : height + 50 + Math.random() * 100,
      length: height * (0.4 + depth * 0.5),
      thickness: 0.5 + depth * 2.5,
      amplitude: 8 + depth * 32,
      waveK: 0.004 + Math.random() * 0.006,
      speed: 0.0003 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
      drift: 0.05 + Math.random() * 0.15,
      depth,
      hue: 190 + depth * 25,
      saturation: 20 + depth * 20,
      lightness: 18 + depth * 18,
      alpha: 0.08 + depth * 0.22,
    };
  }

  function seedStrands() {
    const count = Math.max(18, Math.floor(width / 60));
    strands = [];
    for (let i = 0; i < count; i++) strands.push(createStrand(true));
  }

  function seedMotes() {
    const count = Math.max(40, Math.floor((width * height) / 25000));
    motes = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.4 + Math.random() * 1.6,
        speedY: -(0.02 + Math.random() * 0.08),
        speedX: (Math.random() - 0.5) * 0.03,
        alpha: 0.04 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let frame = 0;
  function draw() {
    frame++;
    const t = frame;
    ctx.clearRect(0, 0, width, height);

    // Deep primordial gradient: abyssal blue-black at the bottom,
    // slightly lighter teal toward the top, as if light filters from above.
    const deep = ctx.createLinearGradient(0, 0, 0, height);
    deep.addColorStop(0, '#14202b');
    deep.addColorStop(0.55, '#0f1a24');
    deep.addColorStop(1, '#0a1219');
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, width, height);

    // Slow radial glow from the water's surface far above
    const surfaceGlow = ctx.createRadialGradient(
      width * 0.5,
      -height * 0.2,
      0,
      width * 0.5,
      -height * 0.2,
      height * 1.1
    );
    surfaceGlow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)');
    surfaceGlow.addColorStop(0.5, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.04)');
    surfaceGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = surfaceGlow;
    ctx.fillRect(0, 0, width, height);

    // Draw strands back to front by depth
    strands
      .slice()
      .sort((a, b) => a.depth - b.depth)
      .forEach((strand) => drawStrand(strand, t));

    // Update and draw suspended particles
    motes.forEach((mote) => {
      mote.phase += 0.01;
      mote.y += mote.speedY;
      mote.x += mote.speedX + Math.sin(mote.phase) * 0.05;
      if (mote.y < -4) {
        mote.y = height + 4;
        mote.x = Math.random() * width;
      }
      if (mote.x < -4) mote.x = width + 4;
      if (mote.x > width + 4) mote.x = -4;

      ctx.save();
      ctx.globalAlpha = mote.alpha * (0.6 + 0.4 * Math.sin(mote.phase));
      ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (!reduced) requestAnimationFrame(draw);
  }

  function drawStrand(strand, t) {
    const { x, length, thickness, amplitude, waveK, speed, phase, drift, depth } = strand;

    // Slowly rise and reset when top is reached
    strand.y -= drift;
    if (strand.y + length < -50) {
      strand.y = height + 50;
      strand.x = Math.random() * width;
    }

    const startY = strand.y;
    const endY = strand.y - length;

    ctx.save();
    ctx.globalAlpha = strand.alpha;
    ctx.strokeStyle =
      'hsla(' + strand.hue + ',' + strand.saturation + '%,' + strand.lightness + '%,1)';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let y = startY; y >= endY; y -= 6) {
      const progress = (startY - y) / length;
      const taper = Math.sin(progress * Math.PI);
      const offset =
        Math.sin(y * waveK + phase + t * speed) *
          amplitude *
          taper *
          (0.7 + 0.3 * Math.sin(t * 0.002 + depth * 3)) +
        Math.sin(y * waveK * 2.3 - phase - t * speed * 1.4) *
          amplitude *
          0.35 *
          taper;
      const px = x + offset;
      if (y === startY) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Secondary highlight strand offset slightly
    ctx.globalAlpha = strand.alpha * 0.4;
    ctx.strokeStyle =
      'hsla(' +
      (strand.hue + 10) +
      ',' +
      (strand.saturation + 10) +
      '%,' +
      (strand.lightness + 12) +
      '%,1)';
    ctx.lineWidth = Math.max(0.3, thickness * 0.35);
    ctx.beginPath();
    for (let y = startY; y >= endY; y -= 8) {
      const progress = (startY - y) / length;
      const taper = Math.sin(progress * Math.PI);
      const offset =
        Math.sin(y * waveK + phase + t * speed + 1.2) * amplitude * taper * 0.8 +
        thickness * 1.2;
      const px = x + offset;
      if (y === startY) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  draw();
})();
