// Gaurī — The Golden Mandala (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('mandala-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#B8860B');
    const S = readColor('data-secondary', '#6B4E12');

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
    function petalRing(cx, cy, radius, count, phase, alpha) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + phase;
            const x1 = cx + Math.cos(a) * radius * 0.6;
            const y1 = cy + Math.sin(a) * radius * 0.6;
            const x2 = cx + Math.cos(a) * radius;
            const y2 = cy + Math.sin(a) * radius;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + alpha + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(
                cx + Math.cos(a + 0.16) * radius * 0.85,
                cy + Math.sin(a + 0.16) * radius * 0.85,
                x2, y2
            );
            ctx.stroke();
        }
    }
    function draw() {
        t += 0.006;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(9,6,3,0.97)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height / 2, R = Math.min(width, height) * 0.36;
        // Concentric geometric rings.
        for (let i = 0; i < 6; i++) {
            const r = R * (0.2 + i * 0.16);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.15 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // Lotus petal rings, slowly counter-rotating.
        petalRing(cx, cy, R * 0.55, 12, t * 0.15, 0.3);
        petalRing(cx, cy, R * 0.8, 16, -t * 0.1, 0.22);
        petalRing(cx, cy, R * 1.05, 20, t * 0.07, 0.15);
        // The bindu point at the heart.
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.1);
        bg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.8)');
        bg.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R * 0.1, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
