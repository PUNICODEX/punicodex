// Māra — The Tempter and His Wheeling Host (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('tempter-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#3D1E2E');
    const S = readColor('data-secondary', '#A87F95');
    const GLYPHS = 'मार';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const swarm = [];
    for (let i = 0; i < 30; i++) swarm.push({ a: Math.random() * 6.28, r: 0.12 + Math.random() * 0.3, s: 0.02 + Math.random() * 0.05, g: Math.random() });
    let t = 0;
    function draw() {
        t += 0.009;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,5,8,0.98)');
        lg.addColorStop(1, 'rgba(15,8,12,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.52, R = Math.min(width, height);
        // Shadow tendrils: slow dark bands coiling across the field.
        for (let b = 0; b < 5; b++) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 12) {
                const y = height * (0.2 + b * 0.15) + Math.sin(x * 0.004 + t * (0.3 + b * 0.06) + b * 2) * 26;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
            ctx.lineWidth = 6; ctx.stroke();
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.08)';
            ctx.lineWidth = 1; ctx.stroke();
        }
        // The vortex of temptation: three arcs winding inward.
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let k = 0; k <= 40; k++) {
                const p = k / 40;
                const ang = t * 0.12 + i * (Math.PI * 2 / 3) + p * 3.2;
                const rr = R * (0.05 + p * 0.32);
                const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.9;
                if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.18 + 0.04 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // The army of Māra: a slow geometric swarm wheeling about the heart.
        for (const d of swarm) {
            d.a += d.s * 0.06;
            const rr = R * d.r * (1 + 0.08 * Math.sin(t * 0.5 + d.g * 6.28));
            const x = cx + Math.cos(d.a) * rr, y = cy + Math.sin(d.a) * rr * 0.85;
            ctx.save(); ctx.translate(x, y); ctx.rotate(d.a + t * 0.2);
            ctx.globalAlpha = 0.12 + d.g * 0.2;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.lineWidth = 1;
            const sz = 2 + d.g * 3;
            ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.8, sz); ctx.lineTo(-sz * 0.8, sz); ctx.closePath(); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        // The tempter's name, a whisper at the center.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.06) + 'px serif';
        ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.9);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
