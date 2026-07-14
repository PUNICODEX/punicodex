// Itzpapālōtl — obsidian-wing fragments, starfield behind black wings, glowing teal veins, ember particles
(function() {
    const canvas = document.getElementById('itzpapalotl-hero-canvas');
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

    const P = readColor('data-primary', '#4B0082');   // deep obsidian purple
    const S = readColor('data-secondary', '#00CED1'); // teal veins

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

    const stars = [];
    const STAR_COUNT = width < 600 ? 60 : 120;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.2 + 0.3,
            alpha: Math.random() * 0.5 + 0.15,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const wingFragments = [];
    const WING_COUNT = width < 768 ? 8 : 14;
    for (let i = 0; i < WING_COUNT; i++) {
        wingFragments.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 30 + Math.random() * 60,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.003,
            driftX: (Math.random() - 0.5) * 0.2,
            driftY: (Math.random() - 0.5) * 0.2,
            opacity: 0.15 + Math.random() * 0.25
        });
    }

    const veins = [];
    const VEIN_COUNT = width < 768 ? 4 : 7;
    for (let i = 0; i < VEIN_COUNT; i++) {
        veins.push({
            x: Math.random() * width,
            y: Math.random() * height,
            points: Array.from({ length: 6 }, () => ({
                dx: (Math.random() - 0.5) * 120,
                dy: (Math.random() - 0.5) * 120
            })),
            phase: Math.random() * Math.PI * 2
        });
    }

    const embers = [];
    const EMBER_COUNT = width < 600 ? 20 : 40;
    for (let i = 0; i < EMBER_COUNT; i++) {
        embers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vy: -0.15 - Math.random() * 0.35,
            vx: (Math.random() - 0.5) * 0.4,
            size: 1 + Math.random() * 2.5,
            alpha: 0.2 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawWing(w) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.angle);
        ctx.fillStyle = `rgba(10, 10, 18, ${w.opacity})`;
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${w.opacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = i * (Math.PI * 2 / 4) + 0.3;
            const r = w.size * (0.5 + Math.random() * 0.1);
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r * 0.6;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // jagged inner cut
        ctx.beginPath();
        ctx.moveTo(-w.size * 0.2, 0);
        ctx.lineTo(w.size * 0.15, -w.size * 0.25);
        ctx.lineTo(w.size * 0.25, w.size * 0.1);
        ctx.closePath();
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${w.opacity * 0.25})`;
        ctx.fill();
        ctx.restore();
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Deep space gradient
        const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.16)`);
        bg.addColorStop(0.6, `rgba(10, 5, 22, 0.92)`);
        bg.addColorStop(1, `rgba(4, 2, 10, 0.98)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Starfield
        stars.forEach(s => {
            const tw = prefersReduced ? 0 : Math.sin(time * 0.03 + s.twinkle) * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, s.alpha + tw)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Wing fragments
        wingFragments.forEach(w => {
            if (!prefersReduced) {
                w.angle += w.spin;
                w.x += w.driftX;
                w.y += w.driftY;
                if (w.x < -80) w.x = width + 80;
                if (w.x > width + 80) w.x = -80;
                if (w.y < -80) w.y = height + 80;
                if (w.y > height + 80) w.y = -80;
            }
            drawWing(w);
        });

        // Glowing teal veins
        veins.forEach(v => {
            const pulse = 0.4 + 0.3 * Math.sin(time * 0.02 + v.phase);
            ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${S.r}, ${S.g}, ${S.b}, 0.5)`;
            ctx.beginPath();
            ctx.moveTo(v.x, v.y);
            v.points.forEach((p, i) => {
                const px = v.x + p.dx + Math.sin(time * 0.01 + i + v.phase) * 10;
                const py = v.y + p.dy + Math.cos(time * 0.01 + i + v.phase) * 10;
                ctx.lineTo(px, py);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        // Ember particles
        embers.forEach(e => {
            if (!prefersReduced) {
                e.y += e.vy;
                e.x += e.vx + Math.sin(time * 0.01 + e.phase) * 0.2;
                if (e.y < -5) { e.y = height + 5; e.x = Math.random() * width; }
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.05 + e.phase);
            ctx.fillStyle = `rgba(255, 100, 60, ${e.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
