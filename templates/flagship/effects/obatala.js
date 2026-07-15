// Ọbatálá — White Cloth of Creation
(function() {
    'use strict';
    const canvas = document.getElementById('obatala-hero-canvas');
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
    const S = readColor('data-secondary', '#F5F5F5');

    const cloths = [];
    for (let i = 0; i < 6; i++) {
        cloths.push({
            x: Math.random() * width,
            y: Math.random() * height,
            w: Math.random() * 80 + 60,
            h: Math.random() * 120 + 80,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.005 + 0.002
        });
    }
    const motes = [];
    for (let i = 0; i < 50; i++) {
        motes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            vy: -Math.random() * 0.3 - 0.1,
            a: Math.random() * 0.4 + 0.1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.08));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.08));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        cloths.forEach(c => {
            const sway = Math.sin(frame * c.speed + c.phase) * 15;
            ctx.fillStyle = rgba(S.r, S.g, S.b, 0.08);
            ctx.beginPath();
            ctx.moveTo(c.x + sway, c.y);
            for (let i = 0; i <= 10; i++) {
                const tx = c.x + sway + (i / 10) * c.w;
                const ty = c.y + Math.sin(i * 0.6 + frame * c.speed + c.phase) * c.h * 0.15;
                ctx.lineTo(tx, ty);
            }
            ctx.lineTo(c.x + sway + c.w, c.y + c.h);
            ctx.lineTo(c.x + sway, c.y + c.h);
            ctx.closePath();
            ctx.fill();
        });

        motes.forEach(m => {
            m.y += m.vy;
            if (m.y < -10) { m.y = height + 10; m.x = Math.random() * width; }
            ctx.fillStyle = rgba(S.r, S.g, S.b, m.a);
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
