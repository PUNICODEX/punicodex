// Phoenix — Greek firebird rising from ash and ember
(function () {
    const canvas = document.getElementById('phoenix-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    // Greek phoenix palette: crimson flame and gold ash
    const primary = readColor('data-primary', '#C41E3A');
    const secondary = readColor('data-secondary', '#D4AF37');

    let width, height, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let centerX, centerY, frame = 0;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        centerX = width * 0.5;
        centerY = height * 0.55;
    }
    resize();
    window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); });

    const embers = [];
    const EMBER_COUNT = 90;
    for (let i = 0; i < EMBER_COUNT; i++) {
        embers.push({
            x: Math.random() * (width || 1),
            y: Math.random() * (height || 1),
            vy: -(Math.random() * 0.8 + 0.2),
            vx: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.7 + 0.3,
            fade: Math.random() * 0.005 + 0.002,
            color: Math.random() > 0.4 ? primary : secondary
        });
    }

    function drawWing(side, wingPhase) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        const wingSpan = Math.min(width, height) * 0.45;
        const wingTipX = centerX + wingSpan * Math.cos(wingPhase * 0.5 + 0.2);
        const wingTipY = centerY - wingSpan * 0.5 + Math.sin(wingPhase * 2) * 20;

        ctx.moveTo(centerX, centerY);
        ctx.quadraticCurveTo(
            centerX + wingSpan * 0.35,
            centerY - wingSpan * 0.35 + Math.sin(wingPhase * 3) * 25,
            wingTipX,
            wingTipY
        );
        ctx.quadraticCurveTo(
            centerX + wingSpan * 0.55,
            centerY + wingSpan * 0.1,
            centerX,
            centerY + wingSpan * 0.15
        );
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, wingSpan);
        grad.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.35)`);
        grad.addColorStop(0.6, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.12)`);
        grad.addColorStop(1, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.02)`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    function drawBody(rise) {
        const bodyLen = Math.min(width, height) * 0.22;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + bodyLen * 0.6);
        ctx.quadraticCurveTo(
            centerX + Math.sin(rise) * 12,
            centerY - bodyLen * 0.3,
            centerX,
            centerY - bodyLen * 0.7
        );
        ctx.quadraticCurveTo(
            centerX - Math.sin(rise) * 12,
            centerY - bodyLen * 0.3,
            centerX,
            centerY + bodyLen * 0.6
        );
        const grad = ctx.createLinearGradient(centerX, centerY - bodyLen, centerX, centerY + bodyLen);
        grad.addColorStop(0, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.45)`);
        grad.addColorStop(0.5, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.35)`);
        grad.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.05)`);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    function drawEmbers() {
        embers.forEach(e => {
            e.y += e.vy;
            e.x += e.vx + Math.sin(frame * 0.02 + e.y * 0.01) * 0.2;
            e.alpha -= e.fade;
            if (e.alpha <= 0 || e.y < -10) {
                e.y = height + Math.random() * 30;
                e.x = centerX + (Math.random() - 0.5) * Math.min(width, height) * 0.6;
                e.alpha = Math.random() * 0.7 + 0.3;
                e.vy = -(Math.random() * 0.8 + 0.2);
            }
            ctx.fillStyle = `rgba(${e.color.r}, ${e.color.g}, ${e.color.b}, ${e.alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        if (prefersReducedMotion) {
            ctx.fillStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.08)`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, Math.min(width, height) * 0.25, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const rise = frame * 0.015;
        const wingPhase = frame * 0.012;

        // Distant ash halo
        const halo = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.min(width, height) * 0.5);
        halo.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.10)`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);

        drawBody(rise);
        drawWing(1, wingPhase);
        drawWing(-1, wingPhase);

        drawEmbers();

        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
