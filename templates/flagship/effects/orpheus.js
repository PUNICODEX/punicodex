// Orpheús — The Lyre Rings (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('lyre-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#5C4A7A');
    const S = readColor('data-secondary', '#C9A227');
    const GLYPHS = 'Ὀρφεύς';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const ripples = [];
    for (let i = 0; i < 5; i++) ripples.push({ r: 0, speed: 0.0016 + i * 0.0004, phase: i * 0.2 });
    let t = 0;
    function draw() {
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(9,6,14,0.97)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.46;
        const R = Math.min(width, height) * 0.3;
        // The lyre: two horns and a crossbar, drawn as geometry.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx - R * 0.35, cy, R * 0.55, Math.PI * 0.75, Math.PI * 1.55);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + R * 0.35, cy, R * 0.55, Math.PI * 1.45, Math.PI * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.52, cy - R * 0.42);
        ctx.lineTo(cx + R * 0.52, cy - R * 0.42);
        ctx.stroke();
        // Strings with traveling vibration.
        for (let s = -2; s <= 2; s++) {
            const x = cx + s * R * 0.17;
            ctx.beginPath();
            for (let y = cy - R * 0.42; y <= cy + R * 0.55; y += 6) {
                const amp = 2.2 * Math.exp(-Math.abs(y - cy) / (R * 0.5));
                const xx = x + Math.sin(y * 0.09 + t * (2 + s * 0.3)) * amp;
                if (y === cy - R * 0.42) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.25 + 0.08 * Math.sin(t * 1.3 + s)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Sound ripples from the instrument.
        for (const rp of ripples) {
            rp.r += rp.speed;
            if (rp.r > 1) rp.r = 0;
            const rr = rp.r * R * 2.4;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.2 * (1 - rp.r)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.16) + 'px serif';
        ctx.globalAlpha = 0.2 + 0.08 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy + R * 1.15);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
