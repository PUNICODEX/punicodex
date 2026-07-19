// Dhātṛ — The One Who Sets the World (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('order-canvas');
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
    const P = readColor('data-primary', '#DAA520');
    const S = readColor('data-secondary', '#FFF8DC');
    const GLYPHS = 'अआइईउऊॐकदनपयरसह';

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

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const t = performance.now() / 1000;
        const cx = width / 2, cy = height * 0.4;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
        rg.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)');
        rg.addColorStop(0.3, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
        rg.addColorStop(1, 'rgba(6,4,10,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + t * 0.1;
            const r1 = Math.max(width, height) * 0.12, r2 = r1 * (1.6 + 0.3 * Math.sin(t + i));
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.2 + 0.1 * Math.sin(t * 1.5 + i)).toFixed(3) + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(width, height) * 0.05, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
