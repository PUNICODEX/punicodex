// Adamas — unbreakable adamantine lattice, refracted light, diamond facets
(function() {
    const canvas = document.getElementById('adamas-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function attrColor(name, fallback) {
        const value = canvas.getAttribute(name);
        return hexToRgb(value && value.startsWith('#') ? value : fallback);
    }

    const P = attrColor('data-primary', '#0B1A2E');   // obsidian / adamant core
    const S = attrColor('data-secondary', '#4FD1C5'); // diamond refraction

    let width, height, dpr;
    function resize() {
        dpr = window.devicePixelRatio || 1;
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

    function makeFacets() {
        const list = [];
        const count = width < 600 ? 10 : 16;
        for (let i = 0; i < count; i++) {
            list.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 50 + 35,
                n: Math.floor(Math.random() * 3) + 5,
                spin: (Math.random() - 0.5) * 0.001,
                phase: Math.random() * Math.PI * 2,
                glint: Math.random() * Math.PI * 2
            });
        }
        return list;
    }

    const facets = makeFacets();

    const sparkles = [];
    for (let i = 0; i < 40; i++) {
        sparkles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.6 + 0.2
        });
    }

    function polygonPath(r, n) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const a = i * (Math.PI * 2) / n;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r * 0.62;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawFacet(f, t) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.phase + f.spin * t);

        const grad = ctx.createLinearGradient(-f.r, -f.r, f.r, f.r);
        grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.28)`);
        grad.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, 0.08)`);
        grad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0.22)`);

        polygonPath(f.r, f.n);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.32)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // internal facet highlight
        polygonPath(f.r * 0.55, f.n);
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.14)`;
        ctx.stroke();

        // vertex glints
        const glint = Math.max(0, Math.sin(t * 0.002 + f.glint));
        if (glint > 0.65) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(glint - 0.65) * 0.8})`;
            for (let i = 0; i < f.n; i++) {
                const a = i * (Math.PI * 2) / f.n;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * f.r, Math.sin(a) * f.r * 0.62, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawCore(t) {
        const cx = width * 0.5;
        const cy = height * 0.5;
        ctx.save();
        ctx.translate(cx, cy);

        const beams = 10;
        for (let i = 0; i < beams; i++) {
            const a = i * (Math.PI * 2) / beams + t * 0.00008;
            const grad = ctx.createLinearGradient(0, 0, Math.cos(a) * Math.max(width, height) * 0.55, Math.sin(a) * Math.max(width, height) * 0.55);
            grad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`);
            grad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * Math.max(width, height) * 0.55, Math.sin(a) * Math.max(width, height) * 0.55);
            ctx.stroke();
        }

        ctx.rotate(t * 0.00012);
        polygonPath(42, 8);
        const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 42);
        coreGrad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.45)`);
        coreGrad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0.25)`);
        ctx.fillStyle = coreGrad;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    let start = null;
    function draw(timestamp) {
        if (start === null) start = timestamp;
        const t = timestamp - start;

        ctx.clearRect(0, 0, width, height);

        const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.04)`);
        bg.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0.10)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        drawCore(t);
        facets.forEach(f => drawFacet(f, t));

        sparkles.forEach(s => {
            const pulse = Math.max(0, Math.sin(t * 0.0035 + s.phase));
            if (pulse > 0.55) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(pulse - 0.55) * s.alpha})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
