// Theseus — labyrinth thread unwinds; the Minotaur's horned silhouette looms
(function() {
    'use strict';
    const canvas = document.getElementById('theseus-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#1E3A5F');

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
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(12,14,20,0.98)');
        lg.addColorStop(1, 'rgba(20,22,30,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2;
        // Labyrinth walls — concentric meandering rings.
        const rings = 8;
        for (let i = 0; i < rings; i++) {
            const r = 50 + i * 42;
            const a = 0.12 - i * 0.012;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.lineWidth = 4;
            ctx.beginPath();
            const sides = 6 + i;
            for (let j = 0; j <= sides; j++) {
                const ang = j * (Math.PI * 2 / sides) + t * (0.05 + i * 0.01);
                const rr = r + 8 * Math.sin(ang * 3 + t + i);
                const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
                if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Ariadne's thread unwinding toward the centre.
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.45)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 6; a += 0.08) {
            const r = Math.max(10, 340 - a * 14 + 6 * Math.sin(t * 2 + a));
            const x = cx + Math.cos(a + t * 0.3) * r;
            const y = cy + Math.sin(a + t * 0.3) * r;
            if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Horned silhouette looming in the dark.
        ctx.fillStyle = 'rgba(6,8,12,0.75)';
        const bx = cx + Math.sin(t * 0.15) * 40, by = height * 0.25;
        ctx.beginPath();
        ctx.ellipse(bx, by, 55, 70, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - 35, by - 35); ctx.lineTo(bx - 55, by - 95); ctx.lineTo(bx - 10, by - 55); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + 35, by - 35); ctx.lineTo(bx + 55, by - 95); ctx.lineTo(bx + 10, by - 55); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
