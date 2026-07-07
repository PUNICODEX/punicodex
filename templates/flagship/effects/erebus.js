// Erebus — primordial darkness, slow shadow tides
(function() {
    const canvas = document.getElementById('erebus-void-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#2A1F3D');
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


    const tendrils = [];
    for (let i = 0; i < 7; i++) tendrils.push({ x: Math.random() * width, width: 20 + Math.random() * 40, phase: Math.random() * Math.PI * 2, speed: 0.002 + Math.random() * 0.003 });
    function draw() {
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.08)`;
        ctx.fillRect(0, 0, width, height);
        tendrils.forEach(t => {
            t.phase += t.speed;
            const a = 0.04 + 0.03 * Math.sin(t.phase);
            const g = ctx.createLinearGradient(t.x, -50, t.x, height + 50);
            g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            g.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, ${a})`);
            g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.fillStyle = g; ctx.fillRect(t.x - t.width / 2, 0, t.width, height);
        });
        particles.forEach(p => { p.x += p.vx * 0.3; p.y += p.vy * 0.3; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.5})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
