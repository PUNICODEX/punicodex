// Aganjú — Volcano of the Wilderness
(function() {
    'use strict';
    const canvas = document.getElementById('aganju-hero-canvas');
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

    const embers = [];
    for (let i = 0; i < 70; i++) {
        embers.push({
            x: Math.random() * width,
            y: height + Math.random() * 100,
            r: Math.random() * 2 + 0.5,
            vy: -Math.random() * 2 - 0.5,
            vx: (Math.random() - 0.5) * 0.6,
            a: Math.random() * 0.6 + 0.2
        });
    }
    const smoke = [];
    for (let i = 0; i < 20; i++) {
        smoke.push({
            x: width * 0.5 + (Math.random() - 0.5) * 80,
            y: height * 0.55 + Math.random() * 50,
            r: Math.random() * 30 + 20,
            vy: -Math.random() * 0.5 - 0.2,
            vx: (Math.random() - 0.5) * 0.4,
            a: Math.random() * 0.15 + 0.05
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(20, 10, 30, 0.6));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.12));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // volcano slope
        ctx.fillStyle = rgba(30, 20, 25, 0.9);
        ctx.beginPath();
        ctx.moveTo(width * 0.2, height);
        ctx.lineTo(width * 0.5, height * 0.55);
        ctx.lineTo(width * 0.8, height);
        ctx.closePath();
        ctx.fill();

        // crater glow
        const glow = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, 120);
        glow.addColorStop(0, rgba(P.r, P.g, P.b, 0.45));
        glow.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.55, 120, 0, Math.PI * 2);
        ctx.fill();

        smoke.forEach(s => {
            s.y += s.vy;
            s.x += s.vx;
            s.r += 0.05;
            if (s.y < height * 0.2) {
                s.y = height * 0.55;
                s.x = width * 0.5 + (Math.random() - 0.5) * 80;
                s.r = Math.random() * 30 + 20;
            }
            ctx.fillStyle = rgba(120, 110, 120, s.a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        embers.forEach(e => {
            e.y += e.vy;
            e.x += e.vx + Math.sin(frame * 0.02 + e.y * 0.01) * 0.3;
            if (e.y < -10) {
                e.y = height + Math.random() * 50;
                e.x = width * 0.4 + Math.random() * width * 0.2;
            }
            ctx.fillStyle = rgba(P.r, P.g, P.b, e.a);
            ctx.shadowBlur = 6;
            ctx.shadowColor = rgba(P.r, P.g, P.b, 0.5);
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
