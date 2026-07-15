// Tlāltēcuhtli — Jaws of the Earth
(function() {
    'use strict';
    const canvas = document.getElementById('tlaltecuhtli-hero-canvas');
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
    const BLOOD = { r: 180, g: 30, b: 30 };

    const stones = [];
    for (let i = 0; i < 50; i++) {
        stones.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 1,
            a: Math.random() * 0.4 + 0.1
        });
    }
    const blood = [];
    for (let i = 0; i < 20; i++) {
        blood.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            r: Math.random() * 2 + 1,
            vy: Math.random() * 1 + 0.5,
            a: Math.random() * 0.4 + 0.1
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(25, 20, 18, 0.85));
        g.addColorStop(1, rgba(P.r * 0.3, P.g * 0.3, P.b * 0.2, 0.4));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.55;

        // stone jaw silhouette
        ctx.fillStyle = rgba(40, 35, 32, 0.9);
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(width * 0.15, height * 0.7);
        ctx.quadraticCurveTo(width * 0.25, height * 0.9, width * 0.35, height * 0.65);
        ctx.quadraticCurveTo(width * 0.45, height * 0.85, width * 0.5, height * 0.6);
        ctx.quadraticCurveTo(width * 0.55, height * 0.85, width * 0.65, height * 0.65);
        ctx.quadraticCurveTo(width * 0.75, height * 0.9, width * 0.85, height * 0.7);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // teeth
        ctx.fillStyle = rgba(200, 200, 190, 0.25);
        for (let i = 0; i < 11; i++) {
            const tx = width * 0.15 + i * width * 0.07;
            const ty = height * 0.75 + Math.sin(i) * 15;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 10, ty + 35);
            ctx.lineTo(tx + 20, ty);
            ctx.closePath();
            ctx.fill();
        }

        // eye glyphs
        [cx - 120, cx + 120].forEach(ex => {
            ctx.strokeStyle = rgba(BLOOD.r, BLOOD.g, BLOOD.b, 0.5);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, cy - 80, 18, 0, Math.PI * 2);
            ctx.moveTo(ex - 22, cy - 80);
            ctx.lineTo(ex + 22, cy - 80);
            ctx.stroke();
            ctx.fillStyle = rgba(BLOOD.r, BLOOD.g, BLOOD.b, 0.6);
            ctx.beginPath();
            ctx.arc(ex + Math.sin(frame * 0.03 + ex) * 5, cy - 80, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        stones.forEach(s => {
            ctx.fillStyle = rgba(P.r, P.g, P.b, s.a);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        blood.forEach(b => {
            b.y += b.vy;
            if (b.y > height) { b.y = -10; b.x = Math.random() * width; }
            ctx.fillStyle = rgba(BLOOD.r, BLOOD.g, BLOOD.b, b.a);
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
