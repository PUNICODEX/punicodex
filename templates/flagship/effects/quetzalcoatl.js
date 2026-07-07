// Quetzalcōātl — emerald feathers, wind spirals
(function() {
    const canvas = document.getElementById('quetzal-feather-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#00A86B');
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


    let featherPhase = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        featherPhase += 0.01;
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.15)`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 4; t += 0.04) {
            const r = 70 + t * 14;
            const x = width * 0.5 + Math.cos(t + featherPhase) * r;
            const y = height * 0.5 + Math.sin(t * 1.3 + featherPhase) * r * 0.35;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2 + featherPhase;
            const x = width * 0.5 + Math.cos(a) * (120 + Math.sin(frame * 0.03 + i) * 20);
            const y = height * 0.5 + Math.sin(a) * 60;
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`;
            ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
