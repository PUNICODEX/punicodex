// Guāndì — The Loyalty Seal (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('halberd-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#7A1F1F');
    const S = readColor('data-secondary', '#C9A227');
    const GLYPHS = '關帝忠義';

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
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(8,5,6,0.97)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2, R = Math.min(width, height) * 0.34;

        // Concentric seal rings — the stamped loyalty seal.
        for (let i = 0; i < 5; i++) {
            const r = R * (0.35 + i * 0.16);
            const a = 0.10 + 0.05 * Math.sin(t * 0.7 + i);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (a + 0.12) + ')';
            ctx.lineWidth = i === 2 ? 2 : 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // The halberd: a slow geometric diagonal — blade edge catching gold.
        const ang = -Math.PI / 4 + Math.sin(t * 0.3) * 0.03;
        const x1 = cx - Math.cos(ang) * R * 1.2, y1 = cy - Math.sin(ang) * R * 1.2;
        const x2 = cx + Math.cos(ang) * R * 1.2, y2 = cy + Math.sin(ang) * R * 1.2;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // Crescent blade at the tip.
        ctx.save(); ctx.translate(x2, y2); ctx.rotate(ang + Math.PI / 2);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.7)';
        ctx.beginPath(); ctx.arc(0, -R * 0.12, R * 0.14, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
        ctx.restore();
        // Seal glyphs at ring points.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.16) + 'px serif';
        for (let i = 0; i < GLYPHS.length; i++) {
            const a = (i / GLYPHS.length) * Math.PI * 2 + t * 0.1;
            ctx.globalAlpha = 0.28 + 0.14 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(GLYPHS[i], cx + Math.cos(a) * R * 0.68, cy + Math.sin(a) * R * 0.68);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
