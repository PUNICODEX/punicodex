// Mixcōātl — The Cloud Serpent (bespoke hero effect)
(function() {
    'use strict';
    const canvas = document.getElementById('cloudserpent-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#3E4A5C');
    const S = readColor('data-secondary', '#9AA5B5');

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
        t += 0.009;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(6,8,12,0.97)'; ctx.fillRect(0, 0, width, height);
        // Star road of the Milky Way.
        for (let i = 0; i < 70; i++) {
            const x = ((i * 149) % 100) / 100 * width;
            const y = height * 0.3 + (((i * 67) % 40) - 20) / 20 * height * 0.2;
            ctx.globalAlpha = 0.05 + ((i % 5) / 5) * 0.12;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',1)';
            ctx.fillRect(x, y, 1, 1);
        }
        // The serpent: a long sine curve gliding through the clouds.
        ctx.beginPath();
        const amp = height * 0.09;
        for (let x = -20; x <= width + 20; x += 8) {
            const y = height * 0.5 + Math.sin(x * 0.008 + t * 0.9) * amp * (0.6 + 0.4 * Math.sin(x * 0.002 + t * 0.3));
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.55)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        // Scale ticks along the body.
        for (let x = 20; x < width; x += 46) {
            const y = height * 0.5 + Math.sin(x * 0.008 + t * 0.9) * amp * (0.6 + 0.4 * Math.sin(x * 0.002 + t * 0.3));
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.atan(amp * 0.008 * Math.cos(x * 0.008 + t * 0.9)));
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.8)';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
            ctx.restore();
        }
        // Cloud wisps crossing the serpent.
        for (let i = 0; i < 7; i++) {
            const x = ((t * 12 + i * width / 7) % (width + 160)) - 80;
            const y = height * (0.32 + (i % 3) * 0.18);
            const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
            g.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.18)');
            g.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(x, y, 80, 26, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
