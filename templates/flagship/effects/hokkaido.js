// Hokkaidō — The Northern Road (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('snow-canvas');
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
    const P = readColor('data-primary', '#B0E0E6');
    const S = readColor('data-secondary', '#1E90FF');
    const GLYPHS = '北海道本州九州日月山川';

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

    const peaks = [0.55, 0.35, 0.7, 0.45, 0.62];
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(5,8,14,0.95)');
        g.addColorStop(1, 'rgba(8,12,22,0.98)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        for (let layer = 0; layer < 3; layer++) {
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.06 + layer * 0.04).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let i = 0; i <= peaks.length; i++) {
                const x = (i / peaks.length) * width;
                const y = height * (1 - peaks[i % peaks.length] * (1 - layer * 0.15));
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < 60; i++) {
            const x = (Math.sin(i * 37) * 0.5 + 0.5) * width;
            const y = (Math.sin(i * 91) * 0.5 + 0.5) * height * 0.6;
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.fillRect(x, y, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
        if (!reduced) setTimeout(() => requestAnimationFrame(draw), 120);
    }
    draw();
})();
