// Tiān — Celestial mandate, golden dragon-clouds, auspicious characters ascending
(function() {
    const canvas = document.getElementById('tian-hero-canvas');
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

    const P = readColor('data-primary', '#DC143C');   // imperial red
    const S = readColor('data-secondary', '#FFD700'); // celestial gold

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

    const clouds = [];
    const CLOUD_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < CLOUD_COUNT; i++) {
        clouds.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.65,
            scale: 0.6 + Math.random() * 1.2,
            speed: 0.05 + Math.random() * 0.12,
            phase: Math.random() * Math.PI * 2,
            opacity: 0.12 + Math.random() * 0.18
        });
    }

    const characters = [];
    const CHARS = '天龍雲福壽祥瑞帝宇';
    const CHAR_COUNT = width < 768 ? 8 : 14;
    for (let i = 0; i < CHAR_COUNT; i++) {
        characters.push({
            x: Math.random() * width,
            y: Math.random() * height,
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            size: 14 + Math.random() * 22,
            speed: 0.15 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.15 + Math.random() * 0.25
        });
    }

    const sparks = [];
    const SPARK_COUNT = width < 600 ? 30 : 60;
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.6 + 0.4,
            vy: -0.2 - Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.5 + 0.15
        });
    }

    function drawCloud(x, y, scale, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.arc(26, -6, 18, 0, Math.PI * 2);
        ctx.arc(48, 2, 20, 0, Math.PI * 2);
        ctx.arc(70, -5, 14, 0, Math.PI * 2);
        ctx.arc(22, 10, 16, 0, Math.PI * 2);
        ctx.arc(50, 12, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Deep red radial ground
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.75);
        bg.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.55)`);
        bg.addColorStop(0.6, `rgba(${P.r}, ${P.g}, ${P.b}, 0.82)`);
        bg.addColorStop(1, `rgba(40, 0, 10, 0.95)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Drifting clouds
        clouds.forEach(c => {
            if (!prefersReduced) c.x += c.speed;
            if (c.x > width + 120 * c.scale) c.x = -120 * c.scale;
            const y = c.y + Math.sin(time * 0.005 + c.phase) * 8;
            drawCloud(c.x, y, c.scale, c.opacity);
        });

        // Rising golden characters
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 1)`;
        ctx.font = 'lighter sans-serif';
        ctx.textAlign = 'center';
        characters.forEach(c => {
            if (!prefersReduced) c.y -= c.speed;
            if (c.y < -40) { c.y = height + 40; c.x = Math.random() * width; }
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.02 + c.phase);
            ctx.globalAlpha = c.alpha * pulse;
            ctx.font = `${c.size}px serif`;
            ctx.fillText(c.char, c.x, c.y);
        });
        ctx.globalAlpha = 1;

        // Golden sparks
        sparks.forEach(s => {
            if (!prefersReduced) s.y += s.vy;
            if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.04 + s.phase);
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
