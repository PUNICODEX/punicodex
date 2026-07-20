// Ọrun — The Celestial Vault (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('vault-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E3A5F');
    const S = readColor('data-secondary', '#C9A227');

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
        t += 0.005;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(4,7,14,0.98)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, apex = height * 0.12, base = height * 1.05;
        // Vault ribs arcing from the apex — heaven's architecture.
        const RIBS = 9;
        for (let i = 0; i < RIBS; i++) {
            const spread = (i / (RIBS - 1) - 0.5) * width * 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, apex);
            ctx.quadraticCurveTo(cx + spread * 0.6, height * 0.55, cx + spread, base);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.18 + 0.06 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Horizontal courses of the vault.
        for (let j = 0; j < 6; j++) {
            const y = apex + (j + 1) * (height * 0.13);
            const w = (j + 1) * width * 0.16;
            ctx.beginPath();
            ctx.moveTo(cx - w, y);
            ctx.quadraticCurveTo(cx, y - height * 0.05, cx + w, y);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.12 + 0.04 * Math.sin(t + j * 2)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Stars fixed in the vault — destiny's addresses.
        for (let i = 0; i < 60; i++) {
            const x = ((i * 211) % 97) / 97 * width;
            const y = apex + ((i * 89) % 83) / 83 * height * 0.7;
            const tw = 0.1 + 0.15 * (1 + Math.sin(t * 2 + i)) / 2;
            ctx.globalAlpha = tw;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        // The keystone.
        const kg = ctx.createRadialGradient(cx, apex, 0, cx, apex, 40);
        kg.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.5)');
        kg.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(cx, apex, 40, 0, Math.PI * 2); ctx.fill();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
