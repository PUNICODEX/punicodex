// Nekhbet — vulture wings, white crown of Upper Egypt, protective golden aura
(function() {
    const canvas = document.getElementById('nht-vulture-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const P = hexToRgb('#D4AF37');
    const S = hexToRgb('#FFFFFF');
    const D = hexToRgb('#1E3A5F');

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const feathers = [];
    const FEATHER_COUNT = 48;
    for (let i = 0; i < FEATHER_COUNT; i++) {
        const side = i < FEATHER_COUNT / 2 ? -1 : 1;
        const index = i < FEATHER_COUNT / 2 ? i : i - FEATHER_COUNT / 2;
        feathers.push({
            side,
            index,
            length: 120 + Math.random() * 180,
            angle: (Math.PI / 2) + side * (0.2 + index * 0.035),
            sway: Math.random() * Math.PI * 2,
            speed: 0.01 + Math.random() * 0.01
        });
    }

    const particles = [];
    const PARTICLE_COUNT = 80;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4 - 0.2,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.6 ? P : S
        });
    }

    function drawWing(side, spread) {
        const cx = width * 0.5 + side * spread * 0.5;
        const cy = height * 0.55;
        const wingFeathers = feathers.filter(f => f.side === side);
        wingFeathers.forEach((f, i) => {
            const flutter = Math.sin(frame * f.speed + f.sway) * 0.03;
            const angle = f.angle + flutter;
            const len = f.length * (0.8 + Math.sin(frame * 0.005 + i) * 0.1);
            const x2 = cx + Math.cos(angle) * len;
            const y2 = cy + Math.sin(angle) * len;
            const g = ctx.createLinearGradient(cx, cy, x2, y2);
            g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`);
            g.addColorStop(0.5, `rgba(${P.r}, ${P.g}, ${P.b}, 0.10)`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 14 + Math.random() * 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(
                cx + Math.cos(angle - side * 0.15) * len * 0.5,
                cy + Math.sin(angle - side * 0.15) * len * 0.5 + 20,
                x2, y2
            );
            ctx.stroke();
        });
    }

    function drawCrown() {
        const cx = width * 0.5;
        const cy = height * 0.38;
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140);
        g.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`);
        g.addColorStop(0.6, `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 120, 90, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.fillStyle = `rgba(${D.r}, ${D.g}, ${D.b}, 0.25)`;
        ctx.fillRect(0, 0, width, height);
        drawCrown();
        const spread = Math.min(width * 0.9, 1200);
        drawWing(-1, spread);
        drawWing(1, spread);
        particles.forEach(p => {
            p.x += p.vx + Math.sin(frame * 0.01 + p.phase) * 0.2;
            p.y += p.vy;
            if (p.y < -10) p.y = height + 10;
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            const a = p.alpha * (0.7 + Math.sin(frame * 0.02 + p.phase) * 0.3);
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
