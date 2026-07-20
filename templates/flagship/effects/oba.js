// Ọba — The River That Endures (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('oba-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1F4A5C');
    const S = readColor('data-secondary', '#7FA8B8');

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
        t += 0.011;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(5,10,13,0.97)');
        lg.addColorStop(1, 'rgba(8,16,22,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Layered current bands flowing left — the river that never stops.
        for (let b = 0; b < 7; b++) {
            const yBase = height * (0.24 + b * 0.09);
            ctx.beginPath();
            for (let x = 0; x <= width; x += 9) {
                const y = yBase + Math.sin(x * 0.007 + t * (0.7 + b * 0.11) + b) * 9 * (1 + b * 0.14);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.09 + 0.03 * b + 0.03 * Math.sin(t + b)) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Slow standing wave at the center — the bend of endurance.
        const cx = width / 2, cy = height * 0.58;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, (i + 1) * width * 0.09, (i + 1) * 14, 0, Math.PI * 1.08, Math.PI * 1.92);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.25 + 0.07 * Math.sin(t * 0.9 + i)) + ')';
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }
        // Lily pads of the sacred water.
        for (let i = 0; i < 12; i++) {
            const x = ((i * 173) % 100) / 100 * width;
            const y = height * (0.3 + ((i * 47) % 55) / 100);
            ctx.globalAlpha = 0.1 + ((i % 4) / 4) * 0.12;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.ellipse(x, y, 7 + (i % 3) * 3, 3, 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
