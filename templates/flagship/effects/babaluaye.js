// Ọbalúayé — Pulse of the Earth
(function() {
    'use strict';
    const canvas = document.getElementById('babaluaye-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }

    function rgba(r, g, b, a) {
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#4B0082');

    let pulses = [];
    for (let i = 0; i < 5; i++) {
        pulses.push({ r: i * 40, a: 0.3 - i * 0.05 });
    }
    const cracks = [];
    for (let i = 0; i < 7; i++) {
        cracks.push({
            x: Math.random() * width,
            y: height,
            len: Math.random() * height * 0.3 + height * 0.1,
            angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(20, 18, 25, 0.8));
        g.addColorStop(1, rgba(P.r * 0.3, P.g * 0.3, P.b * 0.2, 0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.55;

        // earth cracks with healing glow
        ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.25);
        ctx.lineWidth = 2;
        cracks.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(c.x + Math.cos(c.angle) * c.len, c.y + Math.sin(c.angle) * c.len);
            ctx.stroke();
        });

        pulses.forEach(p => {
            p.r += 1.2;
            p.a -= 0.003;
            if (p.a <= 0) { p.r = 0; p.a = 0.3; }
            ctx.strokeStyle = rgba(P.r, P.g, P.b, p.a);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // central heartbeat
        const beat = 1 + 0.15 * Math.max(0, Math.sin(frame * 0.08));
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 * beat);
        glow.addColorStop(0, rgba(P.r, P.g, P.b, 0.4));
        glow.addColorStop(1, rgba(P.r, P.g, P.b, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 50 * beat, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
