// Stýx — The River of the Oath (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('oath-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E3A4A');
    const S = readColor('data-secondary', '#7FA8B8');
    const GLYPHS = 'ΣΤΥΞ';

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
        t += 0.009;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(4,8,11,0.98)');
        lg.addColorStop(1, 'rgba(8,14,20,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // The slow dark current — bands flowing in one direction, unhurried, unbreakable.
        for (let b = 0; b < 8; b++) {
            const yBase = height * (0.2 + b * 0.08);
            ctx.beginPath();
            for (let x = 0; x <= width; x += 9) {
                const y = yBase + Math.sin(x * 0.006 + t * (0.5 + b * 0.09) + b) * 8 * (1 + b * 0.12);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.07 + 0.025 * b + 0.02 * Math.sin(t + b)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // The oath rings: concentric circles slowly expanding from the river's heart.
        const cx = width / 2, cy = height * 0.55;
        for (let i = 0; i < 5; i++) {
            const p = ((t * 0.12 + i / 5) % 1);
            const r = p * Math.min(width, height) * 0.5;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.22 * (1 - p)) + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // The river's name on the water.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.06) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
