// Hermóðr — The Rider of the Nine Nights (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('helroad-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#2E3B4A');
    const S = readColor('data-secondary', '#8FA3B8');
    const GLYPHS = 'ᚼᛁᚱᛘᚢᚦᚱ';

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
        lg.addColorStop(0, 'rgba(7,10,14,0.98)');
        lg.addColorStop(1, 'rgba(12,17,23,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, horizon = height * 0.4, base = height * 1.02;
        const halfRoad = width * 0.3;
        // The Hel-road: two long edges converging on the horizon of the ninth night.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx - halfRoad, base); ctx.lineTo(cx, horizon); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + halfRoad, base); ctx.lineTo(cx, horizon); ctx.stroke();
        // Way-marks rising toward the rider — the long miles of the descent.
        for (let i = 0; i < 14; i++) {
            const z = ((t * 0.045 + i / 14) % 1);
            const zp = Math.pow(z, 2.1);
            const y = horizon + (base - horizon) * zp;
            const w = halfRoad * zp * 0.14;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.05 + 0.2 * z) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx - w, y); ctx.lineTo(cx + w, y); ctx.stroke();
        }
        // The nine gates of the nine nights — one brightens in turn, in slow cycle.
        const active = Math.floor(t * 0.35) % 9;
        for (let i = 0; i < 9; i++) {
            const z = (i + 1) / 9;
            const zp = Math.pow(z, 1.6);
            const y = horizon + (base - horizon) * zp;
            const r = 6 + halfRoad * zp * 0.28;
            const a = (i === active ? 0.4 : 0.12) + 0.04 * Math.sin(t + i);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.lineWidth = i === active ? 1.6 : 1;
            ctx.beginPath(); ctx.arc(cx, y, r, Math.PI, Math.PI * 2); ctx.stroke();
        }
        // Sleipnir's star: two squares turning as one — the eight-legged gait at the road's end.
        const sr = Math.min(width, height) * 0.09;
        for (let q = 0; q < 2; q++) {
            const rot = t * 0.06 + q * Math.PI / 4;
            ctx.beginPath();
            for (let k = 0; k <= 4; k++) {
                const a = rot + k * Math.PI / 2;
                const x = cx + Math.cos(a) * sr, y = horizon + Math.sin(a) * sr * 0.62;
                if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 + 0.06 * Math.sin(t * 0.8)) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        // The rider's name in runes above the road.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
