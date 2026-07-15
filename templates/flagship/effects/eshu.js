// Ẹṣu — Shadow at the Crossroads
(function() {
    'use strict';
    const canvas = document.getElementById('eshu-hero-canvas');
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

    const paths = [];
    for (let i = 0; i < 4; i++) {
        paths.push({
            angle: Math.PI / 4 + (Math.PI / 2) * i,
            offset: (Math.random() - 0.5) * 20
        });
    }
    const dust = [];
    for (let i = 0; i < 45; i++) {
        dust.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            a: Math.random() * 0.4 + 0.1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.7);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.2));
        g.addColorStop(1, rgba(8, 8, 12, 0.85));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.55;

        // crossroads
        ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.25);
        ctx.lineWidth = 2;
        paths.forEach(p => {
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(p.angle) * 30, cy + Math.sin(p.angle) * 30);
            ctx.lineTo(cx + Math.cos(p.angle) * Math.max(width, height) * 0.6,
                       cy + Math.sin(p.angle) * Math.max(width, height) * 0.6);
            ctx.stroke();
        });

        // shifting shadow figure
        const shift = Math.sin(frame * 0.02) * 15;
        ctx.fillStyle = rgba(0, 0, 0, 0.35);
        ctx.beginPath();
        ctx.ellipse(cx + shift, cy, 18, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + shift, cy - 50, 14, 0, Math.PI * 2);
        ctx.fill();

        dust.forEach(d => {
            d.x += d.vx;
            d.y += d.vy;
            if (d.x < 0) d.x = width;
            if (d.x > width) d.x = 0;
            if (d.y < 0) d.y = height;
            if (d.y > height) d.y = 0;
            ctx.fillStyle = rgba(P.r, P.g, P.b, d.a);
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
