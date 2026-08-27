// Vanaheimr — The Hostage's Home (bespoke hero effect)
// Sea-swells of Nóatún and golden grain motes of the Vanir, with the Younger Futhark name faint above
(function() {
    'use strict';
    const canvas = document.getElementById('vanhome-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C9A94E');   // grain gold of the Vanir's harvest
    const S = readColor('data-secondary', '#4E7A8A'); // the sea-roads of Nóatún
    const GLYPHS = 'ᚢᛅᚾᚼᛁᛘᛁᚱ';
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
    for (let i = 0; i < 48; i++) {
        motes.push({
            x: Math.random(), y: Math.random(),
            s: Math.random() * 1.8 + 0.5,
            vy: -(Math.random() * 0.05 + 0.015) / 100,
            ph: Math.random() * Math.PI * 2,
            ps: Math.random() * 0.02 + 0.008
        });
    }
    let t = 0;
    function draw() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(9,14,13,0.97)');
        lg.addColorStop(1, 'rgba(12,20,18,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // layered sea-swells — slow bands drifting out of phase, the road the hostages crossed
        for (let band = 0; band < 4; band++) {
            const baseY = height * (0.58 + band * 0.11);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.22 - band * 0.04 + 0.05 * Math.sin(t * 0.8 + band)) + ')';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 6) {
                const y = baseY + Math.sin(x * 0.004 + t * (0.5 + band * 0.14) + band * 1.7) * (10 + band * 5);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // grain motes rising — the Vanir's wealth drifting up from the swells
        for (const m of motes) {
            m.ph += m.ps;
            m.y += m.vy;
            if (m.y < -0.03) { m.y = 1.03; m.x = Math.random(); }
            const a = 0.25 + 0.2 * Math.sin(m.ph);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + Math.max(a, 0.05) + ')';
            ctx.beginPath();
            ctx.arc(m.x * width + Math.sin(m.ph * 0.6) * 14, m.y * height, m.s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
