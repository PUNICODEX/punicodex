// Pandora — the opened jar: shadow and hope motes swirling upward
(function() {
    'use strict';
    const canvas = document.getElementById('pandora-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function hexToRgb(hex){const n=parseInt(hex.replace('#',''),16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
    function readColor(attr, fb){const v=canvas.getAttribute(attr);return v&&v.startsWith('#')?hexToRgb(v):hexToRgb(fb);}
    const P = readColor('data-primary', '#D4AF37');
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

    const motes = [];
    for (let i = 0; i < 80; i++) {
        motes.push({
            a: Math.random() * Math.PI * 2, r: 20 + Math.random() * 160,
            spd: 0.3 + Math.random() * 0.8, hue: Math.random(), size: 1.5 + Math.random() * 2.5
        });
    }
    let t = 0;
    function draw() {
        t += 0.012;
        ctx.clearRect(0, 0, width, height);
        const lg = ctx.createLinearGradient(0, 0, 0, height);
        lg.addColorStop(0, 'rgba(16,14,22,0.98)');
        lg.addColorStop(1, 'rgba(26,22,32,0.96)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, width, height);
        const cx = width / 2, by = height * 0.68;
        // The pithos jar.
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.15)';
        ctx.beginPath();
        ctx.ellipse(cx, by, 60, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - 45, by - 70, 90, 70);
        ctx.beginPath(); ctx.ellipse(cx, by - 70, 45, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.beginPath(); ctx.arc(cx, by - 70, 38, 0, Math.PI * 2); ctx.fill();
        // Swirling contents — shadow and the last gleam of hope.
        motes.forEach((m, i) => {
            const angle = m.a + t * m.spd * 0.05;
            const r = m.r * (1 + 0.15 * Math.sin(t * 0.5 + i));
            const x = cx + Math.cos(angle) * r;
            const y = by - 70 - Math.sin(t * m.spd * 0.3 + i) * (m.r * 0.6) - (t * m.spd * 15) % (height * 0.6);
            const c = m.hue > 0.12 ? S : P;
            const a = 0.08 + 0.1 * Math.abs(Math.sin(t + i));
            ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
            ctx.beginPath(); ctx.arc(x, y, m.size, 0, Math.PI * 2); ctx.fill();
        });
        // Lid lifting off.
        const lidY = by - 95 - 20 * Math.abs(Math.sin(t * 0.3));
        ctx.strokeStyle = 'rgba(' + P.r + ',' + P.g + ',' + P.b + ',0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, lidY, 45, 10, 0, 0, Math.PI * 2); ctx.stroke();
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
