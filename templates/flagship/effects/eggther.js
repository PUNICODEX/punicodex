// Eggþér — Rune-circle watchfire for the Norse sword-guardian
(function () {
    const canvas = document.getElementById('eggther-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, frame = 0;
    const dpr = window.devicePixelRatio || 1;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const P = hexToRgb(canvas.dataset.primary || '#5B8DB8');
    const S = hexToRgb(canvas.dataset.secondary || '#C9975B');

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    const runeGlyphs = [];
    for (let i = 0; i < 18; i++) {
        runeGlyphs.push({ char: runes[i % runes.length], angle: (i / 18) * Math.PI * 2, offset: Math.random() * 0.5 });
    }

    const sparks = [];
    for (let i = 0; i < 45; i++) {
        sparks.push({
            x: Math.random() * width,
            y: height + Math.random() * 120,
            vy: -(Math.random() * 0.8 + 0.3),
            vx: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 1.8 + 0.4,
            life: Math.random(),
            color: Math.random() > 0.6 ? S : P
        });
    }

    const auroraBands = [
        { yBase: 0.25, amplitude: 30, phase: 0, speed: 0.002, color: P },
        { yBase: 0.37, amplitude: 45, phase: 2.1, speed: 0.003, color: S },
        { yBase: 0.49, amplitude: 60, phase: 4.2, speed: 0.004, color: P }
    ];

    function drawSword(cx, cy) {
        const h = Math.min(height * 0.55, 360), w = h * 0.12;
        const glow = 18 + Math.sin(frame * 0.03) * 6;
        ctx.save();
        ctx.shadowBlur = glow;
        ctx.shadowColor = `rgba(${S.r}, ${S.g}, ${S.b}, 0.6)`;
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.85)`;
        ctx.beginPath();
        ctx.moveTo(cx, cy - h * 0.5);
        ctx.lineTo(cx + w * 0.5, cy + h * 0.35);
        ctx.lineTo(cx, cy + h * 0.42);
        ctx.lineTo(cx - w * 0.5, cy + h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = glow * 0.5;
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.9)`;
        ctx.fillRect(cx - w * 1.4, cy + h * 0.38, w * 2.8, h * 0.045);
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.7)`;
        ctx.fillRect(cx - w * 0.25, cy + h * 0.43, w * 0.5, h * 0.12);
        ctx.restore();
    }

    function drawRunes(cx, cy, radius) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(frame * 0.003);
        ctx.font = '16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        runeGlyphs.forEach(r => {
            const pulse = 0.5 + Math.sin(frame * 0.04 + r.offset * 4) * 0.35;
            ctx.save();
            ctx.translate(Math.cos(r.angle) * radius, Math.sin(r.angle) * radius);
            ctx.rotate(r.angle + Math.PI / 2);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${pulse * 0.7})`;
            ctx.fillText(r.char, 0, 0);
            ctx.restore();
        });
        ctx.restore();
    }

    function drawAurora() {
        auroraBands.forEach((band, idx) => {
            const yCenter = height * band.yBase;
            ctx.beginPath();
            ctx.moveTo(0, yCenter);
            for (let x = 0; x <= width; x += 40) {
                const y = yCenter
                    + Math.sin(x * 0.004 + band.phase + frame * band.speed) * band.amplitude
                    + Math.sin(x * 0.012 + frame * band.speed * 1.5) * band.amplitude * 0.35;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            const c = band.color;
            const grad = ctx.createLinearGradient(0, yCenter - 60, 0, height);
            grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
            grad.addColorStop(0.25, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.06 + idx * 0.02})`);
            grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
            ctx.fillStyle = grad;
            ctx.fill();
        });
    }

    function drawSparks() {
        sparks.forEach(s => {
            s.y += s.vy;
            s.x += s.vx + Math.sin(frame * 0.02 + s.life * 6) * 0.2;
            s.life -= 0.005;
            if (s.life <= 0 || s.y < -20) {
                s.y = height + Math.random() * 80;
                s.x = Math.random() * width;
                s.life = 1;
            }
            ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.life * 0.7})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.48;
        const radius = Math.min(width, height) * 0.28;
        drawAurora();
        drawRunes(cx, cy, radius);
        drawSword(cx, cy);
        drawSparks();
        frame++;
        requestAnimationFrame(draw);
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5, cy = height * 0.48;
        drawAurora();
        drawRunes(cx, cy, Math.min(width, height) * 0.28);
        drawSword(cx, cy);
    }

    if (prefersReducedMotion) drawStatic();
    else draw();
})();
