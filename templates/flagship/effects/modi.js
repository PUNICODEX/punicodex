// Móði — Norse wrath, son of Thor
// A churning core of silver-blue battle-fury ringed by crackling arcs and rising embers.
(function () {
  const canvas = document.getElementById('modi-hero-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width, height, dpr;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function colorOf(value, fallback) {
    if (!value) return hexToRgb(fallback);
    if (value.charAt(0) === '#') return hexToRgb(value);
    const m = value.match(/\d+/g);
    if (m && m.length >= 3) return { r: +m[0], g: +m[1], b: +m[2] };
    return hexToRgb(fallback);
  }

  // Norse palette when data attributes are absent.
  const P = colorOf(canvas.getAttribute('data-primary'), '#C0C0C0');
  const S = colorOf(canvas.getAttribute('data-secondary'), '#5C9BD1');
  const EMBER = { r: 220, g: 72, b: 34 };

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function initArc() {
    return {
      angle: Math.random() * Math.PI * 2,
      span: Math.PI * (0.25 + Math.random() * 0.6),
      radius: 60 + Math.random() * 120,
      speed: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 100 + Math.random() * 120,
    };
  }

  function initSpark() {
    return {
      x: width * 0.5 + (Math.random() - 0.5) * Math.min(width, 1200),
      y: height * (0.45 + Math.random() * 0.55),
      vx: (Math.random() - 0.5) * 0.9,
      vy: -(0.6 + Math.random() * 1.6),
      size: Math.random() * 2 + 0.6,
      life: 0.4 + Math.random() * 0.6,
      decay: 0.006 + Math.random() * 0.012,
    };
  }

  const arcs = Array.from({ length: 7 }, initArc);
  const sparks = Array.from({ length: 80 }, initSpark);

  let frame = 0;

  function drawCore(cx, cy) {
    const pulse = Math.sin(frame * 0.035) * 0.5 + 0.5;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 + pulse * 60);
    core.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.45)`);
    core.addColorStop(0.45, `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`);
    core.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 110 + pulse * 70, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVignette(cx, cy) {
    const g = ctx.createRadialGradient(cx, cy, height * 0.12, cx, cy, height * 0.85);
    g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.07)`);
    g.addColorStop(1, 'rgba(5, 5, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  function drawArcs(cx, cy) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    arcs.forEach((arc) => {
      arc.life += 1;
      arc.radius += arc.speed;
      const t = arc.life / arc.maxLife;
      const alpha = Math.sin(t * Math.PI) * 0.55;
      ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${Math.max(0, alpha)})`;
      ctx.lineWidth = 1.5 + alpha * 3;
      ctx.beginPath();
      const segs = 26;
      for (let i = 0; i <= segs; i++) {
        const a = arc.angle + (i / segs) * arc.span + Math.sin(i * 0.6 + frame * 0.05 + arc.phase) * 0.1;
        const r = arc.radius + Math.sin(i * 1.4 + frame * 0.07 + arc.phase) * 14;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.55;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (arc.life >= arc.maxLife) Object.assign(arc, initArc());
    });
    ctx.restore();
  }

  function drawSparks() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    sparks.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx += Math.sin(p.y * 0.02 + frame * 0.03) * 0.01;
      p.life -= p.decay;
      if (p.life <= 0) Object.assign(p, initSpark());
      const alpha = Math.max(0, p.life);
      ctx.fillStyle = `rgba(${EMBER.r}, ${EMBER.g}, ${EMBER.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width * 0.5;
    const cy = height * 0.55;

    drawVignette(cx, cy);
    drawCore(cx, cy);
    drawArcs(cx, cy);
    drawSparks();

    frame += 1;
    if (!prefersReduced) requestAnimationFrame(draw);
  }

  if (prefersReduced) {
    // Freeze a moment of peak fury for users who prefer reduced motion.
    frame = 45;
    arcs.forEach((arc) => { arc.life = arc.maxLife * 0.5; });
    resize();
    draw();
  } else {
    draw();
  }
})();
