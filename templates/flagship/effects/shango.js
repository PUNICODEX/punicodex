// Ṣàngó — Thunder and Storm
(function() {
    'use strict';
    const canvas = document.getElementById('shango-hero-canvas');
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

    let bolts = [];
    let flash = 0;
    let lastFlash = 0;

    function addBolt() {
        const x = Math.random() * width;
        const segs = [];
        let cx = x;
        let cy = -10;
        while (cy < height * 0.6) {
            segs.push({ x: cx, y: cy });
            cx += (Math.random() - 0.5) * 60;
            cy += Math.random() * 30 + 15;
        }
        segs.push({ x: cx, y: height * 0.6 + Math.random() * height * 0.3 });
        bolts.push({ segs: segs, life: 12, max: 12 });
    }

    const rain = [];
    for (let i = 0; i < 80; i++) {
        rain.push({
            x: Math.random() * width,
            y: Math.random() * height,
            len: Math.random() * 15 + 8,
            vy: Math.random() * 8 + 6
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, rgba(15, 15, 25, 0.85));
        g.addColorStop(1, rgba(S.r * 0.5, S.g * 0.5, S.b * 0.5, 0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        if (flash > 0) {
            ctx.fillStyle = rgba(P.r, P.g, P.b, flash);
            ctx.fillRect(0, 0, width, height);
            flash *= 0.85;
            if (flash < 0.005) flash = 0;
        }

        if (Math.random() < 0.02 && frame - lastFlash > 30) {
            addBolt();
            flash = 0.2;
            lastFlash = frame;
        }

        bolts = bolts.filter(b => {
            b.life--;
            const a = b.life / b.max;
            ctx.strokeStyle = rgba(255, 250, 220, a);
            ctx.lineWidth = 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = rgba(P.r, P.g, P.b, 0.8);
            ctx.beginPath();
            b.segs.forEach((s, idx) => {
                if (idx === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
            return b.life > 0;
        });

        ctx.strokeStyle = rgba(150, 160, 180, 0.15);
        ctx.lineWidth = 1;
        rain.forEach(r => {
            r.y += r.vy;
            if (r.y > height) { r.y = -r.len; r.x = Math.random() * width; }
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x, r.y + r.len);
            ctx.stroke();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
