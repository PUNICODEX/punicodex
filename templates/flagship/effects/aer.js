// Aḗr — Breath of the Sky
(function() {
    'use strict';
    const canvas = document.getElementById('aer-hero-canvas');
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
    const P = readColor('data-primary', '#87CEEB');
    const S = readColor('data-secondary', '#F5F5F5');

    const streams = [];
    for (let i = 0; i < 12; i++) {
        streams.push({
            y: Math.random() * height,
            amp: Math.random() * 40 + 20,
            len: Math.random() * 0.4 + 0.3,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.004 + 0.002,
            alpha: Math.random() * 0.12 + 0.04
        });
    }
    const motes = [];
    for (let i = 0; i < 60; i++) {
        motes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            vx: Math.random() * 0.5 + 0.2,
            vy: (Math.random() - 0.5) * 0.1,
            a: Math.random() * 0.4 + 0.1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.12));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.02));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        streams.forEach(s => {
            ctx.strokeStyle = rgba(S.r, S.g, S.b, s.alpha);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const startY = s.y + Math.sin(frame * s.speed + s.phase) * s.amp;
            ctx.moveTo(0, startY);
            for (let x = 0; x <= width; x += 30) {
                const t = x / width;
                const y = s.y + Math.sin(t * Math.PI * 4 + frame * s.speed + s.phase) * s.amp * (1 - t * s.len);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        motes.forEach(m => {
            m.x += m.vx;
            if (m.x > width + 10) m.x = -10;
            m.y += m.vy + Math.sin(frame * 0.01 + m.x * 0.005) * 0.1;
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
