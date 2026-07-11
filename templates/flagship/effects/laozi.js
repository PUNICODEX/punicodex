// Laozi — flowing ink rivers and drifting qi
(function() {
    const canvas = document.getElementById('laozi-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const clean = String(hex).replace(/^#/, '');
        const n = parseInt(clean, 16);
        if (clean.length === 3) {
            return {
                r: ((n >> 8) & 15) * 17,
                g: ((n >> 4) & 15) * 17,
                b: (n & 15) * 17
            };
        }
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function attrColor(name, fallback) {
        const raw = canvas.getAttribute('data-' + name);
        const hex = /^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/.test(raw) ? raw : fallback;
        return hexToRgb(hex);
    }

    const ink = attrColor('primary', '#1B1F22');
    const jade = attrColor('secondary', '#6F8A74');

    function rgb(c) {
        return `${c.r},${c.g},${c.b}`;
    }

    let width, height, dpr;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    const ribbons = [];
    const RIBBON_COUNT = 6;
    for (let i = 0; i < RIBBON_COUNT; i++) {
        ribbons.push({
            yBase: 0.15 + (i / (RIBBON_COUNT - 1)) * 0.7,
            amplitude: 24 + Math.random() * 56,
            frequency: 0.0018 + Math.random() * 0.003,
            drift: 0.002 + Math.random() * 0.004,
            phase: Math.random() * Math.PI * 2,
            thickness: 1.2 + Math.random() * 2.2,
            alpha: 0.06 + Math.random() * 0.1,
            color: i % 2 === 0 ? ink : jade
        });
    }

    const particles = [];
    const PARTICLE_COUNT = 55;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.1 - Math.random() * 0.25,
            size: Math.random() * 1.8 + 0.4,
            alpha: Math.random() * 0.25 + 0.08,
            phase: Math.random() * Math.PI * 2
        });
    }

    let time = 0;

    function drawRibbon(r) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${rgb(r.color)},${r.alpha})`;
        ctx.lineWidth = r.thickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let x = 0; x <= width; x += 8) {
            const y = height * r.yBase + Math.sin(x * r.frequency + time * r.drift + r.phase) * r.amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    function drawParticles() {
        particles.forEach(function(p) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.y < -20) {
                p.y = height + 20;
                p.x = Math.random() * width;
            }
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;

            const a = p.alpha * (0.6 + 0.4 * Math.sin(time * 0.02 + p.phase));
            ctx.fillStyle = `rgba(${rgb(jade)},${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        ribbons.forEach(drawRibbon);
        drawParticles();

        time++;
        if (!prefersReducedMotion) {
            requestAnimationFrame(draw);
        }
    }

    draw();
})();
