// Metztli — obsidian moon, rabbit in silver, night mist
(function() {
    'use strict';

    const canvas = document.getElementById('metztli-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        canvas.style.display = 'none';
        return;
    }

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const SILVER = hexToRgb('#C0C0C0');
    const MOON = hexToRgb('#F0F0F0');
    const JADE = hexToRgb('#98FB98');
    const OBSIDIAN = hexToRgb('#1F1F28');
    const NIGHT = hexToRgb('#191970');

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    const STAR_COUNT = 90;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.7,
            size: Math.random() * 1.2 + 0.3,
            alpha: Math.random() * 0.5 + 0.2,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const mist = [];
    const MIST_COUNT = 20;
    for (let i = 0; i < MIST_COUNT; i++) {
        mist.push({
            x: Math.random() * width,
            y: height - Math.random() * height * 0.35,
            radius: Math.random() * 90 + 50,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.1,
            alpha: Math.random() * 0.08 + 0.02,
            phase: Math.random() * Math.PI * 2
        });
    }

    const meteors = [];
    function spawnMeteor() {
        if (Math.random() > 0.015) return;
        meteors.push({
            x: Math.random() * width * 0.5,
            y: Math.random() * height * 0.3,
            vx: Math.random() * 3 + 2,
            vy: Math.random() * 2 + 1,
            length: Math.random() * 60 + 30,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }

    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgba(${OBSIDIAN.r}, ${OBSIDIAN.g}, ${OBSIDIAN.b}, 1)`);
        grad.addColorStop(0.6, `rgba(${NIGHT.r}, ${NIGHT.g}, ${NIGHT.b}, 0.6)`);
        grad.addColorStop(1, `rgba(${OBSIDIAN.r}, ${OBSIDIAN.g}, ${OBSIDIAN.b}, 0.3)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function drawMoon() {
        const cx = width * 0.72;
        const cy = height * 0.22;
        const radius = Math.min(width, height) * 0.09;
        const phaseShift = Math.sin(frame * 0.003) * 0.12 + 0.18;

        // moon glow
        const glow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 3);
        glow.addColorStop(0, `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, 0.12)`);
        glow.addColorStop(0.5, `rgba(${JADE.r}, ${JADE.g}, ${JADE.b}, 0.04)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - radius * 3, cy - radius * 3, radius * 6, radius * 6);

        // crescent body
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
        ctx.bezierCurveTo(
            cx + radius * phaseShift, cy + radius,
            cx + radius * phaseShift, cy - radius,
            cx, cy - radius
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, 0.92)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, 0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // rabbit silhouette
        ctx.fillStyle = `rgba(${OBSIDIAN.r}, ${OBSIDIAN.g}, ${OBSIDIAN.b}, 0.18)`;
        ctx.beginPath();
        ctx.ellipse(cx - radius * 0.15, cy + radius * 0.1, radius * 0.35, radius * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        // ears
        ctx.beginPath();
        ctx.ellipse(cx - radius * 0.05, cy - radius * 0.15, radius * 0.08, radius * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + radius * 0.08, cy - radius * 0.12, radius * 0.06, radius * 0.18, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStars() {
        for (const s of stars) {
            const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.03 + s.twinkle);
            ctx.fillStyle = `rgba(${SILVER.r}, ${SILVER.g}, ${SILVER.b}, ${s.alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMist() {
        for (const m of mist) {
            m.x += m.vx;
            m.y += m.vy;
            m.phase += 0.005;
            const alpha = m.alpha * (0.6 + 0.4 * Math.sin(m.phase));

            if (m.x < -150) m.x = width + 150;
            if (m.x > width + 150) m.x = -150;

            const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.radius);
            grad.addColorStop(0, `rgba(${JADE.r}, ${JADE.g}, ${JADE.b}, ${alpha})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMeteors() {
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.alpha -= m.decay;

            if (m.alpha <= 0 || m.x > width + 50 || m.y > height + 50) {
                meteors.splice(i, 1);
                continue;
            }

            const tailX = m.x - m.vx * (m.length / Math.sqrt(m.vx * m.vx + m.vy * m.vy));
            const tailY = m.y - m.vy * (m.length / Math.sqrt(m.vx * m.vx + m.vy * m.vy));

            const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
            grad.addColorStop(0, `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, ${m.alpha})`);
            grad.addColorStop(1, `rgba(${MOON.r}, ${MOON.g}, ${MOON.b}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;

        drawBackground();
        drawStars();
        drawMoon();
        drawMist();
        drawMeteors();
        spawnMeteor();

        requestAnimationFrame(draw);
    }
    draw();
})();
