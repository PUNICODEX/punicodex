// Tlāloc — rain streaks, lightning, water ripples, blue-green storm
(function() {
    const canvas = document.getElementById('tlaloc-hero-canvas');
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

    const P = readColor('data-primary', '#50C878');   // jade water
    const S = readColor('data-secondary', '#2F2F2F'); // storm dark

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

    const rain = [];
    const RAIN_COUNT = width < 600 ? 80 : 160;
    for (let i = 0; i < RAIN_COUNT; i++) {
        rain.push({
            x: Math.random() * width,
            y: Math.random() * height,
            len: 10 + Math.random() * 25,
            vy: 8 + Math.random() * 10,
            alpha: 0.15 + Math.random() * 0.25
        });
    }

    const ripples = [];
    let nextRipple = 0;
    function spawnRipple() {
        if (prefersReduced) return;
        nextRipple--;
        if (nextRipple <= 0) {
            nextRipple = 10 + Math.floor(Math.random() * 20);
            ripples.push({
                x: Math.random() * width,
                y: height * 0.75 + Math.random() * height * 0.2,
                r: 0,
                alpha: 0.4
            });
        }
    }

    let bolts = [];
    function spawnBolt() {
        if (prefersReduced || Math.random() > 0.015) return;
        const x = Math.random() * width;
        const points = [{ x, y: 0 }];
        let cx = x, cy = 0;
        while (cy < height * 0.6) {
            cx += (Math.random() - 0.5) * 70;
            cy += 25 + Math.random() * 40;
            points.push({ x: cx, y: cy });
        }
        bolts.push({ points, life: 1 });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Storm gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(15, 25, 35, 0.95)`);
        bg.addColorStop(0.55, `rgba(${P.r * 0.15}, ${P.g * 0.25}, ${P.b * 0.25}, 0.82)`);
        bg.addColorStop(1, `rgba(${P.r * 0.08}, ${P.g * 0.18}, ${P.b * 0.15}, 0.88)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Rain streaks
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.45)`;
        ctx.lineWidth = 1;
        rain.forEach(r => {
            if (!prefersReduced) r.y += r.vy;
            if (r.y > height + r.len) { r.y = -r.len; r.x = Math.random() * width; }
            ctx.globalAlpha = r.alpha;
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - 2, r.y + r.len);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Water ripples
        spawnRipple();
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.5)`;
        ctx.lineWidth = 1.2;
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.r += 0.8;
            r.alpha -= 0.006;
            if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
            ctx.globalAlpha = r.alpha;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r * 1.4, r.r * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Lightning
        spawnBolt();
        for (let i = bolts.length - 1; i >= 0; i--) {
            const b = bolts[i];
            b.life -= 0.08;
            if (b.life <= 0) { bolts.splice(i, 1); continue; }
            ctx.save();
            ctx.globalAlpha = b.life;
            ctx.strokeStyle = 'rgba(230, 245, 255, 0.95)';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 14;
            ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.8)`;
            ctx.beginPath();
            b.points.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
            ctx.stroke();
            ctx.restore();
        }

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
