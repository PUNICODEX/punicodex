// Arachnē — the weaver's web: radial silk threads, drifting dew, slow loom-turn
(function() {
    const canvas = document.getElementById('arachne-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute('data-' + attr);
        return val && val[0] === '#' ? hexToRgb(val) : hexToRgb(fallback);
    }

    const primary = readColor('primary', '#8B5A2B');   // aged bronze / terracotta
    const secondary = readColor('secondary', '#E6D8AD'); // raw silk

    let width, height, dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    let frame = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const rings = 7;
    const spokes = 16;
    const droplets = [];
    for (let i = 0; i < 28; i++) {
        droplets.push({
            ring: 1 + Math.floor(Math.random() * (rings - 1)),
            spoke: Math.floor(Math.random() * spokes),
            offset: Math.random() * Math.PI * 2,
            size: Math.random() * 1.8 + 0.7,
            speed: Math.random() * 0.4 + 0.2
        });
    }

    function radialPoint(cx, cy, radius, angle) {
        return {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        };
    }

    function silkStroke(x1, y1, x2, y2, alpha) {
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0)`);
        grad.addColorStop(0.5, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        grad.addColorStop(1, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function drawWeb(cx, cy, maxRadius, time) {
        const rotation = reduceMotion ? 0 : time * 0.015;

        // radial spokes
        for (let s = 0; s < spokes; s++) {
            const a = (s / spokes) * Math.PI * 2 + rotation;
            const outer = radialPoint(cx, cy, maxRadius, a);
            silkStroke(cx, cy, outer.x, outer.y, 0.18);
        }

        // concentric threads with a woven wobble
        for (let r = 1; r <= rings; r++) {
            const radius = (maxRadius / rings) * r;
            const weave = reduceMotion ? 0 : Math.sin(time * 0.03 + r) * 4;
            ctx.beginPath();
            for (let s = 0; s <= spokes; s++) {
                const a = (s / spokes) * Math.PI * 2 + rotation;
                const rr = radius + weave * Math.sin(s * 1.5);
                const p = radialPoint(cx, cy, rr, a);
                if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            silkStroke(cx, cy, cx + radius, cy, 0.12 + (rings - r) * 0.02);
        }
    }

    function drawDroplets(cx, cy, maxRadius, time) {
        droplets.forEach(d => {
            const ringRadius = (maxRadius / rings) * d.ring;
            const a = (d.spoke / spokes) * Math.PI * 2 + (reduceMotion ? 0 : time * 0.015);
            const weave = reduceMotion ? 0 : Math.sin(time * 0.03 + d.ring) * 4;
            const p = radialPoint(cx, cy, ringRadius + weave * Math.sin(d.spoke * 1.5), a);
            const shimmer = 0.35 + Math.sin(time * d.speed + d.offset) * 0.25;
            ctx.fillStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${Math.max(0.1, shimmer)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.45;
        const maxRadius = Math.min(width, height) * 0.55;

        // faint radial loom glow behind the web
        const glow = ctx.createRadialGradient(cx, cy, maxRadius * 0.2, cx, cy, maxRadius * 0.9);
        glow.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
        glow.addColorStop(0.6, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.05)`);
        glow.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        drawWeb(cx, cy, maxRadius, frame);
        drawDroplets(cx, cy, maxRadius, frame);

        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
