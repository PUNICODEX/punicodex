// Fūjin — Storm of the Wind Bags
(function() {
    'use strict';
    const canvas = document.getElementById('fujin-hero-canvas');
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
    const P = readColor('data-primary', '#DC143C');
    const S = readColor('data-secondary', '#1A1A1A');

    const bags = [];
    for (let i = 0; i < 4; i++) {
        bags.push({
            x: width * (0.25 + i * 0.17),
            y: height * (0.25 + (i % 2) * 0.25),
            r: 35 + Math.random() * 15,
            phase: Math.random() * Math.PI * 2
        });
    }
    const wind = [];
    for (let i = 0; i < 14; i++) {
        wind.push({
            y: Math.random() * height,
            amp: Math.random() * 30 + 10,
            speed: Math.random() * 0.01 + 0.005,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, rgba(30, 30, 40, 0.6));
        g.addColorStop(1, rgba(S.r, S.g, S.b, 0.4));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        wind.forEach(w => {
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.1);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 20) {
                const y = w.y + Math.sin(x * 0.01 + frame * w.speed + w.phase) * w.amp;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        bags.forEach(b => {
            const sway = Math.sin(frame * 0.02 + b.phase) * 10;
            ctx.fillStyle = rgba(P.r, P.g, P.b, 0.15);
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.35);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x + sway, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // tied neck
            ctx.beginPath();
            ctx.moveTo(b.x + sway - b.r * 0.6, b.y - b.r * 0.7);
            ctx.lineTo(b.x + sway + b.r * 0.6, b.y - b.r * 0.7);
            ctx.stroke();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
