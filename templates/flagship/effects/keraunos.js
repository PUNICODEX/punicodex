// Keraunos — Zeus' thunderbolt: branching lightning and ionised afterglow
(function() {
    'use strict';
    const canvas = document.getElementById('keraunos-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#F0E68C');
    const S = readColor('data-secondary', '#4169E1');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize(); window.addEventListener('resize', resize);

    let bolts = [];
    for (let i = 0; i < 4; i++) bolts.push({x: Math.random(), age: i * 20});
    let t = 0;
    function draw() {
        t += 0.015;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(8,10,18,0.98)'; ctx.fillRect(0, 0, width, height);
        // Storm underglow.
        const g = ctx.createRadialGradient(width / 2, height * 0.2, 0, width / 2, height * 0.3, width * 0.7);
        g.addColorStop(0, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.12)');
        g.addColorStop(1, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
        // Branching lightning.
        bolts.forEach(b => {
            b.age++;
            if (b.age > 45) { b.age = 0; b.x = Math.random(); }
            const flash = b.age < 6 ? 1 - b.age / 6 : 0;
            if (flash > 0) {
                ctx.strokeStyle = 'rgba(255,255,255,' + flash + ')';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',1)';
                ctx.shadowBlur = 24;
                let x = width * (0.2 + b.x * 0.6), y = 0;
                ctx.beginPath(); ctx.moveTo(x, y);
                while (y < height * 0.75) {
                    x += (Math.random() - 0.5) * 70; y += 25 + Math.random() * 30;
                    ctx.lineTo(x, y);
                }
                ctx.stroke(); ctx.shadowBlur = 0;
            }
            // Ion shimmer after each strike.
            const ion = Math.max(0, 1 - b.age / 40);
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + (ion * 0.08) + ')';
            ctx.beginPath(); ctx.arc(width * (0.2 + b.x * 0.6), height * 0.35, 80 + b.age * 3, 0, Math.PI * 2); ctx.fill();
        });
        // Charged particles drifting upward.
        for (let i = 0; i < 30; i++) {
            const seed = i * 0.37;
            const x = ((seed * 947 + t * (0.5 + (i % 4) * 0.2)) % 1) * width;
            const y = height * 0.9 - ((seed * 631 + t * 0.08) % 1) * height;
            const a = 0.05 + 0.1 * Math.abs(Math.sin(t * 2 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
