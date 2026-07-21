// Rādhā — The Heart of the Rasa Dance (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('rasa-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#7A3B4A');
    const S = readColor('data-secondary', '#D4A5B0');
    const GLYPHS = 'राधा';

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
        lg.addColorStop(0, 'rgba(13,7,9,0.98)');
        lg.addColorStop(1, 'rgba(19,10,12,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.5, R = Math.min(width, height);
        // The rosewood glow of Vraja at evening.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.4);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.35 + 0.08 * Math.sin(t * 0.8)) + ')');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2); ctx.fill();
        // The lotus: twelve petals breathing open and closed.
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6 + Math.PI / 2;
            const open = 1 + 0.06 * Math.sin(t * 0.6);
            const pr = R * 0.16 * open, pw = R * 0.05;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.ellipse(0, -pr, pw, pr * 0.9, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.26 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.1;
            ctx.stroke();
            ctx.restore();
        }
        // The rasa dance: two rings of lamps circling in opposite time.
        for (let ring = 0; ring < 2; ring++) {
            const rr = R * (0.3 + ring * 0.12), n = 12 + ring * 6, dir = ring === 0 ? 1 : -1;
            for (let i = 0; i < n; i++) {
                const a = dir * t * 0.07 + i * Math.PI * 2 / n;
                const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.86;
                ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 1.2 + i);
                ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
                ctx.beginPath(); ctx.arc(x, y, 1.3 + ring * 0.4, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        // Her name at the heart of the dance.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.06) + 'px serif';
        ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
