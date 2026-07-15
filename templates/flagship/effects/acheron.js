// Achérōn — River of Woe
(function() {
    'use strict';
    const canvas = document.getElementById('acheron-hero-canvas');
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
    const P = readColor('data-primary', '#4169E1');
    const S = readColor('data-secondary', '#87CEEB');

    const souls = [];
    for (let i = 0; i < 40; i++) {
        souls.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 1,
            vy: -Math.random() * 0.4 - 0.1,
            vx: (Math.random() - 0.5) * 0.2,
            a: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.08));
        g.addColorStop(1, rgba(P.r * 0.4, P.g * 0.4, P.b * 0.6, 0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = rgba(P.r, P.g, P.b, 0.18);
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 8) {
            const y = height * 0.78 + Math.sin(x * 0.004 + frame * 0.005) * 18
                + Math.sin(x * 0.012 + frame * 0.008) * 6;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = rgba(20, 24, 40, 0.15);
        for (let i = 0; i < 5; i++) {
            const x = (frame * 0.2 + i * width / 5) % (width + 200) - 100;
            const y = height * 0.5 + i * 30;
            ctx.beginPath();
            ctx.arc(x, y, 80 + i * 15, 0, Math.PI * 2);
            ctx.fill();
        }

        souls.forEach(s => {
            s.y += s.vy;
            s.x += s.vx + Math.sin(frame * 0.01 + s.phase) * 0.15;
            if (s.y < -10) {
                s.y = height + 10;
                s.x = Math.random() * width;
            }
            ctx.fillStyle = rgba(S.r, S.g, S.b, s.a * (0.7 + 0.3 * Math.sin(frame * 0.02 + s.phase)));
            ctx.shadowBlur = 8;
            ctx.shadowColor = rgba(S.r, S.g, S.b, 0.3);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
