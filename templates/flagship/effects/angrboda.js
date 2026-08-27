// Angrboda — ironwood forest mist; wolf eyes in darkness; giantess runes
(function() {
    'use strict';
    const canvas = document.getElementById('angrboda-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C0C0C0');
    const S = readColor('data-secondary', '#5C9BD1');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const wolves = [];
    for (let i = 0; i < 5; i++) wolves.push({x: 0.1 + Math.random() * 0.8, y: 0.4 + Math.random() * 0.35, phase: i});
    let t = 0;
    function draw() {
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(8,10,12,0.98)');
        lg.addColorStop(1, 'rgba(14,18,22,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Ironwood trunks.
        ctx.fillStyle = 'rgba(6,8,10,0.7)';
        for (let i = 0; i < 12; i++) {
            const x = width * (0.05 + i * 0.09);
            const w = 12 + (i % 3) * 8;
            ctx.fillRect(x, 0, w, height);
        }
        // Mist drifting between the trees.
        for (let i = 0; i < 6; i++) {
            const y = height * 0.4 + i * 60 + Math.sin(t * 0.3 + i) * 20;
            const grad = ctx.createLinearGradient(0, y - 50, 0, y + 50);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.04 + 0.03 * Math.sin(t + i)) + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad; ctx.fillRect(0, y - 50, width, 100);
        }
        // Wolf eyes in the dark.
        wolves.forEach(w => {
            const x = width * w.x;
            const y = height * w.y;
            const glow = 0.4 + 0.35 * Math.sin(t * 1.5 + w.phase);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + glow + ')';
            ctx.beginPath(); ctx.ellipse(x - 8, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 8, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
        });
        // Giantess runes scratched faintly on the bark.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.045) + 'px serif';
        ctx.globalAlpha = 0.08 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText('ᚨᚾᚷᚱᛒᚩᚦᚨ', width / 2, height * 0.75);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
