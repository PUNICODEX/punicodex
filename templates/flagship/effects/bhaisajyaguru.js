// Bhaisajyaguru — healing lapis light; medicine-bowl nectar drips; aurora balsam currents
(function() {
    'use strict';
    const canvas = document.getElementById('bhaisajyaguru-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#1E6091');
    const S = readColor('data-secondary', '#F5F5F5');

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
        t += 0.007;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(6,10,16,0.98)');
        lg.addColorStop(1, 'rgba(10,18,28,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, cy = height * 0.4;
        // Lapis-lazuli healing light radiating.
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.5);
        glow.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.28)');
        glow.addColorStop(0.4, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.08)');
        glow.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        // Medicine bowl.
        ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.12)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 80, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy + 80, 70, 22, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 75, 55, 14, 0, 0, Math.PI * 2); ctx.fill();
        // Nectar drips from the bowl.
        for (let i = 0; i < 5; i++) {
            const dx = cx - 40 + i * 20;
            const dy = cy + 85 + ((t * 30 + i * 50) % (height * 0.35));
            const a = 0.4 - (dy - cy - 85) / (height * 0.35) * 0.4;
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + Math.max(0, a) + ')';
            ctx.beginPath(); ctx.ellipse(dx, dy, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        // Aurora balsam currents drifting down.
        for (let i = 0; i < 5; i++) {
            const y = height * (0.2 + i * 0.16);
            const grad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
            grad.addColorStop(0, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
            grad.addColorStop(0.5, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',' + (0.04 + 0.03 * Math.sin(t + i)) + ')');
            grad.addColorStop(1, 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= width; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.008 + t * (0.5 + i * 0.15) + i) * 30);
            ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
        }
        // Sparkling healing motes.
        for (let i = 0; i < 36; i++) {
            const seed = i * 0.31;
            const x = ((seed * 937 + t * (0.03 + (i % 5) * 0.01)) % 1) * width;
            const y = ((seed * 661 + t * 0.02) % 1) * height;
            const a = 0.1 + 0.15 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + S.r + ',' + S.g + ',' + S.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 2), 0, Math.PI * 2); ctx.fill();
        }
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
