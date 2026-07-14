// Váli — ice shards, bowstring tension lines, aurora-like cold light, swift arrows
(function() {
    const canvas = document.getElementById('vali-hero-canvas');
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

    const P = readColor('data-primary', '#C0C0C0');   // ice silver
    const S = readColor('data-secondary', '#5C9BD1'); // aurora blue

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

    const shards = [];
    const SHARD_COUNT = width < 768 ? 18 : 32;
    for (let i = 0; i < SHARD_COUNT; i++) {
        shards.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 8 + Math.random() * 24,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.006,
            drift: 0.1 + Math.random() * 0.25,
            alpha: 0.15 + Math.random() * 0.25
        });
    }

    const aurora = [];
    const AURORA_COUNT = width < 768 ? 3 : 5;
    for (let i = 0; i < AURORA_COUNT; i++) {
        aurora.push({
            y: height * (0.1 + Math.random() * 0.4),
            amplitude: 20 + Math.random() * 40,
            frequency: 0.003 + Math.random() * 0.004,
            speed: 0.005 + Math.random() * 0.01,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.08 + Math.random() * 0.12
        });
    }

    const arrows = [];
    function spawnArrow() {
        if (prefersReduced || Math.random() > 0.015) return;
        arrows.push({
            x: -80,
            y: Math.random() * height * 0.6 + height * 0.1,
            vx: 8 + Math.random() * 6,
            vy: (Math.random() - 0.5) * 2,
            len: 60 + Math.random() * 40,
            life: 1
        });
    }

    const bowstrings = [];
    for (let i = 0; i < 3; i++) {
        bowstrings.push({
            cx: width * (0.2 + i * 0.3),
            cy: height * (0.3 + Math.random() * 0.4),
            r: Math.min(width, height) * 0.15,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Cold night gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(8, 16, 30, 0.95)`);
        bg.addColorStop(0.5, `rgba(${S.r * 0.15}, ${S.g * 0.25}, ${S.b * 0.35}, 0.8)`);
        bg.addColorStop(1, `rgba(4, 10, 18, 0.92)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Aurora curtains
        aurora.forEach(a => {
            const grad = ctx.createLinearGradient(0, a.y - 60, 0, a.y + 60);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, ${a.alpha})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 30) {
                const y = a.y + Math.sin(x * a.frequency + time * a.speed + a.phase) * a.amplitude;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.fill();
        });

        // Bowstring tension arcs
        bowstrings.forEach(b => {
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.18)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.cx, b.cy, b.r, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();
            // string
            const tension = Math.sin(time * 0.03 + b.phase) * 10;
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`;
            ctx.beginPath();
            ctx.moveTo(b.cx + Math.cos(-Math.PI * 0.4) * b.r, b.cy + Math.sin(-Math.PI * 0.4) * b.r);
            ctx.quadraticCurveTo(b.cx - b.r * 0.4 + tension, b.cy, b.cx + Math.cos(Math.PI * 0.4) * b.r, b.cy + Math.sin(Math.PI * 0.4) * b.r);
            ctx.stroke();
        });

        // Ice shards
        shards.forEach(s => {
            if (!prefersReduced) {
                s.y += s.drift;
                s.angle += s.spin;
                if (s.y > height + 40) { s.y = -40; s.x = Math.random() * width; }
            }
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.alpha})`;
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -s.size);
            ctx.lineTo(s.size * 0.5, 0);
            ctx.lineTo(0, s.size * 0.7);
            ctx.lineTo(-s.size * 0.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // Swift arrows
        spawnArrow();
        for (let i = arrows.length - 1; i >= 0; i--) {
            const a = arrows[i];
            a.x += a.vx;
            a.y += a.vy;
            if (a.x > width + 100) { arrows.splice(i, 1); continue; }
            const grad = ctx.createLinearGradient(a.x, a.y, a.x - a.len, a.y);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.95)`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.x - a.len, a.y);
            ctx.stroke();
            // arrowhead
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(a.x - 10, a.y - 4);
            ctx.lineTo(a.x - 10, a.y + 4);
            ctx.closePath();
            ctx.fill();
        }

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
