// Sif — The Golden Grain (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('goldengrain-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E3B34C');
    const S = readColor('data-secondary', '#8A6A2F');
    const GLYPHS = 'ᛋᛁᚠ';
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
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,11,8,0.97)');
        lg.addColorStop(1, 'rgba(18,15,9,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Sif's golden hair read as the corn-field: rows of stalks swaying in one slow wind.
        const stalks = Math.max(24, Math.floor(width / 34));
        for (let i = 0; i < stalks; i++) {
            const x = (i + 0.5) * (width / stalks);
            const h = height * (0.28 + 0.14 * Math.sin(i * 1.7));
            const baseY = height * 0.92;
            const sway = Math.sin(t * 1.4 + i * 0.55) * 10 + Math.sin(t * 0.7 + i * 0.21) * 6;
            const tipX = x + sway, tipY = baseY - h;
            const glow = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 0.8);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.35 + 0.2 * glow) + ')';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x + sway * 0.4, baseY - h * 0.55, tipX, tipY);
            ctx.stroke();
            for (let g = 0; g < 6; g++) {
                const gy = tipY + g * 4.5;
                const side = (g % 2 === 0) ? 1 : -1;
                ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.45 + 0.25 * glow - g * 0.04) + ')';
                ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.moveTo(tipX, gy);
                ctx.lineTo(tipX + side * 6, gy - 4.5);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.10 + 0.08 * glow) + ')';
            ctx.beginPath(); ctx.arc(tipX, tipY, 9 + 3 * glow, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
