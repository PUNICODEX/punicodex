// Tonatiuh — Aztec sun-stone rays rotate; obsidian shards glint; sacrificial fire rises
(function() {
    'use strict';
    const canvas = document.getElementById('tonatiuh-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#50C878');
    const S = readColor('data-secondary', '#2F2F2F');

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
        lg.addColorStop(0, 'rgba(12,10,8,0.98)');
        lg.addColorStop(1, 'rgba(26,14,8,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.42;
        // Rotating sun-stone rays.
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.25);
        for (let i = 0; i < 16; i++) {
            ctx.save(); ctx.rotate(i * (Math.PI * 2 / 16));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.1 + 0.05 * Math.sin(t + i)) + ')';
            ctx.beginPath();
            ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(0, 160); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
        // Sun face.
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, 75, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.12)';
        ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
        // Obsidian shards glinting.
        for (let i = 0; i < 30; i++) {
            const seed = i * 0.37;
            const x = ((seed * 883 + t * 0.02) % 1) * width;
            const y = ((seed * 619 + t * 0.015) % 1) * height;
            const a = 0.1 + 0.25 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.save(); ctx.translate(x, y); ctx.rotate(t + i);
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.fill(); ctx.restore();
        }
        // Sacrificial fire rising.
        for (let i = 0; i < 40; i++) {
            const seed = i * 0.23;
            const x = cx + (Math.random() - 0.5) * 120;
            const y = height * 0.9 - ((seed * 457 + t * (0.04 + (i % 5) * 0.01)) % 1) * height * 0.5;
            const a = 0.15 + 0.2 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = 'rgba(255,120,40,' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
