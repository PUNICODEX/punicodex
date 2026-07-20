// Ašavahišta — The Altar of the Fire (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('firealtar-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#C4622E');
    const S = readColor('data-secondary', '#D4AF37');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    const embers = [];
    for (let i = 0; i < 45; i++) embers.push({ x: 0.4 + Math.random() * 0.2, y: Math.random(), v: 0.0005 + Math.random() * 0.0012, g: Math.random() });
    let t = 0;
    function draw() {
        t += 0.013;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(10,5,4,0.97)'; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, base = height * 0.82;
        // The altar: a stepped fire-throne in clean geometry.
        for (let i = 0; i < 4; i++) {
            const w = width * (0.1 + i * 0.05), y = base - i * height * 0.05;
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 + 0.05 * Math.sin(t + i)) + ')';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(cx - w, y, w * 2, height * 0.045);
        }
        // The sacred flame: nested flame-contours breathing.
        for (let f = 0; f < 4; f++) {
            const h = height * (0.1 + f * 0.055), w = h * (0.42 + 0.04 * Math.sin(t * 1.4 + f));
            const fy = base - 4 * height * 0.05 - f * h * 0.22;
            ctx.beginPath();
            ctx.moveTo(cx, fy - h);
            ctx.quadraticCurveTo(cx - w, fy - h * 0.35, cx - w * 0.55, fy);
            ctx.quadraticCurveTo(cx, fy + h * 0.18, cx + w * 0.55, fy);
            ctx.quadraticCurveTo(cx + w, fy - h * 0.35, cx, fy - h);
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.4 - f * 0.07) + ')';
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }
        // Inner glow of the fire.
        const hg = ctx.createRadialGradient(cx, base - height * 0.22, 0, cx, base - height * 0.22, height * 0.28);
        hg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.3 + 0.08 * Math.sin(t * 1.3)) + ')');
        hg.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(cx, base - height * 0.22, height * 0.28, 0, Math.PI * 2); ctx.fill();
        // Embers rising from the altar.
        for (const e of embers) {
            e.y -= e.v; if (e.y < -0.05) { e.y = 0.8; e.x = 0.42 + Math.random() * 0.16; }
            const x = e.x * width + Math.sin(t * 2 + e.g * 6.28) * 10;
            const y = e.y * height;
            ctx.globalAlpha = 0.12 + e.g * 0.35;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 0.7 + e.g * 1.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
