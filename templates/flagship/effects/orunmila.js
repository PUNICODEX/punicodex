// Ọrúnmìlà — Golden Wisdom of Ifá
(function() {
    'use strict';
    const canvas = document.getElementById('orunmila-hero-canvas');
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

    const nuts = [];
    for (let i = 0; i < 16; i++) {
        nuts.push({
            x: width * 0.5 + Math.cos((Math.PI * 2 / 16) * i) * 90,
            y: height * 0.5 + Math.sin((Math.PI * 2 / 16) * i) * 90,
            r: 5,
            baseAngle: (Math.PI * 2 / 16) * i
        });
    }
    const chains = [];
    for (let i = 0; i < 4; i++) {
        chains.push({
            x: width * 0.25 + i * width * 0.17,
            y: height * 0.2,
            len: height * 0.4,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
        g.addColorStop(0, rgba(S.r, S.g, S.b, 0.18));
        g.addColorStop(1, rgba(8, 8, 12, 0.85));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.5;

        // sacred geometry hexagram
        ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.25);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i + frame * 0.002;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
            ctx.stroke();
        }

        // divination chain
        chains.forEach(c => {
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.35);
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let j = 0; j <= 10; j++) {
                const t = j / 10;
                const x = c.x + Math.sin(t * 4 + frame * 0.02 + c.phase) * 10;
                const y = c.y + t * c.len;
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // palm nuts orbit
        nuts.forEach(n => {
            const angle = n.baseAngle + frame * 0.005;
            const r = 90 + Math.sin(frame * 0.03 + n.baseAngle) * 10;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            ctx.fillStyle = rgba(P.r, P.g, P.b, 0.85);
            ctx.shadowBlur = 8;
            ctx.shadowColor = rgba(P.r, P.g, P.b, 0.5);
            ctx.beginPath();
            ctx.arc(x, y, n.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
