// Epimētheús — afterthought embers from the jar
(function() {
    'use strict';
    const canvas = document.getElementById('epimetheus-ember-canvas');
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
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#4169E1');

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const embers = [];
    for (let i = 0; i < 70; i++) {
        embers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2.5 + 0.5,
            vy: -(Math.random() * 0.8 + 0.2),
            drift: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.6 + 0.2,
            pulse: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.03 + 0.01
        });
    }

    const ashes = [];
    for (let i = 0; i < 40; i++) {
        ashes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5 + 0.3,
            vy: Math.random() * 0.3 + 0.05,
            drift: (Math.random() - 0.5) * 0.2,
            opacity: Math.random() * 0.25 + 0.05
        });
    }

    const bursts = [];
    function spawnBurst() {
        if (Math.random() > 0.008) return;
        const cx = Math.random() * width;
        const cy = height * 0.7 + Math.random() * height * 0.3;
        for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
            const v = Math.random() * 2 + 0.5;
            bursts.push({
                x: cx, y: cy,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v - 1,
                life: 1,
                decay: Math.random() * 0.015 + 0.008,
                size: Math.random() * 2 + 1
            });
        }
    }

    let time = 0;
    function draw() {
        time += 1;

        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgb(${S.r * 0.08}, ${S.g * 0.08}, ${S.b * 0.15})`);
        bg.addColorStop(1, `rgb(${S.r * 0.18}, ${S.g * 0.12}, ${S.b * 0.1})`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width * 0.5, height * 0.85, 0, width * 0.5, height * 0.85, Math.max(width, height) * 0.6);
        glow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.18)`);
        glow.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.05)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        for (const a of ashes) {
            a.y += a.vy;
            a.x += a.drift;
            if (a.y > height + 5) {
                a.y = -5;
                a.x = Math.random() * width;
            }
            ctx.fillStyle = `rgba(180, 180, 190, ${a.opacity})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
            ctx.fill();
        }

        for (const e of embers) {
            e.y += e.vy;
            e.x += e.drift + Math.sin(time * 0.01 + e.pulse) * 0.3;
            e.pulse += e.speed;
            const op = e.opacity * (0.6 + 0.4 * Math.sin(e.pulse));

            if (e.y < -10) {
                e.y = height + 10;
                e.x = Math.random() * width;
            }

            const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 5);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 0.5})`);
            grad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, ${200 + P.g * 0.2 | 0}, ${150 + P.b * 0.2 | 0}, ${op})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }

        spawnBurst();
        for (let i = bursts.length - 1; i >= 0; i--) {
            const b = bursts[i];
            b.x += b.vx;
            b.y += b.vy;
            b.vy += 0.03;
            b.life -= b.decay;
            if (b.life <= 0) {
                bursts.splice(i, 1);
                continue;
            }
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${b.life})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
        }

        const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
