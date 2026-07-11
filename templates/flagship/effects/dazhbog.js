// Dažbog — Slavic sun-giver; radiance, golden wealth, rising embers
(function () {
    const canvas = document.getElementById('dazhbog-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width, height, cx, cy;
    let frame = 0;

    function hexToRgb(hex) {
        if (!hex) return null;
        const clean = hex.charAt(0) === '#' ? hex.slice(1) : hex;
        if (clean.length !== 6) return null;
        const n = parseInt(clean, 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbFrom(attr, fallback) {
        return hexToRgb(canvas.getAttribute('data-' + attr)) || hexToRgb(fallback);
    }

    const P = rgbFrom('primary', '#F4B41A');   // solar gold
    const S = rgbFrom('secondary', '#E85D04'); // ember orange

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = width * 0.5;
        cy = height * 0.55;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const COUNT = 80;
    for (let i = 0; i < COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.8 - 0.2,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.6 + 0.2,
            wobble: Math.random() * Math.PI * 2,
            color: Math.random() > 0.4 ? P : S
        });
    }

    const RAYS = 16;

    function drawSun() {
        const pulse = 1 + Math.sin(frame * 0.02) * 0.04;
        const rBase = Math.min(width, height) * 0.18 * pulse;

        const glow = ctx.createRadialGradient(cx, cy, rBase * 0.2, cx, cy, rBase * 1.6);
        glow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`);
        glow.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`);
        glow.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, rBase * 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy, rBase * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.2)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < RAYS; i++) {
            const a = (i / RAYS) * Math.PI * 2 + frame * 0.005;
            const r0 = rBase * 0.5;
            const r1 = rBase * (1.1 + Math.sin(frame * 0.03 + i) * 0.15);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
            ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.stroke();
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            p.x += p.vx + Math.sin(frame * 0.02 + p.wobble) * 0.15;
            p.y += p.vy;
            if (p.y < -10) {
                p.y = height + 10;
                p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            const flicker = 0.7 + Math.sin(frame * 0.05 + p.wobble) * 0.3;
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawSun();
        drawParticles();
        frame++;
        requestAnimationFrame(draw);
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        drawSun();
        drawParticles();
    }

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
        frame = 0;
        drawStatic();
    } else {
        draw();
    }
})();
