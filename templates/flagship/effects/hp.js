// Ḥp — The Bringer of the Flood (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('flood-canvas');
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
    const P = readColor('data-primary', '#1E90FF');
    const S = readColor('data-secondary', '#3CB371');
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

    const waves = [];
    for (let i = 0; i < 5; i++) waves.push({ y: 0.45 + i * 0.1, amp: 18 + i * 8, speed: 0.4 + i * 0.15, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, 'rgba(3,8,18,0.95)');
        g.addColorStop(1, 'rgba(' + Math.round(P.r * 0.25) + ',' + Math.round(P.g * 0.25) + ',' + Math.round(P.b * 0.35) + ',0.95)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        const t = performance.now() / 1000;
        for (const w of waves) {
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 6) {
                const y = w.y * height + Math.sin(x / 90 + t * w.speed + w.phase) * w.amp;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
