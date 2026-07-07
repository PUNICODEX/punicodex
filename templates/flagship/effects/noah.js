// Noah — rain, ark silhouette, covenant rainbow
(function() {
    const canvas = document.getElementById('noah-rain-canvas');
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


    let rainFrame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        rainFrame += 1;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.15)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 25); ctx.stroke();
        }
        if (rainFrame % 600 < 300) {
            const t = (rainFrame % 300) / 300;
            const a = 0.15 * Math.sin(t * Math.PI);
            const g = ctx.createRadialGradient(width * 0.5, height * 0.8, 0, width * 0.5, height * 0.8, width * 0.5);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            g.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, ${a * 0.5})`);
            g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(width * 0.5, height * 0.8, width * 0.5, Math.PI, 0); ctx.fill();
        }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy + 0.5; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
