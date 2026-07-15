// Ọṣun — River of Gold and Love
(function() {
    'use strict';
    const canvas = document.getElementById('oshun-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }

    function rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

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
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#4B0082');

    const waves = [];
    for (let i = 0; i < 4; i++) {
        waves.push({
            yBase: height * (0.65 + i * 0.08),
            amp: 15 + i * 5,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.005 + 0.003
        });
    }
    const petals = [];
    for (let i = 0; i < 30; i++) {
        petals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 2,
            vx: Math.random() * 0.5 + 0.2,
            vy: Math.random() * 0.3 + 0.1,
            a: Math.random() * 0.4 + 0.1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.12));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.22));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        waves.forEach((w, idx) => {
            ctx.fillStyle = rgba(P.r, P.g, P.b, 0.12 - idx * 0.02);
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 8) {
                const y = w.yBase + Math.sin(x * 0.004 + frame * w.speed + w.phase) * w.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        });

        petals.forEach(p => {
            p.x += p.vx;
            p.y += p.vy + Math.sin(frame * 0.01 + p.x * 0.005) * 0.2;
            if (p.x > width + 10) { p.x = -10; p.y = Math.random() * height; }
            ctx.fillStyle = rgba(P.r + 20, P.g + 10, P.b, p.a);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, frame * 0.02 + p.x, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
