// Wyrd — The Word That Becomes (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('wordthatbecomes-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8B89A');
    const S = readColor('data-secondary', '#6E7A8A');
    const GLYPHS = 'ᚹᚣᚱᛞ';
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
        lg.addColorStop(0, 'rgba(10,11,14,0.97)');
        lg.addColorStop(1, 'rgba(14,16,20,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cy = height * 0.52;
        // the warp: loose threads on the left, woven to a single line at the decree, unspooling on the right
        for (let i = 0; i < 9; i++) {
            const seed = i * 0.618;
            const y0 = height * (0.28 + (seed * 197 % 1) * 0.44);
            const c = i % 2 === 0 ? P : S;
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.10 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(0, y0 + Math.sin(t * 0.7 + i) * 10);
            ctx.quadraticCurveTo(width * 0.34, y0 + Math.sin(t * 0.5 + i * 2) * 22, width * 0.58, cy + Math.sin(t * 0.9 + i) * 3);
            ctx.stroke();
        }
        // the single woven line running on from the decree
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.3 + 0.1 * Math.sin(t * 1.2)) + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(width * 0.58, cy);
        ctx.lineTo(width, cy + Math.sin(t * 0.6) * 6);
        ctx.stroke();
        // the decree point, breathing
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.35 + 0.15 * Math.sin(t * 1.2)) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width * 0.58, cy, 7 + 2 * Math.sin(t * 1.2), 0, Math.PI * 2);
        ctx.stroke();
        // motes of what becomes, rising off the woven line
        for (let i = 0; i < 12; i++) {
            const seed = i * 0.377;
            const z = ((t * 0.05 + seed) % 1);
            const x = width * (0.58 + (seed * 431 % 1) * 0.36);
            const y = cy - z * height * 0.3 + Math.sin(t + i) * 4;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.18 * (1 - z)) + ')';
            ctx.beginPath();
            ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
