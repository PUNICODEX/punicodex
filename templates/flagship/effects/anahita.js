// Anāhitā — starwater river of wisdom
(function() {
    'use strict';
    const canvas = document.getElementById('anahita-starwater-canvas');
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

    const stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random(),
            y: Math.random() * 0.55,
            size: Math.random() * 1.4 + 0.3,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.005
        });
    }

    const waves = [];
    for (let i = 0; i < 5; i++) {
        waves.push({
            y: 0.58 + i * 0.09,
            amplitude: 4 + i * 2,
            length: 0.004 + i * 0.001,
            phase: Math.random() * Math.PI * 2,
            speed: 0.01 + i * 0.004
        });
    }

    const drops = [];
    function spawnDrop() {
        if (Math.random() > 0.03) return;
        drops.push({
            x: Math.random() * width,
            y: height * 0.55,
            vy: Math.random() * 1.5 + 0.5,
            size: Math.random() * 1.2 + 0.4,
            life: 1,
            decay: Math.random() * 0.01 + 0.005
        });
    }

    const meteors = [];
    function spawnMeteor() {
        if (Math.random() > 0.005) return;
        meteors.push({
            x: Math.random() * width * 0.8,
            y: Math.random() * height * 0.3,
            vx: -(Math.random() * 4 + 2),
            vy: Math.random() * 2 + 1,
            len: Math.random() * 60 + 30,
            life: 1
        });
    }

    let time = 0;
    function draw() {
        time += 1;

        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
        skyGrad.addColorStop(0, `rgb(${S.r * 0.08}, ${S.g * 0.08}, ${S.b * 0.2})`);
        skyGrad.addColorStop(1, `rgb(${S.r * 0.15}, ${S.g * 0.12}, ${S.b * 0.28})`);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        for (const s of stars) {
            s.twinkle += s.speed;
            const op = 0.4 + 0.6 * Math.sin(s.twinkle);
            const sx = s.x * width;
            const sy = s.y * height * 0.55;
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 0.9})`;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 0.15})`;
            ctx.beginPath();
            ctx.arc(sx, sy + height * 0.45 + (0.55 - s.y) * height * 0.9, s.size * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }

        const waterGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
        waterGrad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.25)`);
        waterGrad.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`);
        waterGrad.addColorStop(1, `rgba(${S.r * 0.5}, ${S.g * 0.5}, ${S.b * 0.7}, 0.08)`);
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, height * 0.55, width, height * 0.45);

        ctx.lineWidth = 1.5;
        for (const w of waves) {
            w.phase += w.speed;
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${0.12 + (w.y - 0.58) * 0.3})`;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 8) {
                const y = w.y * height + Math.sin(x * w.length + w.phase) * w.amplitude;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        spawnDrop();
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.y += d.vy;
            d.life -= d.decay;
            if (d.life <= 0) {
                drops.splice(i, 1);
                continue;
            }
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${d.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }

        spawnMeteor();
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.life -= 0.015;
            if (m.life <= 0) {
                meteors.splice(i, 1);
                continue;
            }
            const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 4, m.y - m.vy * 4);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${m.life})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * 4, m.y - m.vy * 4);
            ctx.stroke();
        }

        const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        if (!reduced) requestAnimationFrame(draw);
    }
    draw();
})();
