// Herakles — lion's mane flames, labors embers
(function() {
    const canvas = document.getElementById('herakles-lion-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#D4AF37');
    const S = hexToRgb('#4169E1');

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


    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, baseY = height * 0.85;
        for (let i = 0; i < 30; i++) {
            const x = cx + (Math.random() - 0.5) * 200;
            const h = 60 + Math.random() * 120;
            const a = 0.05 + Math.random() * 0.08;
            const g = ctx.createLinearGradient(x, baseY, x, baseY - h);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`);
            g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, baseY - h / 2, 8 + Math.random() * 8, h / 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        particles.forEach(p => { p.y -= 0.5; p.x += (Math.random() - 0.5) * 0.5; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
