// Cōātlīcue — Serpent Skirt of Duality
(function() {
    'use strict';
    const canvas = document.getElementById('coatlicue-hero-canvas');
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
    const S = readColor('data-secondary', '#2F2F2F');
    const HEART = { r: 220, g: 20, b: 60 };

    const serpents = [];
    for (let i = 0; i < 2; i++) {
        serpents.push({
            side: i === 0 ? -1 : 1,
            phase: Math.random() * Math.PI * 2
        });
    }
    const hearts = [];
    for (let i = 0; i < 12; i++) {
        hearts.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 2,
            a: Math.random() * 0.3 + 0.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(8, 8, 12, 0.7));
        g.addColorStop(1, rgba(P.r * 0.2, P.g * 0.2, P.b * 0.2, 0.4));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // dual pillars
        const colW = width * 0.12;
        ctx.fillStyle = rgba(P.r, P.g, P.b, 0.12);
        ctx.fillRect(width * 0.2 - colW / 2, 0, colW, height);
        ctx.fillStyle = rgba(HEART.r, HEART.g, HEART.b, 0.12);
        ctx.fillRect(width * 0.8 - colW / 2, 0, colW, height);

        serpents.forEach(s => {
            const cx = width * 0.5 + s.side * width * 0.18;
            ctx.strokeStyle = rgba(s.side === -1 ? P.r : HEART.r, s.side === -1 ? P.g : HEART.g, s.side === -1 ? P.b : HEART.b, 0.4);
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let y = height * 0.35; y <= height; y += 10) {
                const t = (y - height * 0.35) / (height * 0.65);
                const x = cx + s.side * Math.sin(y * 0.04 + frame * 0.02 + s.phase) * (30 + t * 60);
                if (y === height * 0.35) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // central heart
        const pulse = 0.8 + 0.2 * Math.sin(frame * 0.04);
        const hx = width * 0.5;
        const hy = height * 0.28;
        ctx.fillStyle = rgba(HEART.r, HEART.g, HEART.b, 0.25 * pulse);
        ctx.beginPath();
        ctx.moveTo(hx, hy + 10 * pulse);
        ctx.bezierCurveTo(hx - 12 * pulse, hy - 10 * pulse, hx - 20 * pulse, hy + 2 * pulse, hx, hy + 14 * pulse);
        ctx.bezierCurveTo(hx + 20 * pulse, hy + 2 * pulse, hx + 12 * pulse, hy - 10 * pulse, hx, hy + 10 * pulse);
        ctx.fill();

        hearts.forEach(h => {
            const a = h.a * (0.7 + 0.3 * Math.sin(frame * 0.03 + h.phase));
            ctx.fillStyle = rgba(HEART.r, HEART.g, HEART.b, a);
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
