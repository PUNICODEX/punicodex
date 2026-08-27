// Þrúðr — storm-strength, daughter of thunder
(function() {
    'use strict';
    const canvas = document.getElementById('thrudr-stormstrength-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function readColor(attr, fb) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fb);
    }
    const P = readColor('data-primary', '#C8B858');
    const S = readColor('data-secondary', '#4A5D7A');

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

    const shocks = [];
    const sparks = [];
    const clouds = [];
    for (let i = 0; i < 5; i++) {
        shocks.push({
            x: width * (0.2 + Math.random() * 0.6),
            y: height * (0.3 + Math.random() * 0.4),
            r: 20 + Math.random() * 40,
            phase: Math.random() * Math.PI * 2,
            speed: 0.03 + Math.random() * 0.03
        });
    }
    for (let i = 0; i < 6; i++) {
        clouds.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.35,
            r: 60 + Math.random() * 90,
            vx: (Math.random() - 0.5) * 0.3,
            alpha: 0.04 + Math.random() * 0.06
        });
    }

    let bolt = { active: false, life: 0, flash: 0, segs: [] };
    function triggerBolt() {
        bolt.active = true;
        bolt.life = 18 + Math.floor(Math.random() * 12);
        bolt.flash = 0.22;
        bolt.segs = [];
        let x = width * (0.3 + Math.random() * 0.4);
        let y = 0;
        while (y < height * 0.55) {
            const nx = x + (Math.random() - 0.5) * 70;
            const ny = y + 20 + Math.random() * 30;
            bolt.segs.push({ x1: x, y1: y, x2: nx, y2: ny });
            x = nx; y = ny;
        }
        for (let i = 0; i < 18; i++) {
            sparks.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                life: 30 + Math.random() * 25,
                max: 30 + Math.random() * 25,
                size: 1 + Math.random() * 2
            });
        }
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const t = frame * 0.02;

        // storm atmosphere
        const bg = ctx.createRadialGradient(width / 2, 0, 0, width / 2, height * 0.4, Math.max(width, height) * 0.6);
        bg.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`);
        bg.addColorStop(1, 'rgba(10, 12, 18, 0.92)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // drifting storm clouds
        clouds.forEach(c => {
            if (!reduced) { c.x += c.vx; if (c.x < -150) c.x = width + 150; if (c.x > width + 150) c.x = -150; }
            const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${c.alpha})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // concentric shock rings of strength
        shocks.forEach(s => {
            const pulse = 0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase);
            const alpha = 0.12 * pulse * (1 - Math.sin(t + s.phase) * 0.3);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (1 + 0.4 * Math.sin(t + s.phase)), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 0.6 * (1 + 0.3 * Math.cos(t * 1.3 + s.phase)), 0, Math.PI * 2);
            ctx.stroke();
        });

        // lightning bolt
        if (!reduced) {
            if (!bolt.active && Math.random() < 0.012) triggerBolt();
            if (bolt.active) {
                bolt.life--;
                bolt.flash -= 0.015;
                if (bolt.life <= 0) bolt.active = false;
            }
        }
        if (bolt.flash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, bolt.flash);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.15)`;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
        if (bolt.active) {
            ctx.save();
            ctx.strokeStyle = `rgba(245, 245, 255, ${0.6 + Math.random() * 0.4})`;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = `rgb(${P.r}, ${P.g}, ${P.b})`;
            bolt.segs.forEach(seg => {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            });
            ctx.restore();
        }

        // sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            const p = sparks[i];
            if (!reduced) { p.x += p.vx; p.y += p.vy; p.life--; }
            if (p.life <= 0) { sparks.splice(i, 1); continue; }
            const a = p.life / p.max;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = `rgb(${P.r}, ${P.g}, ${P.b})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgb(${P.r}, ${P.g}, ${P.b})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
