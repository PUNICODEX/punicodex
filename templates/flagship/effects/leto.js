// Lētō — hidden silver moonlight, wolf silhouettes in mist, delicate night-blooming flowers, secrecy
(function() {
    const canvas = document.getElementById('leto-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // soft moon gold
    const S = readColor('data-secondary', '#4169E1'); // night blue

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

    const moon = { x: width * 0.75, y: height * 0.25, r: Math.min(width, height) * 0.12 };

    const mist = [];
    const MIST_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < MIST_COUNT; i++) {
        mist.push({
            x: Math.random() * width,
            y: height * 0.55 + Math.random() * height * 0.35,
            r: 60 + Math.random() * 120,
            alpha: 0.06 + Math.random() * 0.1,
            speed: 0.1 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2
        });
    }

    const wolves = [];
    const WOLF_COUNT = width < 768 ? 2 : 3;
    for (let i = 0; i < WOLF_COUNT; i++) {
        wolves.push({
            x: width * (0.15 + i * 0.35 + Math.random() * 0.15),
            y: height * 0.62,
            scale: 0.7 + Math.random() * 0.4,
            alpha: 0.12 + Math.random() * 0.1
        });
    }

    const flowers = [];
    const FLOWER_COUNT = width < 600 ? 12 : 24;
    for (let i = 0; i < FLOWER_COUNT; i++) {
        flowers.push({
            x: Math.random() * width,
            y: height * 0.75 + Math.random() * height * 0.2,
            size: 4 + Math.random() * 8,
            alpha: 0.2 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawWolf(w) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.scale(w.scale, w.scale);
        ctx.fillStyle = `rgba(8, 10, 16, ${w.alpha})`;
        ctx.beginPath();
        // howling wolf silhouette
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -25);
        ctx.lineTo(-6, -35);
        ctx.lineTo(2, -42);
        ctx.lineTo(8, -35);
        ctx.lineTo(14, -38);
        ctx.lineTo(18, -28);
        ctx.lineTo(22, -22);
        ctx.lineTo(30, -10);
        ctx.lineTo(36, 0);
        ctx.lineTo(30, 8);
        ctx.lineTo(10, 12);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawFlower(f, time) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.globalAlpha = f.alpha * (0.7 + 0.3 * Math.sin(time * 0.02 + f.phase));
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 1)`;
        for (let i = 0; i < 5; i++) {
            const a = i * (Math.PI * 2 / 5);
            ctx.beginPath();
            ctx.ellipse(Math.cos(a) * f.size * 0.5, Math.sin(a) * f.size * 0.5, f.size * 0.35, f.size * 0.15, a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.7)`;
        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Night gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(4, 6, 18, 0.97)`);
        bg.addColorStop(0.5, `rgba(${S.r * 0.1}, ${S.g * 0.1}, ${S.b * 0.25}, 0.82)`);
        bg.addColorStop(1, `rgba(8, 12, 20, 0.95)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Silver moon
        const moonGlow = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, moon.r * 3);
        moonGlow.addColorStop(0, `rgba(230, 235, 245, 0.28)`);
        moonGlow.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.08)`);
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(235, 240, 250, 0.9)';
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
        ctx.fill();

        // Mist
        mist.forEach(m => {
            if (!prefersReduced) m.x += m.speed;
            if (m.x > width + m.r) m.x = -m.r;
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.005 + m.phase);
            const gr = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
            gr.addColorStop(0, `rgba(200, 210, 230, ${m.alpha * pulse})`);
            gr.addColorStop(1, 'rgba(200, 210, 230, 0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Wolf silhouettes
        wolves.forEach(w => drawWolf(w));

        // Night-blooming flowers
        flowers.forEach(f => drawFlower(f, time));

        ctx.globalAlpha = 1;

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
