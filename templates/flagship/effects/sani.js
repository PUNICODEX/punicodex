// Śani — The Rings of Saturn (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('rings-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#2E3A59');
    const S = readColor('data-secondary', '#8C93A8');

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
        t += 0.004;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(5,6,12,0.98)'; ctx.fillRect(0, 0, width, height);
        // Fixed starfield — karma's ledger.
        for (let i = 0; i < 90; i++) {
            const x = ((i * 137.5) % 100) / 100 * width;
            const y = ((i * 89.3) % 100) / 100 * height;
            ctx.globalAlpha = 0.04 + ((i % 7) / 7) * 0.12;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillRect(x, y, 1, 1);
        }
        const cx = width / 2, cy = height / 2;
        const R = Math.min(width, height) * 0.16;
        // The planet.
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)'; ctx.fill();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        ctx.lineWidth = 1; ctx.stroke();
        // Ring ellipses — precise, slow, inevitable.
        for (let i = 0; i < 4; i++) {
            const rr = R * (1.5 + i * 0.3);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.32);
            ctx.scale(1, 0.32);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.14 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = i === 1 ? 1.6 : 0.9;
            ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        // Slow shadow sweeping the disc — time's passage.
        const shadowAng = t * 0.5;
        const sx = cx + Math.cos(shadowAng) * R * 2;
        const sg = ctx.createLinearGradient(cx, cy, sx, cy);
        sg.addColorStop(0, 'rgba(3,4,8,0)');
        sg.addColorStop(1, 'rgba(3,4,8,0.55)');
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
