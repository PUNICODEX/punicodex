// Átropos — She Who Cannot Be Turned (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('thread-canvas');
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
    const P = readColor('data-primary', '#4B0082');
    const S = readColor('data-secondary', '#C0C0C0');
    const GLYPHS = 'ΑΘΔΖΗΛΞΠΣΦΨΩ';

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

    const threads = [];
    for (let i = 0; i < 7; i++) threads.push({ y: 0.15 + i * 0.12, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(4,4,10,0.95)'; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const th of threads) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const y = th.y * height + Math.sin(x / 120 + t * th.speed + th.phase) * height * 0.04;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 20; i++) {
            const x = ((t * 20 + i * 97) % (width + 40)) - 20;
            const y = (i / 20) * height;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.8)';
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
