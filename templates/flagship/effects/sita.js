// Sītā — The Golden Furrow (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('furrow-canvas');
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
    const P = readColor('data-primary', '#B8860B');
    const S = readColor('data-secondary', '#8B0000');
    const GLYPHS = 'सीतारामॐ';

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

    // Furrows: long diagonal plough-lines breathing light toward the horizon.
    const FURROWS = 12;
    // Blooms: lotus glints rising from the tilled earth.
    const blooms = [];
    for (let i = 0; i < 30; i++) blooms.push({
        x: Math.random(), y: 0.55 + Math.random() * 0.45,
        r: 0.5 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0004 + Math.random() * 0.0008,
    });

    let t = 0;
    function draw() {
        t += 0.014;
        ctx.clearRect(0, 0, width, height);
        // Earth at dusk.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,6,4,0.97)');
        lg.addColorStop(0.6, 'rgba(18,10,6,0.94)');
        lg.addColorStop(1, 'rgba(26,14,6,0.98)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);

        // Furrow lines converging to a horizon point, pulsing with dawn light.
        const hx = width / 2, hy = height * 0.42;
        for (let f = 0; f < FURROWS; f++) {
            const spread = (f - (FURROWS - 1) / 2) / ((FURROWS - 1) / 2);
            const xEdge = hx + spread * width * 0.85;
            const pulse = 0.10 + 0.08 * Math.sin(t * 0.9 + f * 0.55);
            const grad = ctx.createLinearGradient(hx, hy, xEdge, height);
            grad.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.05 + pulse) + ')');
            grad.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.3 + pulse) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1 + (f % 3) * 0.6;
            ctx.beginPath();
            ctx.moveTo(hx + spread * width * 0.06, hy);
            ctx.quadraticCurveTo(hx + spread * width * 0.4, hy + (height - hy) * 0.55, xEdge, height);
            ctx.stroke();
        }

        // Lotus glints rising from the furrows.
        for (const b of blooms) {
            b.y -= b.speed;
            if (b.y < 0.42) { b.y = 0.55 + Math.random() * 0.45; b.x = Math.random(); }
            const x = b.x * width;
            const y = b.y * height;
            const tw = 0.25 + 0.35 * (1 + Math.sin(t * 2 + b.phase)) / 2;
            ctx.globalAlpha = tw;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, b.r * 6);
            glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.9)');
            glow.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, b.r * 6, 0, Math.PI * 2); ctx.fill();
        }
        // Devanagari seed-syllables drifting low over the field.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '15px serif';
        for (let i = 0; i < GLYPHS.length; i++) {
            const x = width * (0.12 + i * 0.16) + Math.sin(t * 0.5 + i) * 8;
            const y = height * 0.82 + Math.cos(t * 0.4 + i * 2) * 6;
            ctx.globalAlpha = 0.12 + 0.1 * Math.sin(t + i * 1.7);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
            ctx.fillText(GLYPHS[i], x, y);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
