// Omphalos — Delphic navel-stone: pulsing stone rings and drifting mountain mist
(function() {
    'use strict';
    const canvas = document.getElementById('omphalos-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C9B99A');
    const S = readColor('data-secondary', '#5B7C99');

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
        lg.addColorStop(0, 'rgba(18,18,22,0.98)');
        lg.addColorStop(1, 'rgba(28,30,36,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.42;
        // Concentric stone rings breathing from the world's centre.
        for (let i = 0; i < 7; i++) {
            const r = (40 + i * 52) * (1 + 0.03 * Math.sin(t * 0.9 + i * 0.7));
            const a = 0.14 - i * 0.016;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 10 - i;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Central omphalos glow.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.28)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
        // Drifting Parnassian mist.
        for (let i = 0; i < 5; i++) {
            const y = height * 0.55 + i * 55 + Math.sin(t * 0.4 + i) * 18;
            const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.06 + 0.03 * Math.sin(t + i)) + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad; ctx.fillRect(0, y - 40, width, 80);
        }
        // Flecks of mica in the sacred stone.
        for (let i = 0; i < 24; i++) {
            const seed = i * 0.41;
            const ang = seed * Math.PI * 2 + t * 0.05;
            const r = 35 + (seed * 160) % 180;
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r * 0.4;
            const a = 0.1 + 0.15 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
