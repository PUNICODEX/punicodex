// Freyja — The Fire of Brísingamen (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('brising-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8A33D');
    const S = readColor('data-secondary', '#C25E4E');
    const GLYPHS = 'ᚠᚱᛖᚤᛁᚨ';

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
        lg.addColorStop(0, 'rgba(14,10,10,0.97)');
        lg.addColorStop(1, 'rgba(20,12,12,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, arcY = height * 0.52, arcR = Math.min(width, height) * 0.34;
        // Brísingamen's arc — the necklace breathing jewel-light in slow cycle.
        const beads = 9;
        for (let i = 0; i < beads; i++) {
            const a = Math.PI * (0.15 + 0.7 * (i / (beads - 1)));
            const x = cx + Math.cos(a) * arcR;
            const y = arcY + Math.sin(a) * arcR * 0.55;
            const pulse = 0.5 + 0.5 * Math.sin(t * 1.1 - i * 0.6);
            const r = 3 + 3.4 * pulse;
            const glowR = r * (3.2 + pulse);
            const g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            g.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.22 + 0.2 * pulse) + ')');
            g.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.5 + 0.4 * pulse) + ')';
            ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
        }
        // The goldsmiths' thread between the jewels.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, arcY, arcR, arcR * 0.55, 0, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
        // Embers rising — the fire of Fólkvangr and the smoke of seiðr.
        for (let i = 0; i < 30; i++) {
            const seed = i * 0.618;
            const x = ((seed * 733 + Math.sin(t * 0.4 + i) * 0.03 + 1) % 1) * width;
            const y = height - (((seed * 389 + t * (0.05 + (i % 4) * 0.011)) % 1) * height);
            const a = 0.05 + 0.1 * Math.abs(Math.sin(t * 1.3 + i * 1.7));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        // The Lady's name in runes.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, cx, height * 0.24);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
