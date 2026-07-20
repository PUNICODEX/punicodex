// Gaṅgā — The Descending River (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('river-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1F4A5C');
    const S = readColor('data-secondary', '#7FA8B8');
    const GLYPHS = 'गङ्गाॐ';

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const STREAMS = 9;
    const motes = [];
    for (let i = 0; i < 24; i++) motes.push({ s: Math.floor(Math.random() * STREAMS), x: Math.random(), v: 0.001 + Math.random() * 0.002, g: Math.random() });
    let t = 0;
    function streamX(s, y) {
        const base = (s + 0.5) / STREAMS * width;
        return base + Math.sin(y * 0.006 + s * 1.3 + t * 0.4) * width * 0.05 * Math.sin(s + 1);
    }
    function draw() {
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(6,10,14,0.97)'); lg.addColorStop(1, 'rgba(10,18,26,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Braided streams descending in slow curves.
        for (let s = 0; s < STREAMS; s++) {
            ctx.beginPath();
            for (let y = 0; y <= height; y += 10) {
                const x = streamX(s, y);
                if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.08 + 0.04 * Math.sin(t + s)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Light motes riding the streams downward.
        for (const m of motes) {
            m.x += m.v; if (m.x > 1) { m.x = 0; m.s = Math.floor(Math.random() * STREAMS); }
            const y = m.x * height;
            const x = streamX(m.s, y);
            ctx.globalAlpha = 0.15 + m.g * 0.35;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 0.8 + m.g * 1.5, 0, Math.PI * 2); ctx.fill();
        }
        // Devanagari at the source.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.05) + 'px serif';
        for (let i = 0; i < GLYPHS.length; i++) {
            ctx.globalAlpha = 0.10 + 0.06 * Math.sin(t * 0.6 + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillText(GLYPHS[i], width * (0.3 + i * 0.13), height * 0.14);
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
