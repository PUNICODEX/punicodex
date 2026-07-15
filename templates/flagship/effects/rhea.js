// Rhéā — Golden Mother of the Earth
(function() {
    'use strict';
    const canvas = document.getElementById('rhea-hero-canvas');
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

    const grains = [];
    for (let i = 0; i < 80; i++) {
        grains.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 0.5,
            vy: Math.random() * 0.6 + 0.2,
            vx: (Math.random() - 0.5) * 0.2,
            a: Math.random() * 0.4 + 0.1
        });
    }
    const hills = [];
    for (let i = 0; i < 3; i++) {
        hills.push({
            yBase: height * (0.75 + i * 0.06),
            amp: 25 + i * 10,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.08));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.18));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        hills.forEach((h, idx) => {
            ctx.fillStyle = rgba(P.r, P.g, P.b, 0.1 - idx * 0.025);
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 10) {
                const y = h.yBase + Math.sin(x * 0.003 + frame * 0.002 + h.phase) * h.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        });

        grains.forEach(gm => {
            gm.y += gm.vy;
            gm.x += gm.vx + Math.sin(frame * 0.01 + gm.y * 0.005) * 0.2;
            if (gm.y > height + 10) { gm.y = -10; gm.x = Math.random() * width; }
            ctx.fillStyle = rgba(P.r, P.g, P.b, gm.a);
            ctx.beginPath();
            ctx.arc(gm.x, gm.y, gm.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // maternal glow
        const glow = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, 120);
        glow.addColorStop(0, rgba(P.r, P.g, P.b, 0.2));
        glow.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.45, 120, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
