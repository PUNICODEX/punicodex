// Thoth — Egyptian lunar scribe: moon, stars, drifting hieroglyphs
(function() {
    const canvas = document.getElementById('thoth-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width, height, dpr, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const hex = canvas.getAttribute(attr);
        return hex && hex.startsWith('#') ? hexToRgb(hex) : fallback;
    }

    const lapis = hexToRgb('#1E3A5F');
    const gold = hexToRgb('#D4AF37');
    const P = readColor('data-primary', lapis);
    const S = readColor('data-secondary', gold);

    function resize() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    const STAR_COUNT = 100;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.2 + 0.3,
            alpha: Math.random() * 0.5 + 0.15,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const glyphShapes = [
        // ankh
        function ankh(s) {
            ctx.arc(0, -s * 0.7, s * 0.45, 0, Math.PI * 2);
            ctx.moveTo(0, -s * 0.25);
            ctx.lineTo(0, s * 0.9);
            ctx.moveTo(-s * 0.55, s * 0.25);
            ctx.lineTo(s * 0.55, s * 0.25);
        },
        // wedjat eye
        function eye(s) {
            ctx.moveTo(-s, 0);
            ctx.quadraticCurveTo(0, -s * 0.8, s, 0);
            ctx.quadraticCurveTo(0, s * 0.8, -s, 0);
            ctx.moveTo(s * 0.25, 0);
            ctx.arc(s * 0.25, 0, s * 0.22, 0, Math.PI * 2);
        },
        // maat feather
        function feather(s) {
            ctx.moveTo(0, s);
            ctx.quadraticCurveTo(-s * 0.45, s * 0.3, 0, -s);
            ctx.quadraticCurveTo(s * 0.45, s * 0.3, 0, s);
            for (let i = 0; i < 4; i++) {
                const y = s * 0.45 - i * s * 0.35;
                ctx.moveTo(0, y);
                ctx.lineTo(-s * 0.35, y - s * 0.12);
                ctx.moveTo(0, y);
                ctx.lineTo(s * 0.35, y - s * 0.12);
            }
        }
    ];

    const glyphs = [];
    const GLYPH_COUNT = 14;
    for (let i = 0; i < GLYPH_COUNT; i++) {
        glyphs.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -Math.random() * 0.3 - 0.05,
            size: Math.random() * 12 + 7,
            alpha: Math.random() * 0.22 + 0.08,
            shape: Math.floor(Math.random() * glyphShapes.length),
            phase: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.008
        });
    }

    function drawMoon(cx, cy, r) {
        const t = frame * 0.0025;
        const bulge = r * 0.55 * Math.sin(t);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.16)`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.42)`;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.arc(bulge, 0, r, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawNile() {
        const t = frame * 0.004;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.1)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
            const y = height * 0.92 + Math.sin(x * 0.008 + t) * 14 + Math.sin(x * 0.022 - t * 1.4) * 5;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        stars.forEach(star => {
            const a = star.alpha + Math.sin(frame * 0.03 + star.twinkle) * 0.08;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, a)})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        drawMoon(width * 0.76, height * 0.26, Math.min(width, height) * 0.17);

        glyphs.forEach(g => {
            g.x += g.vx;
            g.y += g.vy;
            g.phase += g.spin;
            if (g.y < -50) { g.y = height + 50; g.x = Math.random() * width; }
            if (g.x < -50) g.x = width + 50;
            if (g.x > width + 50) g.x = -50;

            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.phase);
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${g.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            glyphShapes[g.shape](g.size);
            ctx.stroke();
            ctx.restore();
        });

        drawNile();

        if (prefersReducedMotion) return;
        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
