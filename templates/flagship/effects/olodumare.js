// Olódùmarè — Supreme Cosmic Light
(function() {
    'use strict';
    const canvas = document.getElementById('olodumare-hero-canvas');
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

    const stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.4 + 0.3,
            a: Math.random() * 0.6 + 0.2,
            tw: Math.random() * Math.PI * 2
        });
    }
    const spiral = [];
    for (let i = 0; i < 200; i++) {
        const t = i / 20;
        spiral.push({ t: t, r: 5 + t * 4 });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.25));
        g.addColorStop(0.5, rgba(S.r, S.g, S.b, 0.1));
        g.addColorStop(1, rgba(5, 5, 10, 0.9));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.5;

        // galaxy spiral
        ctx.strokeStyle = rgba(S.r, S.g, S.b, 0.15);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        spiral.forEach((s, idx) => {
            const angle = s.t + frame * 0.002;
            const r = s.r * (0.8 + 0.2 * Math.sin(frame * 0.01 + s.t));
            const x = cx + Math.cos(angle) * r * Math.min(width, height) * 0.003;
            const y = cy + Math.sin(angle) * r * Math.min(width, height) * 0.0015;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        stars.forEach(s => {
            const a = s.a * (0.7 + 0.3 * Math.sin(frame * 0.03 + s.tw));
            ctx.fillStyle = rgba(255, 255, 255, a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // central light
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
        glow.addColorStop(0, rgba(P.r, P.g, P.b, 0.5));
        glow.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 100, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
