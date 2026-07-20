// Kārttikeya — The Spear and the Six (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('spear-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8B1E1E');
    const S = readColor('data-secondary', '#C9A227');
    const GLYPHS = 'ॐ';

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
        ctx.fillStyle = 'rgba(9,5,5,0.97)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.5, R = Math.min(width, height) * 0.34;
        // The six-pointed star of Ṣaṇmukha (the six-faced).
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.35)';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 2; k++) {
            ctx.beginPath();
            for (let i = 0; i <= 3; i++) {
                const a = (i / 3) * Math.PI * 2 + k * Math.PI / 3 - Math.PI / 2 + t * 0.04;
                const x = cx + Math.cos(a) * R;
                const y = cy + Math.sin(a) * R;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        // Ring of the six.
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.5)';
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.stroke();
        // The vel (spear): vertical, tip catching light.
        const grad = ctx.createLinearGradient(cx, cy - R * 1.3, cx, cy + R * 1.3);
        grad.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.9)');
        grad.addColorStop(0.5, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.4)');
        grad.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.3)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.3); ctx.lineTo(cx, cy + R * 1.3); ctx.stroke();
        // Spear blade.
        ctx.beginPath();
        ctx.moveTo(cx, cy - R * 1.44);
        ctx.lineTo(cx - R * 0.07, cy - R * 1.22);
        ctx.lineTo(cx + R * 0.07, cy - R * 1.22);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.5 + 0.2 * Math.sin(t * 1.1)) + ')';
        ctx.fill();
        // Om at the heart.
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(R * 0.3) + 'px serif';
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 0.7);
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
        ctx.fillText(GLYPHS, cx, cy);
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
