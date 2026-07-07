// Leviathan — coiled sea serpent, bioluminescent depths
(function() {
    const canvas = document.getElementById('leviathan-coil-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#1E3A5F');
    const S = hexToRgb('#00CED1');

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


    let coilOffset = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        coilOffset += 0.01;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 4; t += 0.05) {
            const r = 80 + t * 12;
            const x = width * 0.5 + Math.cos(t + coilOffset) * r;
            const y = height * 0.6 + Math.sin(t * 2 + coilOffset) * r * 0.4;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
