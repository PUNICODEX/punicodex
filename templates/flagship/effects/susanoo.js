// Susanoo — storm clouds swirl; sea spray; the eight-forked serpent undulates
(function() {
    'use strict';
    const canvas = document.getElementById('susanoo-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#4A5568');
    const S = readColor('data-secondary', '#DC143C');

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
        lg.addColorStop(0, 'rgba(10,12,18,0.98)');
        lg.addColorStop(1, 'rgba(16,22,30,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Storm clouds swirling overhead.
        for (let i = 0; i < 5; i++) {
            const cx = width * (0.2 + i * 0.15) + Math.sin(t * 0.3 + i) * 60;
            const cy = height * 0.18 + Math.cos(t * 0.2 + i) * 25;
            const r = 70 + i * 20;
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.08 + 0.04 * Math.sin(t + i)) + ')';
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        }
        // Eight-forked serpent (Yamata-no-Orochi) undulating across the lower half.
        ctx.strokeStyle = 'rgba(10,14,18,0.85)';
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        for (let fork = 0; fork < 8; fork++) {
            ctx.beginPath();
            const ybase = height * 0.65 + fork * 18;
            for (let x = 0; x <= width; x += 25) {
                const y = ybase + Math.sin(x * 0.008 + t * 1.2 + fork * 0.7) * 45;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.12 + 0.06 * Math.sin(t + fork)) + ')';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        // Sea spray.
        for (let i = 0; i < 50; i++) {
            const seed = i * 0.19;
            const x = ((seed * 953 + t * (0.2 + (i % 6) * 0.08)) % 1) * width;
            const y = height * 0.55 + Math.sin(x * 0.01 + t + i) * 30 - ((seed * 541 + t * 0.06) % 1) * height * 0.4;
            const a = 0.05 + 0.1 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = 'rgba(200,220,235,' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
