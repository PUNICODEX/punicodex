// Amərətāt — Immortal Green
(function() {
    'use strict';
    const canvas = document.getElementById('ameretat-hero-canvas');
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
    const P = readColor('data-primary', '#228B22');
    const S = readColor('data-secondary', '#F5F5F5');

    const vines = [];
    for (let i = 0; i < 9; i++) {
        vines.push({
            x: (i + 0.5) * (width / 9),
            nodes: [],
            phase: Math.random() * Math.PI * 2
        });
        for (let j = 0; j < 12; j++) {
            vines[i].nodes.push({
                t: j / 11,
                leaf: Math.random() > 0.4
            });
        }
    }
    const pollen = [];
    for (let i = 0; i < 50; i++) {
        pollen.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            vy: -Math.random() * 0.4 - 0.1,
            vx: (Math.random() - 0.5) * 0.3,
            a: Math.random() * 0.5 + 0.1
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

        vines.forEach(v => {
            ctx.strokeStyle = rgba(P.r, P.g, P.b, 0.35);
            ctx.lineWidth = 2;
            ctx.beginPath();
            v.nodes.forEach((n, idx) => {
                const y = height - n.t * height * 0.75;
                const sway = Math.sin(frame * 0.01 + v.phase + n.t * 3) * 20 * n.t;
                const x = v.x + sway;
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                if (n.leaf) {
                    const leafA = 0.5 + 0.3 * Math.sin(frame * 0.03 + idx);
                    ctx.fillStyle = rgba(P.r + 20, P.g + 30, P.b + 10, leafA);
                    ctx.beginPath();
                    ctx.ellipse(x, y, 7, 3, sway * 0.02, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.stroke();
        });

        pollen.forEach(p => {
            p.y += p.vy;
            p.x += p.vx + Math.sin(frame * 0.01 + p.y * 0.01) * 0.2;
            if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
            ctx.fillStyle = rgba(S.r, S.g, S.b, p.a);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
