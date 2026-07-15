// Atlantís — Submerged Citadel
(function() {
    'use strict';
    const canvas = document.getElementById('atlantis-hero-canvas');
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
    const S = readColor('data-secondary', '#20B2AA');

    const bubbles = [];
    for (let i = 0; i < 50; i++) {
        bubbles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 0.5,
            vy: -Math.random() * 1 - 0.3,
            vx: (Math.random() - 0.5) * 0.3,
            a: Math.random() * 0.4 + 0.1
        });
    }
    const rays = [];
    for (let i = 0; i < 7; i++) {
        rays.push({
            x: Math.random() * width,
            angle: Math.random() * 0.2 + 0.15,
            width: Math.random() * 40 + 30
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.15));
        g.addColorStop(1, rgba(P.r * 0.3, P.g * 0.3, P.b * 0.5, 0.4));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // submerged city silhouette
        ctx.fillStyle = rgba(10, 20, 35, 0.8);
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, height * 0.72);
        ctx.lineTo(width * 0.08, height * 0.72);
        ctx.lineTo(width * 0.08, height * 0.58);
        ctx.lineTo(width * 0.16, height * 0.58);
        ctx.lineTo(width * 0.16, height * 0.68);
        ctx.lineTo(width * 0.26, height * 0.68);
        ctx.lineTo(width * 0.26, height * 0.48);
        ctx.lineTo(width * 0.34, height * 0.48);
        ctx.lineTo(width * 0.34, height * 0.68);
        ctx.lineTo(width * 0.46, height * 0.68);
        ctx.lineTo(width * 0.5, height * 0.52);
        ctx.lineTo(width * 0.54, height * 0.68);
        ctx.lineTo(width * 0.66, height * 0.68);
        ctx.lineTo(width * 0.66, height * 0.48);
        ctx.lineTo(width * 0.74, height * 0.48);
        ctx.lineTo(width * 0.74, height * 0.68);
        ctx.lineTo(width * 0.84, height * 0.68);
        ctx.lineTo(width * 0.84, height * 0.58);
        ctx.lineTo(width * 0.92, height * 0.58);
        ctx.lineTo(width * 0.92, height * 0.72);
        ctx.lineTo(width, height * 0.72);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // light shafts
        rays.forEach(r => {
            const grad = ctx.createLinearGradient(r.x, 0, r.x + Math.tan(r.angle) * height, height);
            grad.addColorStop(0, rgba(S.r, S.g, S.b, 0.15));
            grad.addColorStop(1, rgba(S.r, S.g, S.b, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(r.x, 0);
            ctx.lineTo(r.x + r.width, 0);
            ctx.lineTo(r.x + r.width + Math.tan(r.angle) * height, height);
            ctx.lineTo(r.x + Math.tan(r.angle) * height, height);
            ctx.closePath();
            ctx.fill();
        });

        // bubbles
        bubbles.forEach(b => {
            b.y += b.vy;
            b.x += b.vx + Math.sin(frame * 0.02 + b.y * 0.01) * 0.2;
            if (b.y < -10) { b.y = height + 10; b.x = Math.random() * width; }
            ctx.strokeStyle = rgba(S.r, S.g, S.b, b.a);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
