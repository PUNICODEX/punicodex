// Šamaš — rays of justice, law tablets, golden sun
(function() {
    const canvas = document.getElementById('shamash-justice-canvas');
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


    const tablets = [];
    for (let i = 0; i < 2; i++) tablets.push({ x: 0.35 + i * 0.3, y: 0.25, w: 70, h: 100, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.15;
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + frame * 0.001;
            const len = 180 + Math.sin(frame * 0.03 + i) * 30;
            const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
            grad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.2)`);
            grad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }
        tablets.forEach(t => {
            t.phase += 0.015;
            const x = t.x * width, y = t.y * height;
            const alpha = 0.12 + 0.06 * Math.sin(t.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${alpha})`;
            ctx.fillRect(x - t.w / 2, y, t.w, t.h);
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${alpha + 0.1})`;
            ctx.strokeRect(x - t.w / 2, y, t.w, t.h);
        });
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
