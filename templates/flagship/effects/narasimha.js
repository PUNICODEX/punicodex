// Narasimha — lion-claw slashes; mane flames; a pillar of light bursts
(function() {
    'use strict';
    const canvas = document.getElementById('narasimha-hero-canvas');
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
        t += 0.014;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(10,8,12,0.98)');
        lg.addColorStop(1, 'rgba(28,10,8,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.45;
        // Pillar of light bursting from the broken column.
        const pulse = 0.7 + 0.3 * Math.sin(t * 2);
        const grad = ctx.createLinearGradient(cx, cy, cx, 0);
        grad.addColorStop(0, 'rgba(255,255,255,' + (pulse * 0.4) + ')');
        grad.addColorStop(0.4, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (pulse * 0.25) + ')');
        grad.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = grad; ctx.fillRect(cx - 40, 0, 80, cy);
        // Lion silhouette with flaming mane.
        ctx.fillStyle = 'rgba(8,6,8,0.75)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 60, 70, 90, 0, Math.PI, 0);
        ctx.lineTo(cx + 50, cy + 120); ctx.lineTo(cx - 50, cy + 120); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 55, cy - 10); ctx.lineTo(cx - 85, cy - 70); ctx.lineTo(cx - 30, cy - 35); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 55, cy - 10); ctx.lineTo(cx + 85, cy - 70); ctx.lineTo(cx + 30, cy - 35); ctx.fill();
        // Mane flames.
        for (let i = 0; i < 18; i++) {
            const ang = Math.PI + i * (Math.PI / 17);
            const r = 75 + 20 * Math.sin(t * 3 + i);
            const x = cx + Math.cos(ang) * r;
            const y = cy + 60 + Math.sin(ang) * r * 0.5;
            const a = 0.2 + 0.25 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 6 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
        }
        // Claw slashes.
        for (let k = 0; k < 3; k++) {
            const sx = width * (0.2 + k * 0.3) + Math.sin(t * 0.5 + k) * 20;
            const flash = 0.5 + 0.5 * Math.sin(t * 2 + k);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (flash * 0.6) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const x = sx + i * 10; ctx.moveTo(x, height * 0.35);
                ctx.quadraticCurveTo(x + 8, height * 0.55, x + 18, height * 0.75);
            }
            ctx.stroke();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
