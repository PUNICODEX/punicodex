// Kṣitigarbha — The Descent with the Staff (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('earthwomb-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#4A3B2E');
    const S = readColor('data-secondary', '#B8A07F');
    const GLYPHS = 'क्षितिगर्भ';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const motes = [];
    for (let i = 0; i < 40; i++) motes.push({ x: Math.random(), y: Math.random(), v: 0.0005 + Math.random() * 0.001, g: Math.random(), up: i % 3 === 0 });
    let t = 0;
    function draw() {
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(11,9,6,0.98)');
        lg.addColorStop(1, 'rgba(16,13,9,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // The strata of the earth, layer upon patient layer.
        for (let b = 0; b < 6; b++) {
            const yBase = height * (0.15 + b * 0.14);
            ctx.beginPath();
            for (let x = 0; x <= width; x += 11) {
                const y = yBase + Math.sin(x * 0.005 + t * (0.2 + b * 0.05) + b) * 6;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.05 + 0.02 * b) + ')';
            ctx.lineWidth = 1; ctx.stroke();
        }
        // The khakkhara: the staff whose rings wake the lost.
        const R = Math.min(width, height);
        const sx = width * 0.76, stop = height * 0.22, sbot = height * 0.86;
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(sx, stop); ctx.lineTo(sx, sbot); ctx.stroke();
        for (let i = 0; i < 4; i++) {
            const ry = stop + i * R * 0.03;
            const sway = Math.sin(t * 0.8 + i) * R * 0.004;
            ctx.beginPath(); ctx.arc(sx + sway, ry, R * 0.02, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 + 0.1 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // The descent: motes of light going down into the dark — and the lifted, rising.
        for (const m of motes) {
            if (m.up) { m.y -= m.v * 0.7; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); } }
            else { m.y += m.v; if (m.y > 1.05) { m.y = -0.05; m.x = Math.random(); } }
            const x = m.x * width + Math.sin(t + m.g * 6.28) * 10;
            ctx.globalAlpha = (m.up ? 0.12 : 0.08) + m.g * 0.22;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, m.y * height, 0.7 + m.g * 1.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // The hells, emptying: nested arcs fading one by one in slow cycle.
        const cx = width / 2, by = height * 0.98;
        for (let i = 0; i < 6; i++) {
            const r = R * (0.1 + i * 0.07);
            const a = 0.06 + 0.14 * (0.5 + 0.5 * Math.sin(t * 0.5 - i * 0.6));
            ctx.beginPath(); ctx.arc(cx, by, r, Math.PI, Math.PI * 2);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.lineWidth = 1.1; ctx.stroke();
        }
        // The earth-womb's name in the still middle.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, width * 0.42, height * 0.45);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
