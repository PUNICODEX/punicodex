// Andromedē — chains by the sea, stars of the constellation
(function() {
    const canvas = document.getElementById('andromeda-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = window.devicePixelRatio || 1;
    let frame = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#1E3A5F');   // deep Aegean sea
    const S = readColor('data-secondary', '#C9A227'); // golden chain and stars

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    const STAR_COUNT = 90;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.55,
            size: Math.random() * 1.4 + 0.4,
            alpha: Math.random() * 0.5 + 0.2,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const links = [];
    const LINK_COUNT = 28;
    for (let i = 0; i < LINK_COUNT; i++) {
        links.push({
            t: i / (LINK_COUNT - 1),
            offset: Math.random() * Math.PI * 2,
            size: 9 + Math.random() * 4
        });
    }

    function drawLink(x, y, size, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.5)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(-size * 0.45, 0, size * 0.55, size * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(size * 0.45, 0, size * 0.55, size * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function chainY(t, sway) {
        const x = t * width;
        const sag = Math.sin(t * Math.PI) * height * 0.18;
        const wave = Math.sin(t * Math.PI * 3 + sway) * height * 0.03;
        return height * 0.4 + sag + wave;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Sea gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.12)`);
        grad.addColorStop(0.55, `rgba(${P.r}, ${P.g}, ${P.b}, 0.32)`);
        grad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0.58)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Constellation stars
        stars.forEach(s => {
            const tw = prefersReduced ? 0 : Math.sin(frame * 0.02 + s.twinkle);
            const a = Math.max(0, s.alpha + tw * 0.18);
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${a})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Faint constellation outline
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.08)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < stars.length - 1; i += 7) {
            const a = stars[i];
            const b = stars[(i + 3) % stars.length];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();

        // Heavy chain draped across the hero
        const sway = frame * 0.012;
        for (let i = 0; i < links.length - 1; i++) {
            const a = links[i];
            const b = links[i + 1];
            const x1 = a.t * width;
            const y1 = chainY(a.t, sway + a.offset);
            const x2 = b.t * width;
            const y2 = chainY(b.t, sway + b.offset);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            drawLink((x1 + x2) / 2, (y1 + y2) / 2, a.size, angle);
        }

        // Rocky shore she was chained to
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.78)`;
        ctx.beginPath();
        ctx.moveTo(width * 0.32, height);
        ctx.lineTo(width * 0.4, height * 0.76);
        ctx.lineTo(width * 0.5, height * 0.7);
        ctx.lineTo(width * 0.6, height * 0.76);
        ctx.lineTo(width * 0.68, height);
        ctx.closePath();
        ctx.fill();

        frame++;
        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
