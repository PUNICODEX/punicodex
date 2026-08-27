// Sleipnir — The Gliding One (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('glidingone-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C8D4E0');
    const S = readColor('data-secondary', '#5A6E8C');
    const GLYPHS = 'ᛋᛚᛁᛒᚾᛁᛦ';
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
        lg.addColorStop(0, 'rgba(8,10,16,0.97)');
        lg.addColorStop(1, 'rgba(12,15,22,0.95)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // The Hel-road: a gliding track across the sky
        const cy = height * 0.55;
        // Eight hoof-beats travelling the road, each a short paired stroke with a fading aurora trail
        for (let i = 0; i < 8; i++) {
            const z = ((t * 0.045 + i / 8) % 1);
            const x = width * (0.08 + z * 0.84);
            const y = cy + Math.sin(z * Math.PI * 2 + i * 0.9) * height * 0.045;
            const a = Math.sin(z * Math.PI);
            // trail behind the hoof
            const grad = ctx.createLinearGradient(x - 90, y, x, y);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.22 * a) + ')');
            ctx.strokeStyle = grad; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(x - 90, y + Math.sin((z - 0.05) * Math.PI * 2 + i * 0.9) * height * 0.045); ctx.lineTo(x, y); ctx.stroke();
            // the hoof-stroke itself
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.5 * a) + ')';
            ctx.lineWidth = 2.4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x - 7, y - 4); ctx.lineTo(x + 7, y + 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x - 7, y + 4); ctx.lineTo(x + 7, y - 4); ctx.stroke();
        }
        // The leap over Helgrindr: a bright arc at the centre of the road
        const gx = width * 0.5, gy = cy - height * 0.02;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.28 + 0.1 * Math.sin(t * 1.4)) + ')';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(gx, gy, 60, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        // the gate beneath the arc
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx - 16, gy + 52); ctx.lineTo(gx - 16, gy + 26); ctx.moveTo(gx + 16, gy + 52); ctx.lineTo(gx + 16, gy + 26); ctx.moveTo(gx - 20, gy + 26); ctx.lineTo(gx + 20, gy + 26); ctx.stroke();
        // drifting runes of the name
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(Math.min(width, height) * 0.055) + 'px serif';
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.6);
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
        ctx.fillText(GLYPHS, width / 2, height * 0.22);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
