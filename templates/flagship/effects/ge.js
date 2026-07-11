// Gē — primordial Greek earth: breathing strata, drifting pollen, and a pulsing life-seed
(function() {
    const canvas = document.getElementById('ge-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, cssWidth, cssHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return null;
        const n = parseInt(hex.slice(1), 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const fallbackPrimary = '#5D4A35';   // deep loam
    const fallbackSecondary = '#A9C46C'; // moss / young wheat
    const primaryAttr = canvas.getAttribute('data-primary');
    const secondaryAttr = canvas.getAttribute('data-secondary');
    const P = hexToRgb(primaryAttr) || hexToRgb(fallbackPrimary);
    const S = hexToRgb(secondaryAttr) || hexToRgb(fallbackSecondary);

    function resize() {
        cssWidth = canvas.clientWidth || window.innerWidth;
        cssHeight = canvas.clientHeight || window.innerHeight;
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        width = cssWidth;
        height = cssHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const layers = 5;
    const particles = [];
    const PARTICLE_COUNT = 60;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vx: (Math.random() - 0.5) * 0.25,
            vy: -Math.random() * 0.4 - 0.1,
            size: Math.random() * 1.6 + 0.4,
            alpha: Math.random() * 0.5 + 0.2,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawHills(time) {
        for (let i = 0; i < layers; i++) {
            const yBase = height * (0.55 + i * 0.11);
            const amp = 18 + i * 8;
            const freq = 0.002 + i * 0.0006;
            const speed = 0.0003 + i * 0.0001;
            const alpha = 0.08 + (layers - i) * 0.04;

            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 8) {
                const y = yBase
                    + Math.sin(x * freq + time * speed + i) * amp
                    + Math.sin(x * freq * 2.3 + time * speed * 1.4) * amp * 0.4;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${alpha})`;
            ctx.fill();
        }
    }

    function drawSeed(time) {
        const cx = width * 0.5;
        const cy = height * 0.62;
        const pulse = Math.sin(time * 0.002) * 4;
        const radius = Math.min(width, height) * 0.08 + pulse;

        const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
        grad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.35)`);
        grad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawParticles(time) {
        particles.forEach(p => {
            if (!prefersReducedMotion) {
                p.x += p.vx + Math.sin(time * 0.001 + p.phase) * 0.15;
                p.y += p.vy;
                if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
            }
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);
        drawHills(time);
        drawSeed(time);
        drawParticles(time);
        frame++;
        if (!prefersReducedMotion) requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
