// Mictlāntēcutli — obsidian shards, bone dust, underworld green glow, falling ashes
(function() {
    const canvas = document.getElementById('mictlantecutli-hero-canvas');
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

    const P = readColor('data-primary', '#50C878');   // jade glow
    const S = readColor('data-secondary', '#2F2F2F'); // obsidian dark

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
    const SHARD_COUNT = width < 768 ? 16 : 28;
    for (let i = 0; i < SHARD_COUNT; i++) {
        shards.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 8 + Math.random() * 28,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.008,
            drift: (Math.random() - 0.5) * 0.15,
            opacity: 0.18 + Math.random() * 0.25
        });
    }

    const ashes = [];
    const ASH_COUNT = width < 600 ? 40 : 90;
    for (let i = 0; i < ASH_COUNT; i++) {
        ashes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: 0.2 + Math.random() * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            size: 0.8 + Math.random() * 1.8,
            alpha: 0.1 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2
        });
    }

    const sparks = [];
    const SPARK_COUNT = width < 600 ? 12 : 24;
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.3 - Math.random() * 0.4,
            size: 1 + Math.random() * 2,
            alpha: 0.25 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawShard(s) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.opacity})`;
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.opacity * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s.size * 0.5, -s.size * 0.3);
        ctx.lineTo(s.size * 0.4, -s.size * 0.5);
        ctx.lineTo(s.size * 0.2, s.size * 0.4);
        ctx.lineTo(-s.size * 0.3, s.size * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Dark underworld vignette
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.22)`);
        bg.addColorStop(0.5, `rgba(20, 20, 20, 0.88)`);
        bg.addColorStop(1, `rgba(8, 8, 8, 0.98)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Jade-green glow from below
        const glow = ctx.createLinearGradient(0, height, 0, height * 0.5);
        glow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        // Obsidian shards
        shards.forEach(s => {
            if (!prefersReduced) {
                s.y += 0.05;
                s.x += s.drift;
                s.angle += s.spin;
                if (s.y > height + 40) s.y = -40;
                if (s.x > width + 40) s.x = -40;
                if (s.x < -40) s.x = width + 40;
            }
            drawShard(s);
        });

        // Falling ashes / bone dust
        ctx.fillStyle = 'rgba(180, 175, 165, 1)';
        ashes.forEach(a => {
            if (!prefersReduced) {
                a.y += a.vy;
                a.x += a.vx + Math.sin(time * 0.01 + a.phase) * 0.1;
                if (a.y > height + 5) { a.y = -5; a.x = Math.random() * width; }
            }
            ctx.globalAlpha = a.alpha;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Jade sparks
        sparks.forEach(s => {
            if (!prefersReduced) {
                s.y += s.vy;
                if (s.y < -5) { s.y = height + 5; s.x = Math.random() * width; }
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.05 + s.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.alpha * pulse})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.6)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
