// Archḗ — Primordial Dawn
(function() {
    'use strict';
    const canvas = document.getElementById('arche-hero-canvas');
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

    const rays = [];
    for (let i = 0; i < 24; i++) {
        rays.push({
            angle: (Math.PI * 2 / 24) * i,
            width: Math.random() * 0.08 + 0.03,
            speed: Math.random() * 0.002 + 0.001
        });
    }
    const seeds = [];
    for (let i = 0; i < 70; i++) {
        seeds.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            a: Math.random() * 0.5 + 0.1,
            pulse: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.7);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.25));
        g.addColorStop(0.5, rgba(S.r, S.g, S.b, 0.08));
        g.addColorStop(1, rgba(5, 5, 10, 0.8));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.55;
        rays.forEach(r => {
            const a = r.angle + frame * r.speed;
            const len = Math.max(width, height) * 0.6;
            const alpha = 0.06 + 0.06 * Math.sin(frame * 0.02 + r.angle * 3);
            ctx.strokeStyle = rgba(S.r, S.g, S.b, alpha);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();
        });

        for (let i = 1; i <= 4; i++) {
            const r = 40 + i * 45 + Math.sin(frame * 0.01 + i) * 5;
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.1 - i * 0.015);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        seeds.forEach(s => {
            const a = s.a * (0.7 + 0.3 * Math.sin(frame * 0.03 + s.pulse));
            ctx.fillStyle = rgba(P.r, P.g, P.b, a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
