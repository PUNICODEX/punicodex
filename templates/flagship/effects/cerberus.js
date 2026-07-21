// Kérberos — The Hound of the Threshold (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('gatehound-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#3D2B24');
    const S = readColor('data-secondary', '#A87F6A');
    const GLYPHS = 'ΚΕΡΒΕΡΟΣ';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const embers = [];
    for (let i = 0; i < 36; i++) embers.push({ x: Math.random(), y: Math.random(), v: 0.0004 + Math.random() * 0.001, g: Math.random() });
    let t = 0;
    function draw() {
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,8,6,0.98)');
        lg.addColorStop(1, 'rgba(18,11,8,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.52, R = Math.min(width, height);
        // The gate of Hades: two pillars and a lintel, plain and final.
        const gh = R * 0.16, gtop = cy - R * 0.3, gbot = cy + R * 0.3;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.24)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(cx - gh, gtop); ctx.lineTo(cx - gh, gbot); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + gh, gtop); ctx.lineTo(cx + gh, gbot); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - gh * 1.3, gtop); ctx.lineTo(cx + gh * 1.3, gtop); ctx.stroke();
        // The three heads: three circles riding a slow triangle about the threshold.
        const orb = R * 0.15;
        for (let i = 0; i < 3; i++) {
            const a = t * 0.09 + i * (Math.PI * 2 / 3);
            const hx = cx + Math.cos(a) * orb, hy = cy + Math.sin(a) * orb * 0.7;
            const hr = R * 0.075 * (1 + 0.08 * Math.sin(t * 0.9 + i * 2.1));
            ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.34 + 0.06 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.3; ctx.stroke();
            ctx.beginPath(); ctx.arc(hx, hy, hr * 0.45, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)';
            ctx.lineWidth = 1; ctx.stroke();
        }
        // The threefold breath: pulse-arcs leaving the gate in slow succession.
        for (let i = 0; i < 3; i++) {
            const p = ((t * 0.1 + i / 3) % 1);
            ctx.beginPath(); ctx.arc(cx, cy, p * R * 0.42, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.16 * (1 - p)) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // Embers sinking below the threshold.
        for (const e of embers) {
            e.y += e.v; if (e.y > 1.05) { e.y = -0.05; e.x = Math.random(); }
            const x = e.x * width + Math.sin(t + e.g * 6.28) * 8;
            ctx.globalAlpha = 0.1 + e.g * 0.28;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, e.y * height, 0.7 + e.g * 1.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // The hound's name upon the gate.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, gtop - R * 0.06);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
