// Hemera — dawn rays, sky gradient, rising light
(function() {
    const canvas = document.getElementById('hemera-dawn-canvas');
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


    const rays = [];
    for (let i = 0; i < 10; i++) rays.push({ angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2, width: Math.random() * 0.15 + 0.05, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.2;
        rays.forEach(r => {
            r.phase += 0.02;
            const a = 0.08 + 0.05 * Math.sin(r.phase);
            const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(r.angle) * height, cy + Math.sin(r.angle) * height);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${a})`);
            g.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, height, r.angle - r.width / 2, r.angle + r.width / 2); ctx.closePath(); ctx.fill();
        });
        particles.forEach(p => { p.y -= 0.3; p.x += Math.sin(frame * 0.01 + p.phase) * 0.3; if (p.y < -10) p.y = height + 10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
