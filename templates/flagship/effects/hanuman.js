// Hanumān — The Mountain Bearer (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('mountain-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#B0621E');
    const S = readColor('data-secondary', '#C9A227');
    const GLYPHS = 'हनुमान्जयश्रीराम';

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
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(10,7,4,0.97)'; ctx.fillRect(0, 0, width, height);
        // Sun disc, slow-pulsing, behind the peak.
        const sx = width * 0.5, sy = height * 0.34, sr = Math.min(width, height) * 0.16 * (1 + 0.04 * Math.sin(t * 0.8));
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.2);
        sg.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)');
        sg.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();
        // Geometric mountain silhouette (the carried mountain of herbs).
        const base = height * 0.86;
        ctx.beginPath();
        ctx.moveTo(width * 0.12, base);
        ctx.lineTo(width * 0.3, height * 0.52);
        ctx.lineTo(width * 0.38, height * 0.62);
        ctx.lineTo(width * 0.5, height * 0.42);
        ctx.lineTo(width * 0.62, height * 0.6);
        ctx.lineTo(width * 0.72, height * 0.5);
        ctx.lineTo(width * 0.9, base);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.22)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.7)';
        ctx.lineWidth = 1.5; ctx.stroke();
        // Herb glints along the ridge.
        const ridge = [[0.3, 0.52], [0.38, 0.62], [0.5, 0.42], [0.62, 0.6], [0.72, 0.5]];
        ridge.forEach(([fx, fy], i) => {
            const x = fx * width, y = fy * height;
            ctx.globalAlpha = 0.3 + 0.35 * (1 + Math.sin(t * 1.6 + i * 1.9)) / 2;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
        });
        // The leap: a slow arc of dust across the sky.
        for (let i = 0; i < 40; i++) {
            const p = (t * 0.06 + i / 40) % 1;
            const x = width * (0.1 + p * 0.8);
            const y = height * 0.7 - Math.sin(p * Math.PI) * height * 0.4;
            ctx.globalAlpha = 0.05 + (i / 40) * 0.2;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i / 40) * 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.045) + 'px serif';
        for (let i = 0; i < GLYPHS.length; i++) {
            ctx.globalAlpha = 0.09 + 0.05 * Math.sin(t * 0.5 + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(GLYPHS[i], width * (0.18 + i * 0.09), height * 0.12);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
