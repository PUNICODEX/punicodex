// Jord — deep roots and bedrock strata pulse with aurora-like earth currents
(function() {
    'use strict';
    const canvas = document.getElementById('jord-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C0C0C0');
    const S = readColor('data-secondary', '#5C9BD1');

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
        lg.addColorStop(0, 'rgba(8,10,12,0.98)');
        lg.addColorStop(1, 'rgba(14,20,18,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Bedrock strata.
        for (let i = 0; i < 8; i++) {
            const y = height * (0.35 + i * 0.09);
            ctx.fillStyle = 'rgba(20,18,16,' + (0.3 + 0.1 * Math.sin(t * 0.4 + i)) + ')';
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += 50) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 15);
            ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
        }
        // Deep roots descending.
        ctx.strokeStyle = 'rgba(30,26,22,0.7)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 9; i++) {
            const x = width * (0.1 + i * 0.1);
            ctx.beginPath(); ctx.moveTo(x, 0);
            for (let y = 0; y <= height; y += 30) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 30, y);
            ctx.stroke();
        }
        // Aurora-like earth currents pulsing through stone.
        for (let i = 0; i < 5; i++) {
            const y = height * (0.45 + i * 0.11);
            const grad = ctx.createLinearGradient(0, y - 20, 0, y + 20);
            const a = 0.05 + 0.05 * Math.sin(t + i);
            grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')');
            grad.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.008 + t * (0.8 + i * 0.2) + i) * 25);
            ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
        }
        // Silver veins of mineral.
        for (let i = 0; i < 20; i++) {
            const seed = i * 0.43;
            const x = ((seed * 967 + t * 0.01) % 1) * width;
            const y = ((seed * 523 + t * 0.008) % 1) * height;
            const a = 0.05 + 0.12 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
