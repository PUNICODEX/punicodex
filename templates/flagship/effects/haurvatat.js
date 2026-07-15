// Haurvatāt — Waters of Wholeness
(function() {
    'use strict';
    const canvas = document.getElementById('haurvatat-hero-canvas');
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
    const P = readColor('data-primary', '#FF4500');
    const S = readColor('data-secondary', '#F5F5F5');

    const ripples = [];
    for (let i = 0; i < 6; i++) {
        ripples.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 50 + 20,
            speed: Math.random() * 0.3 + 0.2,
            alpha: Math.random() * 0.3 + 0.1
        });
    }
    const drops = [];
    for (let i = 0; i < 30; i++) {
        drops.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 1,
            vy: Math.random() * 0.8 + 0.2,
            a: Math.random() * 0.5 + 0.2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(P.r, P.g, P.b, 0.08));
        g.addColorStop(1, rgba(P.r, P.g, P.b, 0.22));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        ripples.forEach(r => {
            r.r += r.speed;
            r.alpha -= 0.002;
            if (r.alpha <= 0) {
                r.r = Math.random() * 30 + 20;
                r.alpha = Math.random() * 0.3 + 0.2;
                r.x = Math.random() * width;
                r.y = Math.random() * height;
            }
            ctx.strokeStyle = rgba(S.r, S.g, S.b, r.alpha);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.stroke();
        });

        drops.forEach(d => {
            d.y += d.vy;
            if (d.y > height + 10) { d.y = -10; d.x = Math.random() * width; }
            ctx.fillStyle = rgba(S.r, S.g, S.b, d.a);
            ctx.shadowBlur = 6;
            ctx.shadowColor = rgba(S.r, S.g, S.b, 0.3);
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
