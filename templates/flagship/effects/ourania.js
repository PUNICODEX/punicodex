// Ouranía — constellation lines drawing themselves, soft stardust, deep blue/gold, shooting stars
(function() {
    const canvas = document.getElementById('ourania-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // gold
    const S = readColor('data-secondary', '#4169E1'); // royal blue

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
    const STAR_COUNT = width < 600 ? 70 : 140;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.6 + 0.4,
            alpha: Math.random() * 0.5 + 0.15,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    // Constellation shape in the upper half
    const constellations = [];
    for (let c = 0; c < 3; c++) {
        const cx = width * (0.2 + c * 0.3);
        const cy = height * (0.2 + Math.random() * 0.25);
        const nodes = [];
        const nodeCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: cx + (Math.random() - 0.5) * Math.min(width * 0.25, 260),
                y: cy + (Math.random() - 0.5) * Math.min(height * 0.25, 200)
            });
        }
        constellations.push({ nodes, connections: nodes.map((_, i) => (i + 1) % nodeCount) });
    }

    const shootingStars = [];
    function spawnShootingStar() {
        if (prefersReduced || Math.random() > 0.015) return;
        shootingStars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.4,
            vx: -3 - Math.random() * 3,
            vy: 1 + Math.random() * 2,
            len: 40 + Math.random() * 60,
            life: 1
        });
    }

    const dust = [];
    const DUST_COUNT = width < 600 ? 25 : 50;
    for (let i = 0; i < DUST_COUNT; i++) {
        dust.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.05 - Math.random() * 0.1,
            size: 0.6 + Math.random() * 1.2,
            alpha: 0.1 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Night sky gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(2, 6, 28, 0.98)`);
        bg.addColorStop(0.5, `rgba(${S.r * 0.15}, ${S.g * 0.15}, ${S.b * 0.3}, 0.85)`);
        bg.addColorStop(1, `rgba(${S.r * 0.08}, ${S.g * 0.08}, ${S.b * 0.2}, 0.92)`);
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

        // Constellation lines drawing themselves
        constellations.forEach((c, ci) => {
            const progress = prefersReduced ? 1 : Math.min(1, (time % 360) / 300);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.45)`;
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`;
            c.connections.forEach((to, from) => {
                const a = c.nodes[from];
                const b = c.nodes[to];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const endX = a.x + dx * progress;
                const endY = a.y + dy * progress;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
            ctx.shadowBlur = 0;
            // nodes
            c.nodes.forEach(n => {
                ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.85)`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // Shooting stars
        spawnShootingStar();
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const s = shootingStars[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.015;
            if (s.life <= 0) {
                shootingStars.splice(i, 1);
                continue;
            }
            const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
            grad.addColorStop(0, `rgba(255, 255, 255, ${s.life})`);
            grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * (s.len / 6), s.y - s.vy * (s.len / 6));
            ctx.stroke();
        }

        // Stardust
        dust.forEach(d => {
            if (!prefersReduced) d.y += d.vy;
            if (d.y < -5) { d.y = height + 5; d.x = Math.random() * width; }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.02 + d.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${d.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
