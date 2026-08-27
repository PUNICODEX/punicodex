// Ravana — ten shadow heads; Lanka's golden towers; demon-fire embers
(function() {
    'use strict';
    const canvas = document.getElementById('ravana-hero-canvas');
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
        t += 0.009;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(14,8,8,0.98)');
        lg.addColorStop(1, 'rgba(30,10,8,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Golden towers of Lanka silhouetted against the fire.
        for (let i = 0; i < 7; i++) {
            const x = width * (0.1 + i * 0.13);
            const h = height * (0.25 + (i % 3) * 0.1);
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.06 + 0.03 * Math.sin(t + i)) + ')';
            ctx.fillRect(x, height - h, 36, h);
            ctx.beginPath(); ctx.moveTo(x - 8, height - h); ctx.lineTo(x + 18, height - h - 24); ctx.lineTo(x + 44, height - h); ctx.fill();
        }
        // Ten shadow heads fanned across the upper darkness.
        const cx = width / 2, cy = height * 0.22;
        for (let i = 0; i < 10; i++) {
            const ang = -0.7 + i * 0.155;
            const hx = cx + Math.sin(ang) * 170;
            const hy = cy + Math.cos(ang) * 50;
            ctx.fillStyle = 'rgba(8,6,8,0.7)';
            ctx.beginPath(); ctx.arc(hx, hy, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)';
            ctx.beginPath(); ctx.arc(hx - 6, hy + 2, 3, 0, Math.PI * 2); ctx.arc(hx + 6, hy + 2, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Demon-fire embers.
        for (let i = 0; i < 40; i++) {
            const seed = i * 0.23;
            const x = ((seed * 911 + t * (0.04 + (i % 5) * 0.015)) % 1) * width;
            const y = height * 0.95 - ((seed * 677 + t * (0.03 + (i % 4) * 0.01)) % 1) * height;
            const a = 0.15 + 0.2 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
