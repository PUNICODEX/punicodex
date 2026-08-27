// Oidipous — dusty Theban crossroads, sphinx shadow, limping rhythm
(function() {
    'use strict';
    const canvas = document.getElementById('oidipous-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C2A26B');
    const S = readColor('data-secondary', '#2F3A56');

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
        lg.addColorStop(0, 'rgba(20,18,24,0.98)');
        lg.addColorStop(1, 'rgba(34,30,36,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.55;
        // Three dusty roads meeting at the crossroads.
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.12)';
        for (let a = 0; a < 3; a++) {
            const ang = -Math.PI / 2 + a * (Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang - 0.16) * width, cy + Math.sin(ang - 0.16) * height);
            ctx.lineTo(cx + Math.cos(ang + 0.16) * width, cy + Math.sin(ang + 0.16) * height);
            ctx.fill();
        }
        // Sphinx shadow gliding across the ground.
        const sx = ((t * 0.03) % 1.4 - 0.2) * width;
        const sy = height * 0.62 + Math.sin(t * 0.5) * 8;
        ctx.fillStyle = 'rgba(8,8,14,0.55)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx + 30, sy - 5); ctx.lineTo(sx + 55, sy - 45); ctx.lineTo(sx + 70, sy - 2); ctx.fill();
        // Dust motes in the air.
        for (let i = 0; i < 48; i++) {
            const seed = i * 0.21;
            const x = ((seed * 851 + t * (0.08 + (i % 4) * 0.03) + Math.sin(t * 0.3 + i) * 0.02) % 1) * width;
            const y = ((seed * 463 + t * 0.02) % 1) * height;
            const a = 0.05 + 0.08 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
        // Limping gait rhythm — a faint staggered line.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.18)';
        ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(cx - 80, cy + 90);
        for (let i = 0; i < 6; i++) ctx.lineTo(cx - 80 + i * 28, cy + 90 - (i % 2) * 14);
        ctx.stroke(); ctx.setLineDash([]);
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
