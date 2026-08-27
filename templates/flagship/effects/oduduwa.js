// Oduduwa — Ifá divination chain swings; earth-origin dust rises; royal crown motifs glimmer
(function() {
    'use strict';
    const canvas = document.getElementById('oduduwa-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#4B0082');

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
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,10,14,0.98)');
        lg.addColorStop(1, 'rgba(24,18,14,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Earth-origin dust rising from below.
        for (let i = 0; i < 45; i++) {
            const seed = i * 0.21;
            const x = ((seed * 911 + t * (0.03 + (i % 5) * 0.01) + Math.sin(t * 0.3 + i) * 0.02) % 1) * width;
            const y = height - ((seed * 547 + t * 0.025) % 1) * height * 0.55;
            const a = 0.06 + 0.08 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        // Ifá divination chain (opele) swinging from the top.
        const cx = width * 0.35;
        const swing = Math.sin(t * 1.2) * 0.12;
        ctx.save(); ctx.translate(cx, 0); ctx.rotate(swing);
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let i = 0; i < 8; i++) {
            const y = 70 + i * 55;
            ctx.lineTo(Math.sin(i * 0.8) * 10, y);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.3 + 0.15 * Math.sin(t + i)) + ')';
            ctx.beginPath(); ctx.arc(Math.sin(i * 0.8) * 10, y, 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.stroke(); ctx.restore();
        // Royal crown motifs glimmering.
        for (let i = 0; i < 5; i++) {
            const x = width * (0.55 + i * 0.1);
            const y = height * 0.25 + Math.sin(t + i) * 10;
            const a = 0.15 + 0.15 * Math.sin(t * 0.8 + i);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 25, y + 15); ctx.lineTo(x - 15, y - 15); ctx.lineTo(x, y + 5);
            ctx.lineTo(x + 15, y - 15); ctx.lineTo(x + 25, y + 15); ctx.stroke();
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (a * 0.5) + ')';
            ctx.beginPath(); ctx.arc(x, y + 15, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
