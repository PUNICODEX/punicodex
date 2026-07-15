// Anánkē — Necessity Binding the Cosmos
(function() {
    'use strict';
    const canvas = document.getElementById('ananke-hero-canvas');
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

    const threads = [];
    for (let i = 0; i < 16; i++) {
        threads.push({
            x1: Math.random() * width,
            y1: -20,
            x2: Math.random() * width,
            y2: height + 20,
            amp: Math.random() * 40 + 20,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.005 + 0.002
        });
    }
    const knots = [];
    for (let i = 0; i < 8; i++) {
        knots.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 2,
            a: Math.random() * 0.5 + 0.3
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.12));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.06));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        threads.forEach(t => {
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.18);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1);
            for (let y = 0; y <= height; y += 30) {
                const x = t.x1 + (t.x2 - t.x1) * (y / height)
                    + Math.sin(y * 0.02 + frame * t.speed + t.phase) * t.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(t.x2, t.y2);
            ctx.stroke();
        });

        knots.forEach(k => {
            ctx.fillStyle = rgba(S.r, S.g, S.b, k.a);
            ctx.shadowBlur = 10;
            ctx.shadowColor = rgba(S.r, S.g, S.b, 0.4);
            ctx.beginPath();
            ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // spindle pulse
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.03);
        const glow = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, 120);
        glow.addColorStop(0, rgba(P.r, P.g, P.b, 0.2 * pulse));
        glow.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, 120, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
