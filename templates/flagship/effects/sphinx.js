// Sphĭnx — desert sand dunes, geometric Egyptian lines, lion-eye glow, drifting sand
(function() {
    const canvas = document.getElementById('sphinx-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#D4AF37');   // desert gold
    const S = readColor('data-secondary', '#4169E1'); // lapis/cosmic

    let width, height, dpr;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const dunes = [];
    const DUNE_COUNT = width < 768 ? 3 : 5;
    for (let i = 0; i < DUNE_COUNT; i++) {
        dunes.push({
            y: height * (0.55 + i * 0.12),
            amplitude: 20 + Math.random() * 40,
            frequency: 0.002 + Math.random() * 0.003,
            speed: 0.002 + Math.random() * 0.003,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.2 + (DUNE_COUNT - i) * 0.08
        });
    }

    const sand = [];
    const SAND_COUNT = width < 600 ? 50 : 100;
    for (let i = 0; i < SAND_COUNT; i++) {
        sand.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0.5 + Math.random() * 1.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: 0.6 + Math.random() * 1.4,
            alpha: 0.15 + Math.random() * 0.25
        });
    }

    const lines = [];
    const LINE_COUNT = width < 768 ? 6 : 10;
    for (let i = 0; i < LINE_COUNT; i++) {
        lines.push({
            x1: Math.random() * width,
            y1: Math.random() * height,
            x2: Math.random() * width,
            y2: Math.random() * height,
            alpha: 0.08 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Desert sky gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${S.r * 0.15}, ${S.g * 0.15}, ${S.b * 0.25}, 0.55)`);
        bg.addColorStop(0.5, `rgba(${P.r * 0.3}, ${P.g * 0.25}, ${P.b * 0.12}, 0.65)`);
        bg.addColorStop(1, `rgba(${P.r * 0.45}, ${P.g * 0.35}, ${P.b * 0.15}, 0.85)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Geometric Egyptian lines
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`;
        ctx.lineWidth = 1;
        lines.forEach(l => {
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.01 + l.phase);
            ctx.globalAlpha = l.alpha * pulse;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // Sand dunes
        dunes.forEach(d => {
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${d.alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {
                const y = d.y + Math.sin(x * d.frequency + time * d.speed + d.phase) * d.amplitude;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        });

        // Lion-eye glow
        const eyeX = width * 0.5;
        const eyeY = height * 0.42;
        const eyePulse = 0.7 + 0.3 * Math.sin(time * 0.02);
        const eyeGlow = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, 40);
        eyeGlow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${eyePulse})`);
        eyeGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 240, 180, ${eyePulse})`;
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drifting sand
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 1)`;
        sand.forEach(s => {
            if (!prefersReduced) {
                s.x += s.vx;
                s.y += s.vy;
                if (s.x > width + 5) { s.x = -5; s.y = Math.random() * height; }
            }
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
