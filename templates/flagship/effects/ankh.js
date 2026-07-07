// Ankh — life, golden radiance, rising souls
(function() {
    const canvas = document.getElementById('ankh-life-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#C9A227');
    const S = hexToRgb('#1E3A5F');

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const PARTICLE_COUNT = 70;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.5 ? P : S
        });
    }


    const rays = [];
    for (let i = 0; i < 12; i++) {
        rays.push({ angle: Math.random() * Math.PI * 2, width: Math.random() * 0.2 + 0.05, speed: (Math.random() - 0.5) * 0.002, alpha: Math.random() * 0.15 + 0.05 });
    }
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.35;
        rays.forEach(r => {
            r.angle += r.speed;
            const a = r.alpha * (0.7 + 0.3 * Math.sin(frame * 0.01 + r.angle * 5));
            const g = ctx.createConicGradient(r.angle, cx, cy);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            g.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`);
            g.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        });
        particles.forEach(p => { p.y -= 0.3; p.x += Math.sin(frame * 0.01 + p.phase) * 0.3; if (p.y < -10) p.y = height + 10; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
