// Long — Chinese dragon coils, clouds, pearls
(function() {
    const canvas = document.getElementById('long-dragon-canvas');
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


    let dragonPhase = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        dragonPhase += 0.008;
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.15)`;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 5; t += 0.04) {
            const r = 60 + t * 18;
            const x = width * 0.5 + Math.cos(t + dragonPhase) * r;
            const y = height * 0.45 + Math.sin(t * 1.5 + dragonPhase) * r * 0.35;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        const px = width * 0.5 + Math.cos(dragonPhase * 3) * 120;
        const py = height * 0.45 + Math.sin(dragonPhase * 3) * 60;
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.25)`;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
