// Shakti — trident energy beams; kundalini spiral; lotus mandala pulse
(function() {
    'use strict';
    const canvas = document.getElementById('shakti-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#FF4500');
    const S = readColor('data-secondary', '#FFD700');

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
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,6,10,0.98)');
        lg.addColorStop(1, 'rgba(28,8,8,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2;
        // Lotus mandala rings pulsing outward.
        for (let i = 0; i < 8; i++) {
            const r = (30 + i * 45) * (1 + 0.05 * Math.sin(t * 1.5 + i * 0.7));
            const a = 0.14 - i * 0.015;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let p = 0; p <= 24; p++) {
                const ang = p * (Math.PI / 12);
                const rr = r + 10 * Math.sin(ang * 12 + t + i);
                const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
                if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Kundalini spiral rising.
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 10; a += 0.1) {
            const r = 10 + a * 8;
            const x = cx + Math.cos(a + t) * r;
            const y = cy + height * 0.35 - a * 18;
            if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Trident energy beams.
        for (let i = 0; i < 3; i++) {
            const ang = -Math.PI / 2 + (i - 1) * 0.35;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.15 + 0.1 * Math.sin(t * 2 + i)) + ')';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * height * 0.45, cy + Math.sin(ang) * height * 0.45); ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
