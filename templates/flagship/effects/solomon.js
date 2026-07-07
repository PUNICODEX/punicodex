// Solomon — temple columns, seal rings, wisdom sparks
(function() {
    const canvas = document.getElementById('solomon-temple-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#6B4C1E');
    const S = hexToRgb('#D4AF37');

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


    const columns = [];
    for (let i = 0; i < 6; i++) columns.push({ x: (i + 1) / 7 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        columns.forEach(c => {
            const x = c.x * width;
            const g = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            g.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.08)`);
            g.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.fillStyle = g; ctx.fillRect(x - 15, 0, 30, height);
        });
        const cx = width * 0.5, cy = height * 0.35;
        for (let r = 30; r < 120; r += 25) {
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${0.1 - r * 0.0005})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, r + Math.sin(frame * 0.02 + r) * 3, 0, Math.PI * 2); ctx.stroke();
        }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
