// Psyche — butterfly-wing scales rising on warm currents of breath
(function() {
    'use strict';
    const canvas = document.getElementById('psyche-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#E8D4A2');
    const S = readColor('data-secondary', '#D8A7CA');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const scales = [];
    for (let i = 0; i < 64; i++) {
        scales.push({
            x: Math.random(), y: Math.random(), s: 2 + Math.random() * 4,
            hue: Math.random(), spd: 0.2 + Math.random() * 0.4, phase: Math.random() * Math.PI * 2
        });
    }
    let t = 0;
    function draw() {
        t += 0.01;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(22,18,28,0.98)');
        lg.addColorStop(1, 'rgba(32,26,38,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Warm air currents (subtle arcs).
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.04)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            for (let x = 0; x <= width; x += 30) {
                const y = height * (0.35 + i * 0.15) + Math.sin(x * 0.004 + t * 0.5 + i) * 30;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        // Butterfly-wing scales drifting upward.
        scales.forEach((p, i) => {
            const y = height * p.y - ((t * p.spd + i * 0.1) % 1) * height * 1.1;
            const x = width * p.x + Math.sin(t * 0.8 + p.phase) * 40;
            const c = p.hue > 0.5 ? P : S;
            const a = 0.25 + 0.2 * Math.sin(t + p.phase);
            ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
            ctx.beginPath();
            ctx.ellipse(x, y, p.s, p.s * 0.6, t * 0.5 + p.phase, 0, Math.PI * 2);
            ctx.fill();
        });
        // Central soul glow.
        const cx = width / 2, cy = height * 0.45;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, 110, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
