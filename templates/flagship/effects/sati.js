// Satī — sacred flames, lotus embers, saffron sparks, ascending fire
(function() {
    const canvas = document.getElementById('sati-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#FF9933');   // saffron
    const S = readColor('data-secondary', '#8B0000'); // deep red

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

    const flames = [];
    const FLAME_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < FLAME_COUNT; i++) {
        flames.push({
            x: width * (0.15 + (i / (FLAME_COUNT - 1)) * 0.7) + (Math.random() - 0.5) * width * 0.05,
            baseY: height * 0.82,
            height: height * (0.15 + Math.random() * 0.2),
            width: 30 + Math.random() * 40,
            phase: Math.random() * Math.PI * 2,
            speed: 0.03 + Math.random() * 0.04
        });
    }

    const sparks = [];
    const SPARK_COUNT = width < 600 ? 40 : 90;
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.8 - Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.8,
            size: 0.8 + Math.random() * 2.2,
            alpha: 0.25 + Math.random() * 0.45,
            color: Math.random() > 0.6 ? { r: 255, g: 200, b: 60 } : P,
            phase: Math.random() * Math.PI * 2
        });
    }

    const lotuses = [];
    const LOTUS_COUNT = width < 768 ? 4 : 7;
    for (let i = 0; i < LOTUS_COUNT; i++) {
        lotuses.push({
            x: Math.random() * width,
            y: height * 0.7 + Math.random() * height * 0.25,
            size: 10 + Math.random() * 16,
            alpha: 0.12 + Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawLotus(l, time) {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.globalAlpha = l.alpha * (0.7 + 0.3 * Math.sin(time * 0.02 + l.phase));
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 1)`;
        for (let i = 0; i < 8; i++) {
            const a = i * (Math.PI * 2 / 8);
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * l.size * 0.5, Math.sin(a) * l.size * 0.5, l.size * 0.4, l.size * 0.15, a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Sacred fire background
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`);
        bg.addColorStop(0.4, `rgba(${P.r * 0.6}, ${P.g * 0.3}, ${P.b * 0.1}, 0.22)`);
        bg.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0.28)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Flames
        flames.forEach(f => {
            const grad = ctx.createLinearGradient(f.x, f.baseY, f.x, f.baseY - f.height);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.55)`);
            grad.addColorStop(0.5, `rgba(255, 120, 40, 0.35)`);
            grad.addColorStop(1, 'rgba(255, 220, 100, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(f.x - f.width * 0.5, f.baseY);
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const x = f.x - f.width * 0.5 * (1 - t) + Math.sin(time * f.speed + f.phase + t * 6) * f.width * 0.2 * (1 - t);
                const y = f.baseY - f.height * Math.sin(t * Math.PI * 0.5);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(f.x + f.width * 0.5, f.baseY);
            ctx.closePath();
            ctx.fill();
        });

        // Lotus embers
        lotuses.forEach(l => drawLotus(l, time));

        // Ascending sparks
        sparks.forEach(s => {
            if (!prefersReduced) {
                s.y += s.vy;
                s.x += s.vx + Math.sin(time * 0.02 + s.phase) * 0.3;
                if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.05 + s.phase);
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.alpha * pulse})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0.4)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
