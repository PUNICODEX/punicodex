// Māzǔ — The Compass of the Sea (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('tide-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E3A5F');
    const S = readColor('data-secondary', '#C9A227');
    const GLYPHS = '媽祖';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(5,8,14,0.98)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.44, R = Math.min(width, height) * 0.3;
        // Compass rose — the sailor's guide.
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const long = i % 2 === 0;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (long ? 0.55 : 0.25) + ')';
            ctx.lineWidth = long ? 1.6 : 1;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * R * 0.16, cy + Math.sin(a) * R * 0.16);
            ctx.lineTo(cx + Math.cos(a) * R * (long ? 1 : 0.72), cy + Math.sin(a) * R * (long ? 1 : 0.72));
            ctx.stroke();
        }
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.2 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, R * (0.4 + i * 0.3), 0, Math.PI * 2); ctx.stroke();
        }
        // Slow needle, never hurried.
        const na = -Math.PI / 2 + Math.sin(t * 0.35) * 0.12;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(na) * R * 0.2, cy - Math.sin(na) * R * 0.2);
        ctx.lineTo(cx + Math.cos(na) * R * 0.9, cy + Math.sin(na) * R * 0.9);
        ctx.stroke();
        // Tide arcs below.
        for (let b = 0; b < 4; b++) {
            const y = height * (0.74 + b * 0.06);
            ctx.beginPath();
            for (let x = 0; x <= width; x += 10) {
                const yy = y + Math.sin(x * 0.006 + t * 0.8 + b) * 7;
                if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
            }
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.16 + 0.04 * b) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.2) + 'px serif';
        ctx.globalAlpha = 0.22 + 0.08 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
