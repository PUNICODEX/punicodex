// Mnēmosýnē — still water reflecting stars, memory ripples, ink drops blooming, soft muse-light
(function() {
    const canvas = document.getElementById('mnemosyne-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // muse gold
    const S = readColor('data-secondary', '#4169E1'); // memory blue

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

    const stars = [];
    const STAR_COUNT = width < 600 ? 60 : 120;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.45,
            size: Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.5 + 0.15,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const ripples = [];
    let nextRipple = 0;
    function spawnRipple() {
        if (prefersReduced) return;
        nextRipple--;
        if (nextRipple <= 0) {
            nextRipple = 15 + Math.floor(Math.random() * 30);
            ripples.push({
                x: Math.random() * width,
                y: height * 0.55 + Math.random() * height * 0.4,
                r: 0,
                alpha: 0.35
            });
        }
    }

    const inkDrops = [];
    let nextInk = 0;
    function spawnInk() {
        if (prefersReduced) return;
        nextInk--;
        if (nextInk <= 0) {
            nextInk = 40 + Math.floor(Math.random() * 60);
            inkDrops.push({
                x: Math.random() * width,
                y: height * 0.55 + Math.random() * height * 0.4,
                r: 0,
                alpha: 0.45
            });
        }
    }

    const museLights = [];
    const LIGHT_COUNT = width < 600 ? 8 : 15;
    for (let i = 0; i < LIGHT_COUNT; i++) {
        museLights.push({
            x: Math.random() * width,
            y: height * 0.3 + Math.random() * height * 0.5,
            r: 2 + Math.random() * 3,
            alpha: 0.15 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Night-to-water gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(4, 6, 16, 0.95)`);
        bg.addColorStop(0.5, `rgba(${S.r * 0.1}, ${S.g * 0.1}, ${S.b * 0.2}, 0.8)`);
        bg.addColorStop(0.52, `rgba(${S.r * 0.08}, ${S.g * 0.08}, ${S.b * 0.15}, 0.85)`);
        bg.addColorStop(1, `rgba(${S.r * 0.05}, ${S.g * 0.05}, ${S.b * 0.1}, 0.92)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Stars
        stars.forEach(s => {
            const tw = prefersReduced ? 0 : Math.sin(time * 0.02 + s.twinkle) * 0.25;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, s.alpha + tw)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Reflected stars in water
        ctx.globalAlpha = 0.25;
        stars.forEach(s => {
            const ry = height - (height * 0.5 - s.y) * 0.8;
            if (ry > height * 0.5) {
                ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.5})`;
                ctx.beginPath();
                ctx.ellipse(s.x, ry, s.size * 2, s.size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;

        // Memory ripples
        spawnRipple();
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.4)`;
        ctx.lineWidth = 1;
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.r += 0.5;
            r.alpha -= 0.004;
            if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
            ctx.globalAlpha = r.alpha;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r * 1.5, r.r * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Ink drops blooming
        spawnInk();
        for (let i = inkDrops.length - 1; i >= 0; i--) {
            const d = inkDrops[i];
            d.r += 0.4;
            d.alpha -= 0.003;
            if (d.alpha <= 0) { inkDrops.splice(i, 1); continue; }
            const gr = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
            gr.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, ${d.alpha})`);
            gr.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Soft muse-lights
        museLights.forEach(l => {
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.015 + l.phase);
            const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 5);
            gr.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${l.alpha * pulse})`);
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.r * 5, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
