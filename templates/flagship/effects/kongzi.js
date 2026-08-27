// Kongzi — bamboo scrolls unroll; ink-brush strokes fade in; apricot petals drift
(function() {
    'use strict';
    const canvas = document.getElementById('kongzi-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#DC143C');
    const S = readColor('data-secondary', '#F5DEB3');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const strokes = [];
    for (let i = 0; i < 7; i++) strokes.push({x: 0.15 + Math.random() * 0.7, y: 0.2 + i * 0.1, phase: i, length: 60 + Math.random() * 80});
    let t = 0;
    function draw() {
        t += 0.008;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(22,18,14,0.98)');
        lg.addColorStop(1, 'rgba(32,26,20,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Bamboo scrolls unrolling in tiers.
        for (let i = 0; i < 4; i++) {
            const y = height * (0.18 + i * 0.18);
            const unroll = 0.7 + 0.3 * Math.sin(t * 0.5 + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.06 + 0.03 * unroll) + ')';
            ctx.fillRect(width * 0.1, y, width * 0.8 * unroll, height * 0.08);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(width * 0.1, y, width * 0.8 * unroll, height * 0.08);
        }
        // Fading ink-brush strokes.
        strokes.forEach((s, i) => {
            const alpha = 0.15 + 0.15 * Math.abs(Math.sin(t * 0.4 + s.phase));
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + alpha + ')';
            ctx.lineWidth = 3 + 2 * Math.sin(t + s.phase);
            ctx.lineCap = 'round';
            ctx.beginPath();
            const sx = width * s.x, sy = height * s.y;
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(sx + s.length * 0.4, sy - 10 + Math.sin(t + s.phase) * 6, sx + s.length, sy + 5);
            ctx.stroke();
        });
        // Apricot petals drifting down.
        for (let i = 0; i < 30; i++) {
            const seed = i * 0.31;
            const x = ((seed * 857 + t * (0.04 + (i % 4) * 0.015) + Math.sin(t * 0.5 + i) * 0.03) % 1) * width;
            const y = ((seed * 641 + t * 0.025) % 1) * height;
            const a = 0.12 + 0.1 * Math.sin(t + i);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.save(); ctx.translate(x, y); ctx.rotate(t + i);
            ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
