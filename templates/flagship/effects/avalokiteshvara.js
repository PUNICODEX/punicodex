// Avalokiteshvara — a thousand arms of light radiate; lotus throne; water-moon reflection
(function() {
    'use strict';
    const canvas = document.getElementById('avalokiteshvara-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#FF4500');
    const S = readColor('data-secondary', '#F5F5F5');

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
        lg.addColorStop(0, 'rgba(10,12,18,0.98)');
        lg.addColorStop(1, 'rgba(14,18,26,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.45;
        // Thousand arms of light radiating in a fan.
        const arms = 36;
        for (let i = 0; i < arms; i++) {
            const ang = -Math.PI * 0.8 + i * (Math.PI * 1.6 / arms);
            const len = height * 0.35 + 25 * Math.sin(t + i);
            const a = 0.06 + 0.04 * Math.sin(t * 0.7 + i);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
        }
        // Lotus throne.
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 90, 110, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy + 90, 110, 30, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 7; i++) {
            const ang = i * (Math.PI / 6) - Math.PI / 2;
            ctx.beginPath(); ctx.ellipse(cx + Math.cos(ang) * 90, cy + 90 + Math.sin(ang) * 20, 25, 10, ang, 0, Math.PI * 2); ctx.fill();
        }
        // Water-moon reflection shimmer.
        for (let i = 0; i < 40; i++) {
            const seed = i * 0.17;
            const x = ((seed * 997 + t * 0.05) % 1) * width;
            const y = height * 0.72 + Math.sin(x * 0.01 + t + i) * 8;
            const a = 0.05 + 0.08 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.beginPath(); ctx.ellipse(x, y, 8 + (i % 4) * 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        // Central compassionate glow.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.2)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
