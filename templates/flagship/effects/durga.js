// Durgā — Ten-Armed Radiance
(function() {
    'use strict';
    const canvas = document.getElementById('durga-hero-canvas');
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
    const P = readColor('data-primary', '#FF9933');
    const S = readColor('data-secondary', '#8B0000');

    const arms = [];
    for (let i = 0; i < 10; i++) {
        arms.push({
            angle: (Math.PI * 2 / 10) * i,
            len: Math.min(width, height) * 0.22,
            phase: Math.random() * Math.PI * 2
        });
    }
    const flames = [];
    for (let i = 0; i < 30; i++) {
        flames.push({
            x: Math.random() * width,
            y: height + Math.random() * 50,
            r: Math.random() * 3 + 1,
            vy: -Math.random() * 2 - 0.5,
            a: Math.random() * 0.5 + 0.2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.6);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.2));
        g.addColorStop(1, rgba(S.r, S.g, S.b, 0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.5;

        // tiger stripe background
        ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.06);
        ctx.lineWidth = 8;
        for (let i = -5; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(i * width / 8, height);
            ctx.quadraticCurveTo((i + 0.5) * width / 8, height * 0.5, (i + 1) * width / 8, 0);
            ctx.stroke();
        }

        // radiant arms
        arms.forEach(a => {
            const len = a.len + Math.sin(frame * 0.03 + a.phase) * 10;
            const x = cx + Math.cos(a.angle + frame * 0.002) * len;
            const y = cy + Math.sin(a.angle + frame * 0.002) * len;
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.4);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = rgba(S.r, S.g, S.b, 0.7);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // central halo
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        halo.addColorStop(0, rgba(P.r, P.g, P.b, 0.5));
        halo.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();

        flames.forEach(f => {
            f.y += f.vy;
            if (f.y < -10) { f.y = height + Math.random() * 50; f.x = Math.random() * width; }
            ctx.fillStyle = rgba(P.r, P.g, P.b, f.a);
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
