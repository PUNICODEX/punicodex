// Isis — throne glyphs, starry magic, protective wings
(function() {
    const canvas = document.getElementById('isis-throne-canvas');
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


    const glyphs = [];
    for (let i = 0; i < 8; i++) glyphs.push({ x: Math.random(), y: Math.random(), size: Math.random() * 20 + 15, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        glyphs.forEach(g => {
            g.phase += 0.015;
            const x = g.x * width, y = g.y * height;
            const a = 0.08 + 0.05 * Math.sin(g.phase);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - g.size, y); ctx.lineTo(x - g.size * 0.3, y - g.size * 0.6); ctx.lineTo(x + g.size * 0.3, y - g.size * 0.6); ctx.lineTo(x + g.size, y); ctx.lineTo(x + g.size * 0.3, y + g.size * 0.6); ctx.lineTo(x - g.size * 0.3, y + g.size * 0.6); ctx.closePath(); ctx.stroke();
        });
        particles.forEach(p => { p.y -= 0.2; p.x += Math.sin(frame * 0.01 + p.phase) * 0.2; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
