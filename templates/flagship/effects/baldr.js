// Baldr — The Shining One (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('lightfall-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#F5E6B8');
    const S = readColor('data-secondary', '#D4AF37');
    const GLYPHS = 'ᛒᚨᛚᛞᚱ';

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
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,12,16,0.97)');
        lg.addColorStop(1, 'rgba(16,19,24,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, crown = height * 0.16;
        // The radiance of the fairest — a pale halo breathing slowly above the hall.
        for (let i = 0; i < 5; i++) {
            const r = (60 + i * 55) * (1 + 0.04 * Math.sin(t * 0.7 + i));
            const a = 0.05 - i * 0.008 + 0.012 * Math.sin(t * 0.5 + i * 1.3);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 14 - i * 2;
            ctx.beginPath(); ctx.arc(cx, crown, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Light motes drifting down like snow over Glaðsheimr — Baldr's brightness falling gently.
        for (let i = 0; i < 42; i++) {
            const seed = i * 0.618;
            const x = ((seed * 977 + t * (14 + (i % 5) * 3)) % 1) * width;
            const y = ((seed * 431 + t * (0.028 + (i % 4) * 0.006)) % 1) * height;
            const s = 0.7 + (i % 3) * 0.6;
            const a = 0.06 + 0.09 * Math.abs(Math.sin(t * 0.9 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
        }
        // The single dark shaft — the mistletoe crossing the light, thin and inevitable.
        const shaftX = width * (0.68 + 0.02 * Math.sin(t * 0.3));
        ctx.strokeStyle = 'rgba(20,24,30,0.85)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(shaftX - height * 0.28, 0);
        ctx.quadraticCurveTo(shaftX + 18, height * 0.5, shaftX - height * 0.06, height);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.28)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(shaftX - height * 0.28 - 4, 0);
        ctx.quadraticCurveTo(shaftX + 14, height * 0.5, shaftX - height * 0.06 - 4, height);
        ctx.stroke();
        // The name in runes beneath the radiance.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, cx, height * 0.3);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
