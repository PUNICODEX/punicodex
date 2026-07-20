// Plūtō — The Descending Vault (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('underworld-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#3A3F4A');
    const S = readColor('data-secondary', '#B08D2E');

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
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(6,6,9,0.98)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2;
        // Vault steps descending — the stair to the underworld.
        const STEPS = 9;
        for (let i = 0; i < STEPS; i++) {
            const y = height * (0.18 + i * 0.09);
            const w = width * (0.42 - i * 0.028);
            const a = 0.16 + 0.05 * Math.sin(t + i);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(cx - w, y, w * 2, height * 0.055);
        }
        // Buried wealth: gold glints deep in the vault.
        for (let i = 0; i < 26; i++) {
            const x = cx + (((i * 97) % 61) - 30) / 30 * width * 0.28;
            const y = height * (0.5 + ((i * 53) % 37) / 37 * 0.42);
            const tw = 0.08 + 0.18 * (1 + Math.sin(t * 1.4 + i * 2.3)) / 2;
            ctx.globalAlpha = tw;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        // The gate arch at the top.
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.2, height * 0.22);
        ctx.quadraticCurveTo(cx, height * 0.04, cx + width * 0.2, height * 0.22);
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
