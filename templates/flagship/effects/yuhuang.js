// Yuhuang — jade palace gates; peach blossoms fall through celestial clouds
(function() {
    'use strict';
    const canvas = document.getElementById('yuhuang-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#00A86B');
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
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(8,14,18,0.98)');
        lg.addColorStop(1, 'rgba(12,24,28,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Celestial cloud banks.
        for (let i = 0; i < 5; i++) {
            const y = height * (0.15 + i * 0.16);
            const xoff = Math.sin(t * 0.2 + i) * 40;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.03 + 0.02 * Math.sin(t * 0.3 + i)) + ')';
            ctx.beginPath();
            for (let x = -50; x <= width + 50; x += 40) {
                const yy = y + Math.sin(x * 0.015 + i) * 20;
                if (x === -50) ctx.moveTo(x + xoff, yy); else ctx.lineTo(x + xoff, yy);
            }
            ctx.lineTo(width + 50, height); ctx.lineTo(-50, height); ctx.fill();
        }
        // Jade palace gate silhouette.
        const gx = width * 0.5, gh = height * 0.5;
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(gx - 120, height); ctx.lineTo(gx - 120, height - gh);
        ctx.lineTo(gx, height - gh - 60); ctx.lineTo(gx + 120, height - gh);
        ctx.lineTo(gx + 120, height); ctx.stroke();
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)';
        ctx.fill();
        // Roof ornaments.
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
        for (let x of [gx - 120, gx, gx + 120]) {
            ctx.beginPath(); ctx.arc(x, height - gh - (x === gx ? 60 : 0), 6, 0, Math.PI * 2); ctx.fill();
        }
        // Peach blossoms drifting down.
        for (let i = 0; i < 36; i++) {
            const seed = i * 0.27;
            const x = ((seed * 947 + t * (0.03 + (i % 5) * 0.01) + Math.sin(t * 0.4 + i) * 0.02) % 1) * width;
            const y = ((seed * 653 + t * 0.02) % 1) * height;
            const a = 0.15 + 0.12 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.7 + i);
            ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
