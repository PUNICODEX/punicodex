// Tūmatauenga — The Face of Battle (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('haka-canvas');
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
    const P = readColor('data-primary', '#8B0000');
    const S = readColor('data-secondary', '#F5E3A8');
    const GLYPHS = 'AEIOUTKMNPRW';

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

    const bolts = [];
    const rain = [];
    for (let i = 0; i < 90; i++) rain.push({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8 });
    for (let i = 0; i < 5; i++) bolts.push({ x: Math.random(), t: Math.random() * 400 });
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(5,5,12,0.9)');
        g.addColorStop(1, 'rgba(15,15,30,0.98)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        frame++;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
        ctx.lineWidth = 1;
        for (const r of rain) {
            r.y += r.v / 100;
            if (r.y > 1) { r.y = 0; r.x = Math.random(); }
            const x = r.x * width, y = r.y * height;
            ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke();
        }
        for (const b of bolts) {
            b.t--;
            if (b.t <= 0) { b.t = 180 + Math.random() * 300; b.x = Math.random(); }
            if (b.t < 8) {
                ctx.globalAlpha = (8 - b.t) / 8;
                ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
                const x = b.x * width;
                ctx.beginPath();
                ctx.moveTo(x, 0); ctx.lineTo(x + 20, height * 0.25); ctx.lineTo(x - 10, height * 0.28);
                ctx.lineTo(x + 25, height * 0.55); ctx.lineTo(x - 5, height * 0.3); ctx.lineTo(x + 15, height * 0.05);
                ctx.closePath(); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
