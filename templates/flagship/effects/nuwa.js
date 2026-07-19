// Nǚwā — The Mender of the Sky (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('stones-canvas');
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
    const P = readColor('data-primary', '#20B2AA');
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

    const stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.4, tw: 0.5 + Math.random() * 2, ph: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(3,3,10,0.97)'; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const s of stars) {
            const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.tw + s.ph));
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.95)';
            ctx.beginPath(); ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 5; i++) {
            const sx = ((t * 60 + i * 300) % (width + 200)) - 100;
            const sy = height * 0.2 + i * height * 0.12;
            ctx.globalAlpha = 0.5 * Math.max(0, 1 - Math.abs(((t + i) % 4) - 2) / 2);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.9)';
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 40, sy + 12); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
