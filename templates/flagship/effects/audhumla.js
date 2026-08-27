// Auðhumla — aurora milk of creation
(function() {
    'use strict';
    const canvas = document.getElementById('audhumla-aurora-canvas');
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

    const curtains = [];
    for (let i = 0; i < 4; i++) {
        curtains.push({
            x: Math.random() * width,
            width: Math.random() * 120 + 80,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.003 + 0.001,
            hueShift: Math.random() * 40 - 20,
            opacity: Math.random() * 0.15 + 0.08
        });
    }

    const flakes = [];
    for (let i = 0; i < 60; i++) {
        flakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            vy: Math.random() * 0.5 + 0.1,
            drift: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.2
        });
    }

    const milkStreams = [];
    for (let i = 0; i < 3; i++) {
        milkStreams.push({
            x: width * (0.2 + i * 0.3),
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.01 + 0.005,
            width: Math.random() * 30 + 20
        });
    }

    const sparks = [];
    function spawnSpark() {
        if (Math.random() > 0.04) return;
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: Math.random() * 0.5 + 0.2,
            life: 1,
            decay: Math.random() * 0.01 + 0.005,
            size: Math.random() * 1.5 + 0.5
        });
    }

    let time = 0;
    function draw() {
        time += 1;

        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgb(${S.r * 0.06}, ${S.g * 0.08}, ${S.b * 0.18})`);
        bg.addColorStop(0.5, `rgb(${S.r * 0.1}, ${S.g * 0.14}, ${S.b * 0.22})`);
        bg.addColorStop(1, `rgb(${S.r * 0.15}, ${S.g * 0.18}, ${S.b * 0.25})`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        for (const c of curtains) {
            c.phase += c.speed;
            const grad = ctx.createLinearGradient(c.x, 0, c.x + c.width, height);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, `rgba(${S.r + c.hueShift}, ${S.g}, ${Math.min(255, S.b + 40)}, ${c.opacity})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(c.x, 0);
            for (let y = 0; y <= height; y += 20) {
                const wave = Math.sin(y * 0.01 + c.phase) * 30 + Math.sin(y * 0.02 + c.phase * 2) * 15;
                ctx.lineTo(c.x + c.width * 0.5 + wave, y);
            }
            ctx.lineTo(c.x + c.width, 0);
            ctx.closePath();
            ctx.fill();
        }

        for (const m of milkStreams) {
            m.phase += m.speed;
            const grad = ctx.createLinearGradient(m.x - m.width, 0, m.x + m.width, height);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(m.x - m.width * 0.5, 0);
            for (let y = 0; y <= height; y += 15) {
                const curve = Math.sin(y * 0.008 + m.phase) * (m.width * 0.4);
                ctx.lineTo(m.x + curve, y);
            }
            ctx.lineTo(m.x + m.width * 0.5, 0);
            ctx.closePath();
            ctx.fill();
        }

        for (const f of flakes) {
            f.y += f.vy;
            f.x += f.drift + Math.sin(time * 0.005 + f.y * 0.01) * 0.2;
            if (f.y > height + 5) {
                f.y = -5;
                f.x = Math.random() * width;
            }
            ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
        }

        spawnSpark();
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= s.decay;
            if (s.life <= 0) {
                sparks.splice(i, 1);
                continue;
            }
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }

        const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
