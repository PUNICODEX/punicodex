// Jizō — floating red lanterns, gentle falling cherry petals, soft golden glow, peaceful
(function() {
    const canvas = document.getElementById('jizo-hero-canvas');
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

    const P = readColor('data-primary', '#DC143C');   // lantern red
    const S = readColor('data-secondary', '#1A1A1A'); // stone dark

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

    const lanterns = [];
    const LANTERN_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < LANTERN_COUNT; i++) {
        lanterns.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 18 + Math.random() * 22,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.003 + Math.random() * 0.004,
            drift: 0.05 + Math.random() * 0.1,
            alpha: 0.55 + Math.random() * 0.25
        });
    }

    const petals = [];
    const PETAL_COUNT = width < 600 ? 30 : 60;
    for (let i = 0; i < PETAL_COUNT; i++) {
        petals.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 4 + Math.random() * 7,
            vy: 0.3 + Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 0.8,
            spin: (Math.random() - 0.5) * 0.05,
            angle: Math.random() * Math.PI * 2,
            alpha: 0.25 + Math.random() * 0.35,
            color: Math.random() > 0.8 ? { r: 255, g: 180, b: 190 } : { r: 255, g: 220, b: 225 }
        });
    }

    const glows = [];
    const GLOW_COUNT = width < 600 ? 8 : 16;
    for (let i = 0; i < GLOW_COUNT; i++) {
        glows.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 20 + Math.random() * 50,
            alpha: 0.05 + Math.random() * 0.08,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawLantern(l, time) {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.globalAlpha = l.alpha;
        // glow
        const glow = ctx.createRadialGradient(0, l.size * 0.1, 0, 0, l.size * 0.1, l.size * 2);
        glow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`);
        glow.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, l.size * 0.1, l.size * 2, 0, Math.PI * 2);
        ctx.fill();
        // lantern body
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size * 0.65, l.size * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        // top/bottom caps
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.9)`;
        ctx.fillRect(-l.size * 0.25, -l.size * 0.85, l.size * 0.5, l.size * 0.15);
        ctx.fillRect(-l.size * 0.25, l.size * 0.7, l.size * 0.5, l.size * 0.15);
        // warm core
        ctx.fillStyle = `rgba(255, 230, 180, 0.65)`;
        ctx.beginPath();
        ctx.ellipse(0, l.size * 0.05, l.size * 0.3, l.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawPetal(p, time) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 1)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Peaceful dusk background
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${S.r * 0.3}, ${S.g * 0.3}, ${S.b * 0.3}, 0.85)`);
        bg.addColorStop(0.6, `rgba(${P.r * 0.1}, ${P.g * 0.05}, ${P.b * 0.05}, 0.75)`);
        bg.addColorStop(1, `rgba(${S.r * 0.15}, ${S.g * 0.15}, ${S.b * 0.15}, 0.9)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Soft golden glows
        glows.forEach(g => {
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.01 + g.phase);
            const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
            gr.addColorStop(0, `rgba(255, 200, 100, ${g.alpha * pulse})`);
            gr.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Floating lanterns
        lanterns.forEach(l => {
            if (!prefersReduced) {
                l.sway += l.swaySpeed;
                l.y -= l.drift;
                l.x += Math.sin(l.sway) * 0.15;
                if (l.y < -60) { l.y = height + 60; l.x = Math.random() * width; }
            }
            drawLantern(l, time);
        });

        // Falling cherry petals
        petals.forEach(p => {
            if (!prefersReduced) {
                p.y += p.vy;
                p.x += p.vx + Math.sin(time * 0.01 + p.y * 0.005) * 0.3;
                p.angle += p.spin;
                if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
            }
            drawPetal(p, time);
        });

        ctx.globalAlpha = 1;

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
