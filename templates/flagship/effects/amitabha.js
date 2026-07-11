// Amitābha — Lotus of Infinite Light
(function () {
    const canvas = document.getElementById('amitabha-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, cx, cy;
    let time = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function getColor(attr, fallback) {
        const hex = canvas.getAttribute(attr);
        if (hex && hex.length === 7 && hex[0] === '#') return hexToRgb(hex);
        return hexToRgb(fallback);
    }

    const P = getColor('data-primary', '#D35400');
    const S = getColor('data-secondary', '#F1C40F');

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const cssW = rect.width || window.innerWidth;
        const cssH = rect.height || window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        width = cssW;
        height = cssH;
        cx = width * 0.5;
        cy = height * 0.55;
    }
    resize();
    window.addEventListener('resize', resize);

    const motes = [];
    for (let i = 0; i < 60; i++) {
        motes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: 0.2 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
            size: Math.random() * 1.8 + 0.6,
            alpha: Math.random() * 0.5 + 0.2,
            color: Math.random() > 0.6 ? S : P
        });
    }

    function drawPetal(angle, radius, scale, color, alpha) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(radius * 0.35, -radius * 0.12, radius * scale, -radius * 0.35, 0, -radius * scale);
        ctx.bezierCurveTo(-radius * scale, -radius * 0.35, -radius * 0.35, -radius * 0.12, 0, 0);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.fill();
        ctx.restore();
    }

    function drawLotus() {
        const outerR = Math.min(width, height) * 0.18;
        const innerR = outerR * 0.6;
        const outerSpin = time * 0.004;
        const innerSpin = -time * 0.006;

        for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 / 12) * i + outerSpin;
            drawPetal(a, outerR, 1, P, 0.18);
        }
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i + innerSpin;
            drawPetal(a, innerR, 0.85, S, 0.22);
        }
    }

    function drawRays() {
        const count = 48;
        const maxLen = Math.min(width, height) * 0.48;
        for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i + time * 0.002;
            const breathe = 0.75 + 0.25 * Math.sin(time * 0.03 + i * 0.7);
            const len = maxLen * breathe;
            const alpha = 0.06 + 0.1 * Math.sin(time * 0.02 + i * 0.5);
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${Math.max(0, alpha)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            ctx.stroke();
        }
    }

    function drawHalo() {
        const haloR = 28 + 7 * Math.sin(time * 0.04);
        const glow = ctx.createRadialGradient(cx, cy, haloR * 0.4, cx, cy, haloR * 4);
        glow.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`);
        glow.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, haloR + 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawMotes() {
        motes.forEach(m => {
            m.y -= m.vy;
            m.x += Math.sin(time * 0.01 + m.phase) * 0.25;
            if (m.y < -10) {
                m.y = height + 10;
                m.x = Math.random() * width;
            }
            ctx.fillStyle = `rgba(${m.color.r}, ${m.color.g}, ${m.color.b}, ${m.alpha})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawRays();
        drawLotus();
        drawHalo();
        drawMotes();
        time += 1;
        if (!reduced) requestAnimationFrame(draw);
    }

    draw();
})();
