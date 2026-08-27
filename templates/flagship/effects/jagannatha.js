// Jagannatha — temple chariot wheels turn; lotus petals; saffron cloth waves
(function() {
    'use strict';
    const canvas = document.getElementById('jagannatha-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#FF9933');
    const S = readColor('data-secondary', '#8B0000');

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
        lg.addColorStop(0, 'rgba(16,8,8,0.98)');
        lg.addColorStop(1, 'rgba(30,10,10,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Chariot wheels turning across the procession ground.
        for (let k = 0; k < 3; k++) {
            const cx = width * (0.25 + k * 0.25);
            const cy = height * 0.6;
            const r = 60 + k * 15;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.25)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            for (let i = 0; i < 12; i++) {
                const ang = t + k * 0.3 + i * (Math.PI / 6);
                ctx.beginPath(); ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.stroke();
            }
        }
        // Saffron banners waving.
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.2 + 0.08 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 8;
            ctx.beginPath();
            for (let y = 0; y <= height; y += 12) {
                const x = width * (0.12 + i * 0.26) + Math.sin(y * 0.02 + t * (1.2 + i * 0.3) + i) * 28;
                if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Lotus petals drifting down.
        for (let i = 0; i < 32; i++) {
            const seed = i * 0.29;
            const x = ((seed * 887 + t * (0.03 + (i % 5) * 0.01) + Math.sin(t * 0.4 + i) * 0.02) % 1) * width;
            const y = ((seed * 557 + t * 0.02) % 1) * height;
            const a = 0.2 + 0.15 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + i);
            ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
