// Thánatos — dark wings unfolding, shadow feathers, pale soul-lights drifting upward, somber
(function() {
    const canvas = document.getElementById('thanatos-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // pale soul light / gold
    const S = readColor('data-secondary', '#4169E1'); // somber shadow

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

    const feathers = [];
    const FEATHER_COUNT = width < 768 ? 16 : 28;
    for (let i = 0; i < FEATHER_COUNT; i++) {
        feathers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 20 + Math.random() * 50,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.004,
            drift: 0.2 + Math.random() * 0.4,
            side: Math.random() > 0.5 ? 1 : -1,
            opacity: 0.08 + Math.random() * 0.12
        });
    }

    const wings = [
        { cx: width * 0.25, cy: height * 0.5, span: Math.min(width, height) * 0.35 },
        { cx: width * 0.75, cy: height * 0.5, span: Math.min(width, height) * 0.35 }
    ];

    const souls = [];
    const SOUL_COUNT = width < 600 ? 18 : 35;
    for (let i = 0; i < SOUL_COUNT; i++) {
        souls.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.3 - Math.random() * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            r: 1.5 + Math.random() * 3,
            alpha: 0.2 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawWing(w, time) {
        ctx.save();
        ctx.translate(w.cx, w.cy);
        const flap = prefersReduced ? 0 : Math.sin(time * 0.004) * 0.06;
        ctx.scale(1 + flap, 1 - flap * 0.5);
        ctx.fillStyle = 'rgba(8, 8, 12, 0.55)';
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const a = (Math.PI * t) - Math.PI * 0.5;
            const r = w.span * (0.3 + 0.7 * Math.sin(t * Math.PI));
            const px = Math.cos(a) * r * (w.cx < width * 0.5 ? -1 : 1);
            const py = Math.sin(a) * r;
            ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // feather barbs
        for (let i = 1; i < 8; i++) {
            const t = i / 8;
            const a = (Math.PI * t) - Math.PI * 0.5;
            const r = w.span * (0.3 + 0.7 * Math.sin(t * Math.PI));
            const sx = Math.cos(a) * r * (w.cx < width * 0.5 ? -1 : 1);
            const sy = Math.sin(a) * r;
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.12)`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(sx * 0.5, sy + 20, sx, sy);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawFeather(f, time) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle + (prefersReduced ? 0 : time * f.spin));
        ctx.fillStyle = `rgba(12, 12, 18, ${f.opacity})`;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${f.opacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(f.size * 0.35 * f.side, -f.size * 0.4, 0, -f.size);
        ctx.quadraticCurveTo(-f.size * 0.35 * f.side, -f.size * 0.4, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Somber background
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${S.r * 0.12}, ${S.g * 0.12}, ${S.b * 0.18}, 0.7)`);
        bg.addColorStop(0.6, 'rgba(10, 10, 14, 0.9)');
        bg.addColorStop(1, 'rgba(4, 4, 6, 0.98)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Shadow wings
        drawWing(wings[0], time);
        drawWing(wings[1], time);

        // Drifting shadow feathers
        feathers.forEach(f => {
            if (!prefersReduced) {
                f.y += f.drift;
                f.angle += f.spin;
                if (f.y > height + 60) { f.y = -60; f.x = Math.random() * width; }
            }
            drawFeather(f, time);
        });

        // Pale soul-lights rising
        souls.forEach(s => {
            if (!prefersReduced) {
                s.y += s.vy;
                s.x += s.vx + Math.sin(time * 0.005 + s.phase) * 0.15;
                if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.03 + s.phase);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${s.alpha * pulse})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.4)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
