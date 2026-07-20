// Cerēs — The Wheat Field (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('wheat-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#9C7A1E');
    const S = readColor('data-secondary', '#5E4A10');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const STALKS = 46;
    let t = 0;
    function stalk(x, base, h, phase, alpha) {
        const sway = Math.sin(t * 0.7 + phase) * h * 0.12;
        const tx = x + sway;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + alpha + ')';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x + sway * 0.3, base - h * 0.55, tx, base - h);
        ctx.stroke();
        // Grain head — three short strokes fanning from the tip.
        for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(tx, base - h);
            ctx.lineTo(tx + k * h * 0.1 + sway * 0.2, base - h - h * 0.16);
            ctx.stroke();
        }
    }
    function draw() {
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(8,6,3,0.97)');
        lg.addColorStop(1, 'rgba(14,10,4,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Furrow lines.
        for (let f = 0; f < 6; f++) {
            const y = height * (0.72 + f * 0.05);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.quadraticCurveTo(width / 2, y + 14, width, y);
            ctx.stroke();
        }
        // The field: geometric stalks swaying in one wind.
        for (let i = 0; i < STALKS; i++) {
            const x = (i + 0.5) / STALKS * width + Math.sin(i * 3.7) * 12;
            const h = height * (0.18 + ((i * 53) % 40) / 40 * 0.2);
            stalk(x, height, h, i * 0.6, 0.28 + ((i * 29) % 10) / 10 * 0.3);
        }
        // A slow sun-glow above the field.
        const sx = width * 0.5, sy = height * 0.2;
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, height * 0.35);
        sg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + 0.03 * Math.sin(t * 0.5)) + ')');
        sg.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(sx, sy, height * 0.35, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
