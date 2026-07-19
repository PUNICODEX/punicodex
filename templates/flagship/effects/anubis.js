// ꜣnpw — He Who Is Upon His Mountain (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('vigil-canvas-2');
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
    const P = readColor('data-primary', '#1a1a2e');
    const S = readColor('data-secondary', '#D4AF37');
    const GLYPHS = '𓂀𓆣𓋹𓊵𓇳𓈖𓊪';

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

    const orbs = [];
    for (let i = 0; i < 120; i++) orbs.push({ a: Math.random() * Math.PI * 2, r: 0.1 + Math.random() * 0.7, s: (Math.random() - 0.5) * 0.002, g: Math.random() });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2;
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
        rg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.10)');
        rg.addColorStop(1, 'rgba(2,2,8,0.95)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, width, height);
        for (const o of orbs) {
            o.a += o.s + 0.001;
            const x = cx + Math.cos(o.a) * o.r * width * 0.6;
            const y = cy + Math.sin(o.a) * o.r * height * 0.6;
            ctx.globalAlpha = 0.15 + o.g * 0.5;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(x, y, 0.8 + o.g * 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
