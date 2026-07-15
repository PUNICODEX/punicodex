// Pŷr — Primordial Flame
(function() {
    'use strict';
    const canvas = document.getElementById('pyr-hero-canvas');
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
    const S = readColor('data-secondary', '#4169E1');

    const flames = [];
    for (let i = 0; i < 40; i++) {
        flames.push({
            x: Math.random() * width,
            y: height + Math.random() * 50,
            r: Math.random() * 6 + 3,
            vy: -Math.random() * 3 - 1,
            vx: (Math.random() - 0.5) * 0.8,
            a: Math.random() * 0.5 + 0.2
        });
    }
    const sparks = [];
    for (let i = 0; i < 60; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            vy: -Math.random() * 1.5 - 0.5,
            a: Math.random() * 0.6 + 0.2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(15, 8, 5, 0.85));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.2));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        flames.forEach(f => {
            f.y += f.vy;
            f.x += f.vx + Math.sin(frame * 0.05 + f.y * 0.01) * 0.5;
            f.r *= 0.985;
            if (f.y < -20 || f.r < 0.5) {
                f.y = height + Math.random() * 30;
                f.x = Math.random() * width;
                f.r = Math.random() * 6 + 3;
            }
            ctx.fillStyle = rgba(P.r, P.g, P.b, f.a);
            ctx.shadowBlur = 10;
            ctx.shadowColor = rgba(P.r, P.g, P.b, 0.5);
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        sparks.forEach(s => {
            s.y += s.vy;
            if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
            ctx.fillStyle = rgba(255, 220, 150, s.a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
