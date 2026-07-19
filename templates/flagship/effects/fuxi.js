// Fúxī — The First Teacher (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('trigrams-canvas');
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
    const P = readColor('data-primary', '#228B22');
    const S = readColor('data-secondary', '#FFD700');
    const GLYPHS = '龍神天道宇宙日月山川';

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

    function branch(x, y, angle, len, depth) {
        if (depth === 0 || len < 4) return;
        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.15 + depth * 0.05).toFixed(3) + ')';
        ctx.lineWidth = depth * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        const t = performance.now() / 1000;
        const sway = Math.sin(t * 0.5 + depth) * 0.06;
        branch(x2, y2, angle - 0.5 + sway, len * 0.72, depth - 1);
        branch(x2, y2, angle + 0.35 + sway, len * 0.7, depth - 1);
    }
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(4,8,5,0.95)'; ctx.fillRect(0, 0, width, height);
        branch(width / 2, height, -Math.PI / 2, height * 0.22, 7);
        for (let i = 0; i < 40; i++) {
            const t = performance.now() / 1000;
            const x = (Math.sin(i * 91) * 0.5 + 0.5) * width;
            const y = ((t * 12 + i * 53) % height);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
            ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) setTimeout(() => requestAnimationFrame(draw), 40);
    }
    draw();
})();
