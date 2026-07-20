// Xiuhtēcuhtli — The Ember Pyramid (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('ember-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#8B3A1E');
    const S = readColor('data-secondary', '#C98A27');

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
    for (let i = 0; i < 60; i++) embers.push({
        x: Math.random(), y: Math.random(),
        v: 0.0006 + Math.random() * 0.0016,
        g: Math.random(),
        drift: (Math.random() - 0.5) * 0.0004,
    });
    let t = 0;
    function draw() {
        t += 0.014;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(10,5,4,0.97)'; ctx.fillRect(0, 0, width, height);
        // The fire-triangle — the hearth as geometry.
        const cx = width / 2, apex = height * 0.22, base = height * 0.8;
        const pulse = 0.06 * Math.sin(t * 1.2);
        for (let i = 0; i < 3; i++) {
            const grow = i * 0.09 + pulse * (i + 1) * 0.3;
            const y1 = apex - grow * height * 0.5, y2 = base + grow * height * 0.3;
            const hw = (y2 - y1) * 0.62;
            ctx.beginPath();
            ctx.moveTo(cx, y1);
            ctx.lineTo(cx - hw, y2);
            ctx.lineTo(cx + hw, y2);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (0.3 - i * 0.07) + ')';
            ctx.lineWidth = i === 0 ? 1.6 : 1;
            ctx.stroke();
        }
        // The hearth-fire's inner glow.
        const hg = ctx.createRadialGradient(cx, height * 0.62, 0, cx, height * 0.62, height * 0.3);
        hg.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.22 + 0.06 * Math.sin(t * 1.5)) + ')');
        hg.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(cx, height * 0.62, height * 0.3, 0, Math.PI * 2); ctx.fill();
        // Embers rising along the triangle's breath.
        for (const e of embers) {
            e.y -= e.v; e.x += e.drift;
            if (e.y < -0.05) { e.y = 1.05; e.x = 0.35 + Math.random() * 0.3; }
            const x = e.x * width + Math.sin(t * 2 + e.g * 6.28) * 8;
            const y = e.y * height;
            ctx.globalAlpha = 0.12 + e.g * 0.4;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.beginPath(); ctx.arc(x, y, 0.7 + e.g * 1.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
