// Bagua — rotating trigrams, chi flow
(function() {
    const canvas = document.getElementById('bagua-trigram-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#C41E3A');
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


    const trigrams = [];
    for (let i = 0; i < 8; i++) trigrams.push({ angle: (i / 8) * Math.PI * 2, dist: 90 + Math.random() * 40, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.35;
        trigrams.forEach(t => {
            t.angle += 0.003; t.phase += 0.02;
            const x = cx + Math.cos(t.angle) * t.dist;
            const y = cy + Math.sin(t.angle) * t.dist * 0.5;
            const a = 0.15 + 0.08 * Math.sin(t.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`;
            ctx.save(); ctx.translate(x, y); ctx.rotate(t.angle + Math.PI / 2);
            for (let row = 0; row < 3; row++) {
                const broken = (row + Math.floor(t.angle * 10)) % 2 === 0;
                const yy = (row - 1) * 10;
                if (broken) { ctx.fillRect(-14, yy, 10, 3); ctx.fillRect(4, yy, 10, 3); } else { ctx.fillRect(-16, yy, 32, 3); }
            }
            ctx.restore();
        });
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
