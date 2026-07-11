// Iris — rainbow bridge and messenger sparks
(function() {
    const canvas = document.getElementById('iris-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = 1;
    let frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const primary = canvas.dataset.primary ? hexToRgb(canvas.dataset.primary) : hexToRgb('#7C3AED');
    const secondary = canvas.dataset.secondary ? hexToRgb(canvas.dataset.secondary) : hexToRgb('#FBBF24');

    function lerp(a, b, t) { return a + (b - a) * t; }
    function lerpColor(c1, c2, t) {
        return {
            r: Math.round(lerp(c1.r, c2.r, t)),
            g: Math.round(lerp(c1.g, c2.g, t)),
            b: Math.round(lerp(c1.b, c2.b, t))
        };
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    const arcs = [];
    const ARC_COUNT = 7;
    for (let i = 0; i < ARC_COUNT; i++) {
        arcs.push({
            amplitude: 24 + i * 10,
            frequency: 0.0018 + i * 0.0004,
            phase: i * 0.9,
            speed: 0.002 + i * 0.0006,
            thickness: 1.5 + i * 0.5,
            alpha: 0.12 + i * 0.04
        });
    }

    const messengers = [];
    const MESSENGER_COUNT = 20;
    for (let i = 0; i < MESSENGER_COUNT; i++) {
        messengers.push({
            arcIndex: i % ARC_COUNT,
            progress: Math.random(),
            speed: 0.0004 + Math.random() * 0.0006,
            size: 1.2 + Math.random() * 1.8,
            alpha: 0.4 + Math.random() * 0.5,
            drift: Math.random() * Math.PI * 2
        });
    }

    function arcY(x, arc) {
        const t = x * arc.frequency + arc.phase + frame * arc.speed;
        return height * 0.55 + Math.sin(t) * arc.amplitude;
    }

    function drawArc(arc, color) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
            const y = arcY(x, arc);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${arc.alpha})`;
        ctx.lineWidth = arc.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function drawMessenger(m) {
        const arc = arcs[m.arcIndex];
        const x = m.progress * width;
        const baseY = arcY(x, arc);
        const y = baseY + Math.sin(m.progress * Math.PI * 5 + m.drift + frame * 0.04) * 6;
        const color = lerpColor(primary, secondary, m.progress);

        const glow = ctx.createRadialGradient(x, y, 0, x, y, m.size * 5);
        glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${m.alpha})`);
        glow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, m.size, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        arcs.forEach((arc, i) => {
            const t = i / Math.max(1, ARC_COUNT - 1);
            drawArc(arc, lerpColor(primary, secondary, t));
        });

        if (!prefersReducedMotion) {
            messengers.forEach(m => {
                m.progress += m.speed;
                if (m.progress > 1) m.progress = 0;
                drawMessenger(m);
            });

            const shimmer = ctx.createLinearGradient(0, 0, width, height);
            const shimmerAlpha = 0.02 + Math.sin(frame * 0.008) * 0.008;
            shimmer.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
            shimmer.addColorStop(0.5, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${shimmerAlpha})`);
            shimmer.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
            ctx.fillStyle = shimmer;
            ctx.fillRect(0, 0, width, height);

            frame++;
            requestAnimationFrame(draw);
        }
    }

    draw();
})();
