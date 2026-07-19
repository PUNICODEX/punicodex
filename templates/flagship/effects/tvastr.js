// Tvaṣṭṛ — The Architect of the Gods (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('forge-canvas-2');
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
    const P = readColor('data-primary', '#CD853F');
    const S = readColor('data-secondary', '#F5E3A8');
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

    const sparks = [];
    for (let i = 0; i < 80; i++) sparks.push({ x: Math.random(), y: Math.random() + 0.3, v: 0.2 + Math.random() * 0.5, s: Math.random() * 2 + 0.5, a: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, height, 0, 0);
        g.addColorStop(0, 'rgba(' + Math.round(P.r * 0.3) + ',8,8,0.9)');
        g.addColorStop(1, 'rgba(5,5,12,0.97)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        for (const s of sparks) {
            s.y -= s.v / 100;
            s.a += 0.03;
            if (s.y < -0.05) { s.y = 1; s.x = Math.random(); }
            const wob = Math.sin(s.a) * 20;
            ctx.globalAlpha = Math.max(0, s.y) * 0.7;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)';
            ctx.beginPath(); ctx.arc(s.x * width + wob, s.y * height, s.s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
