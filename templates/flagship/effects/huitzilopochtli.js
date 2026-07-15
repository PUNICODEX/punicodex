// Huitzilopōchtli — Left-Handed Hummingbird of the Sun
(function() {
    'use strict';
    const canvas = document.getElementById('huitzilopochtli-hero-canvas');
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
    const FIRE = { r: 255, g: 60, b: 20 };

    const rays = [];
    for (let i = 0; i < 20; i++) {
        rays.push({
            angle: (Math.PI * 2 / 20) * i,
            len: Math.min(width, height) * 0.25,
            speed: Math.random() * 0.003 + 0.001
        });
    }
    const embers = [];
    for (let i = 0; i < 45; i++) {
        embers.push({
            x: Math.random() * width,
            y: height + Math.random() * 50,
            r: Math.random() * 2 + 0.5,
            vy: -Math.random() * 2 - 0.5,
            a: Math.random() * 0.5 + 0.2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.7);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.25));
        g.addColorStop(1, rgba(15, 10, 10, 0.8));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.45;

        rays.forEach(r => {
            const a = r.angle + frame * r.speed;
            const pulse = 0.8 + 0.2 * Math.sin(frame * 0.04 + r.angle * 5);
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.12 * pulse);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * r.len * pulse, cy + Math.sin(a) * r.len * pulse);
            ctx.stroke();
        });

        // hummingbird body
        ctx.fillStyle = rgba(P.r, P.g, P.b, 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // wings
        ctx.fillStyle = rgba(FIRE.r, FIRE.g, FIRE.b, 0.35);
        const wing = 0.5 + 0.5 * Math.sin(frame * 0.3);
        ctx.beginPath();
        ctx.ellipse(cx - 8, cy - 12 * wing, 6, 18 * wing, -0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 8, cy - 12 * wing, 6, 18 * wing, 0.8, 0, Math.PI * 2);
        ctx.fill();

        embers.forEach(e => {
            e.y += e.vy;
            if (e.y < -10) { e.y = height + Math.random() * 50; e.x = Math.random() * width; }
            ctx.fillStyle = rgba(FIRE.r, FIRE.g, FIRE.b, e.a);
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
