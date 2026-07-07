// David — harp strings, royal crown sparks
(function() {
    const canvas = document.getElementById('david-harp-canvas');
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


    const strings = [];
    for (let i = 0; i < 9; i++) strings.push({ x: 0.2 + i * 0.075, phase: Math.random() * Math.PI * 2 });
    function draw() {
        ctx.clearRect(0, 0, width, height);
        strings.forEach((str, i) => {
            str.phase += 0.05;
            const x = str.x * width;
            const amp = 4 + Math.sin(str.phase) * 3;
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.2)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, height * 0.25);
            for (let y = height * 0.25; y < height * 0.85; y += 10) {
                ctx.lineTo(x + Math.sin((y + str.phase * 20) * 0.05) * amp, y);
            }
            ctx.lineTo(x, height * 0.85); ctx.stroke();
        });
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = width + 10; if (p.x > width + 10) p.x = -10; if (p.y < -10) p.y = height + 10; if (p.y > height + 10) p.y = -10; ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
