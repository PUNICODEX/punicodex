// Mahāvairocana — The Great Sun Mandala (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('greatsun-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8A7A2E');
    const S = readColor('data-secondary', '#E8D9A0');
    const GLYPHS = 'महावैरोचन';

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
        lg.addColorStop(0, 'rgba(13,11,4,0.98)');
        lg.addColorStop(1, 'rgba(19,17,7,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.48, R = Math.min(width, height);
        // The Great Sun: a quiet core of light.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.4 + 0.06 * Math.sin(t * 0.7)) + ')');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2); ctx.fill();
        // The solar disc and its rings.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.45)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.1, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.25)';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.13, 0, Math.PI * 2); ctx.stroke();
        // Thirty-six rays of the dharmakaya, turning as one slow dawn.
        for (let i = 0; i < 36; i++) {
            const a = t * 0.03 + i * Math.PI / 18;
            const r1 = R * 0.14, r2 = R * (i % 2 === 0 ? 0.3 : 0.24);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.28 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // Mandala rings of petals turning against one another.
        for (let ring = 0; ring < 2; ring++) {
            const rr = R * (0.36 + ring * 0.08), n = 18 + ring * 12, dir = ring === 0 ? 1 : -1;
            for (let i = 0; i < n; i++) {
                const a = dir * t * 0.05 + i * Math.PI * 2 / n;
                const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
                ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 0.9 + i);
                ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
                ctx.beginPath(); ctx.arc(x, y, 1.2 + ring * 0.3, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        // The name of the luminous one within the disc.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.05) + 'px serif';
        ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
