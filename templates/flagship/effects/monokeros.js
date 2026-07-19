// Monókerōs — The Single Horn (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('horn-canvas');
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
    const P = readColor('data-primary', '#E6E6FA');
    const S = readColor('data-secondary', '#D4AF37');
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

    const rays = 24;
    const motes = [];
    for (let i = 0; i < 70; i++) motes.push({ x: Math.random(), y: Math.random(), s: 0.1 + Math.random() * 0.3, a: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.42;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
        rg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.22)');
        rg.addColorStop(1, 'rgba(4,4,10,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * Math.PI * 2 + t * 0.05;
            const len = Math.max(width, height) * (0.25 + 0.1 * Math.sin(t + i));
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.10 + 0.06 * Math.sin(t * 2 + i)).toFixed(3) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();
        }
        for (const m of motes) {
            m.y -= m.s / 100;
            if (m.y < 0) m.y = 1;
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(m.x * width, m.y * height, 1.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
