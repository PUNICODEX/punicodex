// Caishen — gold ingots and lucky coins float amid red silk streamers
(function() {
    'use strict';
    const canvas = document.getElementById('caishen-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#DC143C');
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

    const treasures = [];
    for (let i = 0; i < 28; i++) treasures.push({x: Math.random(), y: Math.random(), type: i % 3, size: 14 + Math.random() * 16, spd: 0.4 + Math.random() * 0.6});
    let t = 0;
    function draw() {
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(18,8,10,0.98)');
        lg.addColorStop(1, 'rgba(32,10,14,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Red silk streamers waving.
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 6;
            ctx.beginPath();
            for (let y = 0; y <= height; y += 15) {
                const x = width * (0.15 + i * 0.18) + Math.sin(y * 0.015 + t * (1.5 + i * 0.3) + i) * 35;
                if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Floating ingots and coins.
        treasures.forEach((tr, i) => {
            const x = width * tr.x + Math.sin(t * 0.5 + i) * 20;
            const y = height * (tr.y - (t * tr.spd * 0.04) % 1.1 + 0.1);
            const a = 0.5 + 0.25 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3 + i);
            if (tr.type === 0) {
                // Sycee ingot.
                ctx.beginPath(); ctx.ellipse(0, 0, tr.size, tr.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
                ctx.beginPath(); ctx.ellipse(0, -tr.size * 0.2, tr.size * 0.5, tr.size * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            } else if (tr.type === 1) {
                // Round coin.
                ctx.beginPath(); ctx.arc(0, 0, tr.size * 0.6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
                ctx.beginPath(); ctx.rect(-tr.size * 0.12, -tr.size * 0.25, tr.size * 0.24, tr.size * 0.5); ctx.fill();
            } else {
                // Square gold chip.
                ctx.fillRect(-tr.size * 0.5, -tr.size * 0.5, tr.size, tr.size);
            }
            ctx.restore();
        });
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
