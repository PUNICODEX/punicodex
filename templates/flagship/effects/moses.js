// Moses — desert sand, mountain fire, burning bush sparks
(function() {
    const canvas = document.getElementById('moses-desert-canvas');
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


    let duneOffset = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        duneOffset += 0.15;
        for (let d = 0; d < 3; d++) {
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${0.04 + d * 0.01})`;
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {
                const y = height - 30 - d * 30 + Math.sin((x + duneOffset + d * 200) * 0.004) * 25;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height); ctx.closePath(); ctx.fill();
        }
        particles.forEach(p => { p.y -= 0.6; p.x += (Math.random() - 0.5) * 0.8; if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; } ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
