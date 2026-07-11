// Manannán — Celtic sea mist, phantom coracle, and Otherworld light
(function() {
    const canvas = document.getElementById('manannan-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const primary = canvas.dataset.primary || '#0A4F4C';
    const secondary = canvas.dataset.secondary || '#C4D8DE';
    const P = hexToRgb(primary);
    const S = hexToRgb(secondary);

    let width, height, dpr = window.devicePixelRatio || 1;
    let raf;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width || window.innerWidth;
        height = rect.height || window.innerHeight;
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const waves = [];
    for (let i = 0; i < 5; i++) {
        waves.push({
            y: 0.55 + i * 0.12,
            amp: 12 + i * 9,
            freq: 0.004 + i * 0.0015,
            speed: 0.002 + i * 0.001,
            phase: i * 1.7,
            alpha: 0.08 + i * 0.04
        });
    }

    const mist = [];
    for (let i = 0; i < 40; i++) {
        mist.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0.1 + Math.random() * 0.3,
            vy: -0.05 - Math.random() * 0.1,
            size: 20 + Math.random() * 80,
            alpha: 0.05 + Math.random() * 0.15
        });
    }

    const sparks = [];
    for (let i = 0; i < 24; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 0.5 + Math.random() * 1.5,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    let boat = { x: -60 };
    let time = 0;

    function waveY(w, x) {
        return height * w.y + Math.sin(x * w.freq + w.phase + time * w.speed * 60) * w.amp;
    }

    function drawWave(w, blend) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
            const y = waveY(w, x);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = `rgba(${blend.r}, ${blend.g}, ${blend.b}, ${w.alpha})`;
        ctx.fill();
    }

    function drawBoat() {
        const y = waveY(waves[2], boat.x) - 6;
        ctx.save();
        ctx.translate(boat.x, y);
        ctx.rotate(Math.sin(time * 0.04) * 0.08);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.85)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.4)`;
        ctx.beginPath();
        ctx.moveTo(-12, -2);
        ctx.lineTo(0, -22);
        ctx.lineTo(12, -2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawMist() {
        for (const m of mist) {
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${m.alpha})`;
            ctx.fill();
        }
    }

    function drawSparks() {
        for (const s of sparks) {
            const a = 0.2 + Math.sin(time * 0.05 + s.twinkle) * 0.15;
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${Math.max(0, a)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPortal() {
        const cx = width * 0.75;
        const cy = height * 0.25;
        const r = 30 + Math.sin(time * 0.03) * 6;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
        grad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.25)`);
        grad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.22)`;
        ctx.fillRect(0, 0, width, height);

        drawPortal();

        waves.forEach((w, i) => {
            const t = i / Math.max(1, waves.length - 1);
            const blend = {
                r: Math.round(P.r + (S.r - P.r) * t),
                g: Math.round(P.g + (S.g - P.g) * t),
                b: Math.round(P.b + (S.b - P.b) * t)
            };
            drawWave(w, blend);
        });

        drawBoat();
        drawSparks();
        drawMist();

        if (!prefersReduced) {
            time++;
            boat.x += 0.25;
            if (boat.x > width + 60) boat.x = -60;

            for (const m of mist) {
                m.x += m.vx;
                m.y += m.vy;
                if (m.x - m.size > width) m.x = -m.size;
                if (m.y + m.size < 0) m.y = height + m.size;
            }
            raf = requestAnimationFrame(draw);
        }
    }

    draw();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(raf);
        } else if (!prefersReduced) {
            raf = requestAnimationFrame(draw);
        }
    });
})();
