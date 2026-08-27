// Kratos — chains of power constrict and spark with crimson force
(function() {
    'use strict';
    const canvas = document.getElementById('kratos-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#DC143C');
    const S = readColor('data-secondary', '#D4AF37');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const links = [];
    for (let i = 0; i < 5; i++) links.push({r: 80 + i * 55, phase: i * 1.2, speed: 0.4 + i * 0.1});
    let t = 0;
    function draw() {
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(14,10,12,0.98)');
        lg.addColorStop(1, 'rgba(26,14,16,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2;
        // Constricting chains.
        links.forEach((l, i) => {
            const pulse = 1 + 0.06 * Math.sin(t * l.speed + l.phase);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.12 - i * 0.018) + ')';
            ctx.lineWidth = 6;
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += 0.15) {
                const r = l.r * pulse + 8 * Math.sin(a * 6 + t + l.phase);
                const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
                if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
        });
        // Crimson force sparks where chains tighten.
        for (let i = 0; i < 28; i++) {
            const ang = i * 0.44 + t * 0.3;
            const r = 110 + 130 * ((Math.sin(t * 0.7 + i) + 1) / 2);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            const a = 0.1 + 0.3 * Math.abs(Math.sin(t * 3 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        // Central binding glow.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.22)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
