// Ọṣọọsì — The Single Arrow (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('arrow-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E4A2E');
    const S = readColor('data-secondary', '#7FB88F');
    const GLYPHS = 'ỌṢỌỌSÌ';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const dapples = [];
    for (let i = 0; i < 22; i++) dapples.push({ x: Math.random(), y: Math.random() * 0.75, r: 0.02 + Math.random() * 0.05, p: Math.random() * 6.28, v: 0.3 + Math.random() * 0.7 });
    let t = 0;
    function draw() {
        t += 0.011;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,11,7,0.98)');
        lg.addColorStop(1, 'rgba(8,17,11,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // The forest canopy: soft dapple of light through leaves.
        for (const d of dapples) {
            const a = 0.05 + 0.04 * Math.sin(t * d.v + d.p);
            const dx = d.x * width, dy = d.y * height, dr = d.r * Math.min(width, height);
            const rg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr);
            rg.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')');
            rg.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
        }
        // The drawn bow: a tall arc and its string at the field's edge.
        const bx = width * 0.22, by = height * 0.55, bh = height * 0.34;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.3)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(bx, by - bh); ctx.quadraticCurveTo(bx + bh * 0.5, by, bx, by + bh); ctx.stroke();
        const pull = Math.sin(t * 0.5) * bh * 0.05;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx, by - bh); ctx.lineTo(bx - bh * 0.22 - pull, by); ctx.lineTo(bx, by + bh); ctx.stroke();
        // The single arrow: one perfect flight, loosed again and again.
        const span = width * 0.68, rise = height * 0.16;
        const p = (t * 0.09) % 1;
        const ax = bx + p * span;
        const ay = by - Math.sin(p * Math.PI) * rise;
        for (let k = 0; k < 12; k++) {
            const pk = p - k * 0.014;
            if (pk <= 0) break;
            const tx = bx + pk * span;
            const ty = by - Math.sin(pk * Math.PI) * rise;
            ctx.globalAlpha = 0.3 * (1 - k / 12);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(tx, ty, 1.6 - k * 0.09, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // The shaft and its point, aligned to the arc of flight.
        const dxu = span * 0.02, dyu = -Math.cos(p * Math.PI) * Math.PI * rise * 0.02;
        const len = Math.sqrt(dxu * dxu + dyu * dyu);
        const ux = dxu / len, uy = dyu / len;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ax - ux * 26, ay - uy * 26);
        ctx.lineTo(ax + ux * 10, ay + uy * 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + ux * 18, ay + uy * 18);
        ctx.lineTo(ax + ux * 8 - uy * 4, ay + uy * 8 + ux * 4);
        ctx.moveTo(ax + ux * 18, ay + uy * 18);
        ctx.lineTo(ax + ux * 8 + uy * 4, ay + uy * 8 - ux * 4);
        ctx.stroke();
        // The hunter's name beneath the flight.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, width * 0.62, height * 0.78);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
