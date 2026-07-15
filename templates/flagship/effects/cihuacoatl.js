// Cihuacōātl — Serpent Woman of the Moon
(function() {
    'use strict';
    const canvas = document.getElementById('cihuacoatl-hero-canvas');
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
    const P = readColor('data-primary', '#50C878');
    const S = readColor('data-secondary', '#C0C0C0');

    const coils = [];
    for (let i = 0; i < 5; i++) {
        coils.push({
            x: width * (0.2 + i * 0.15),
            y: height * 0.7,
            r: 35 + i * 12,
            phase: Math.random() * Math.PI * 2
        });
    }
    const stars = [];
    for (let i = 0; i < 40; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            r: Math.random() * 1.2 + 0.3,
            a: Math.random() * 0.6 + 0.2,
            tw: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(10, 12, 22, 0.7));
        g.addColorStop(1, rgba(P.r * 0.2, P.g * 0.2, P.b * 0.2, 0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // moon
        const mx = width * 0.75;
        const my = height * 0.25;
        const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 70);
        glow.addColorStop(0, rgba(S.r, S.g, S.b, 0.5));
        glow.addColorStop(1, rgba(S.r, S.g, S.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(S.r, S.g, S.b, 0.9);
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fill();

        stars.forEach(s => {
            const a = s.a * (0.7 + 0.3 * Math.sin(frame * 0.03 + s.tw));
            ctx.fillStyle = rgba(S.r, S.g, S.b, a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // serpent coils
        coils.forEach((c, idx) => {
            const sway = Math.sin(frame * 0.015 + c.phase) * 15;
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.35);
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
                const r = c.r + Math.sin(a * 3 + frame * 0.02 + c.phase) * 8;
                const x = c.x + sway + Math.cos(a) * r;
                const y = c.y + Math.sin(a) * r * 0.4;
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = rgba(P.r, P.g, P.b, 0.15);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
