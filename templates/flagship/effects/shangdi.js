// Shangdi — Shang bronze taotie masks; oracle-bone crack patterns; ritual smoke rises
(function() {
    'use strict';
    const canvas = document.getElementById('shangdi-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#CD7F32');
    const S = readColor('data-secondary', '#F5F5DC');

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
        lg.addColorStop(0, 'rgba(14,12,10,0.98)');
        lg.addColorStop(1, 'rgba(28,22,16,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Taotie mask silhouettes.
        for (let k = 0; k < 3; k++) {
            const cx = width * (0.22 + k * 0.28);
            const cy = height * 0.4 + Math.sin(t * 0.4 + k) * 8;
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.12 + 0.04 * Math.sin(t + k)) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 45, Math.PI * 0.1, Math.PI * 0.9);
            ctx.arc(cx, cy + 30, 35, Math.PI * 0.85, Math.PI * 0.15, true);
            ctx.stroke();
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
            ctx.beginPath(); ctx.arc(cx - 18, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + 18, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
        }
        // Oracle-bone crack patterns.
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.15)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 12; i++) {
            const sx = width * (0.1 + (i % 6) * 0.16);
            const sy = height * (0.55 + Math.floor(i / 6) * 0.25);
            ctx.beginPath(); ctx.moveTo(sx, sy);
            for (let j = 0; j < 5; j++) ctx.lineTo(sx + (Math.random() - 0.5) * 30, sy - j * 12);
            ctx.stroke();
        }
        // Ritual smoke rising.
        for (let i = 0; i < 18; i++) {
            const seed = i * 0.41;
            const x = width * (0.3 + (i % 3) * 0.2) + Math.sin(t * 0.6 + i) * 25;
            const y = height * 0.75 - ((seed * 311 + t * 0.04) % 1) * height * 0.5;
            const a = 0.04 + 0.04 * Math.sin(t * 0.8 + i);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.lineWidth = 10 + 6 * Math.sin(t * 0.5 + i);
            ctx.beginPath(); ctx.arc(x, y, 20 + 10 * Math.sin(t * 0.3 + i), 0, Math.PI * 1.3); ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
