// Aššur — winged solar disk, Assyrian rays
(function() {
    const canvas = document.getElementById('ashur-wing-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#8B0000');
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


    let wingFlap = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        wingFlap += 0.02;
        const cx = width * 0.5, cy = height * 0.25;
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2 + frame * 0.002;
            const len = 120 + Math.sin(frame * 0.03 + i) * 20;
            const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            g.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.25)`);
            g.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }
        ctx.save(); ctx.translate(cx, cy);
        const flap = Math.sin(wingFlap) * 0.1;
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`;
        for (let side of [-1, 1]) {
            ctx.save(); ctx.scale(side, 1); ctx.rotate(flap);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(80, -60, 180, -40, 220, 10); ctx.bezierCurveTo(160, 30, 90, 20, 0, 0); ctx.fill(); ctx.restore();
        }
        ctx.restore();
        particles.forEach(p => { p.x += p.vx * 0.5; p.y += p.vy * 0.5; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
