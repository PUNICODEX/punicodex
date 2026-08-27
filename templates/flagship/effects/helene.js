// Helene — torchlit beauty: warm flame, distant sea sparkles, palace silhouette
(function() {
    'use strict';
    const canvas = document.getElementById('helene-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#F4C430');
    const S = readColor('data-secondary', '#4A5D82');

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
        // Twilight over sea and Sparta.
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(18,16,28,0.98)');
        lg.addColorStop(0.45, 'rgba(40,34,58,0.96)');
        lg.addColorStop(0.46, 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.25)');
        lg.addColorStop(1, 'rgba(10,12,22,0.98)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        // Distant palace silhouette.
        ctx.fillStyle = 'rgba(8,8,14,0.85)';
        ctx.beginPath(); ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 40) {
            const h = height * 0.18 + Math.sin(x * 0.01) * 12 + ((x / 40) % 3 === 0 ? 35 : 0);
            ctx.lineTo(x, height - h);
        }
        ctx.lineTo(width, height); ctx.fill();
        // Torch flame in the foreground.
        const tx = width * 0.75, ty = height * 0.62;
        const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 140);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)');
        glow.addColorStop(0.6, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(tx, ty, 140, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i++) {
            const lean = 12 * Math.sin(t * 2 + i);
            const h = 50 + i * 18 + 10 * Math.sin(t * 3 + i);
            ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.25 - i * 0.04) + ')';
            ctx.lineWidth = 6 - i;
            ctx.beginPath(); ctx.moveTo(tx, ty + 30);
            ctx.quadraticCurveTo(tx + lean, ty - h * 0.5, tx + lean * 0.6, ty - h); ctx.stroke();
        }
        // Sea sparkles on the horizon.
        for (let i = 0; i < 40; i++) {
            const x = ((i * 137.5 + t * (0.3 + (i % 5) * 0.1)) % 1) * width;
            const y = height * 0.47 + Math.sin(t + i) * 3;
            const a = 0.05 + 0.12 * Math.abs(Math.sin(t * 1.5 + i));
            ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
