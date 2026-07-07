// Wadjet — cobra scales, protective green flame
(function() {
    const canvas = document.getElementById('wadjet-cobra-canvas');
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


    let scaleOffset = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        scaleOffset += 0.3;
        const size = 24;
        for (let y = 0; y < height + size; y += size) {
            for (let x = 0; x < width + size; x += size) {
                const dx = x - width * 0.5;
                const dy = y - height * 0.5;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const a = 0.04 + 0.04 * Math.sin((dist - scaleOffset) * 0.05);
                ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`;
                ctx.beginPath(); ctx.arc(x + (y / size % 2) * size / 2, y, size / 2 - 2, 0, Math.PI, true); ctx.fill();
            }
        }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
