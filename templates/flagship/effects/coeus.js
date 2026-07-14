// Koîos — rotating celestial sphere, axis lines, star nodes, cosmic geometry
(function() {
    const canvas = document.getElementById('coeus-hero-canvas');
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

    const P = readColor('data-primary', '#D4AF37');   // gold
    const S = readColor('data-secondary', '#4169E1'); // celestial blue

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

    const cx = width * 0.5;
    const cy = height * 0.5;
    const radius = Math.min(width, height) * 0.32;

    const stars = [];
    const STAR_COUNT = width < 600 ? 50 : 100;
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.4 + 0.1,
            twinkle: Math.random() * Math.PI * 2
        });
    }

    const axisNodes = [];
    for (let lat = -2; lat <= 2; lat++) {
        for (let lon = 0; lon < 12; lon++) {
            axisNodes.push({ lat: lat * 0.35, lon: lon * (Math.PI * 2 / 12) });
        }
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Cosmic background
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
        bg.addColorStop(0, `rgba(${S.r * 0.1}, ${S.g * 0.1}, ${S.b * 0.2}, 0.55)`);
        bg.addColorStop(0.6, 'rgba(6, 8, 18, 0.9)');
        bg.addColorStop(1, 'rgba(2, 3, 8, 0.98)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Background stars
        stars.forEach(s => {
            const tw = prefersReduced ? 0 : Math.sin(time * 0.02 + s.twinkle) * 0.25;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, s.alpha + tw)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        const rotation = prefersReduced ? 0.2 : time * 0.002;

        // Axis lines
        ctx.strokeStyle = `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`;
        ctx.lineWidth = 1;
        // Vertical axis
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius * 1.3);
        ctx.lineTo(cx, cy + radius * 1.3);
        ctx.stroke();
        // Equatorial plane ellipse
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.scale(1, 0.42);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Celestial sphere rings
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation * (i + 1) * 0.6 + i);
            ctx.scale(1, 0.25 + i * 0.12);
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${0.12 - i * 0.03})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius * (0.6 + i * 0.25), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Axis nodes projected onto sphere
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.85)`;
        axisNodes.forEach(n => {
            const lat = n.lat;
            const lon = n.lon + rotation;
            const r = radius * Math.cos(lat);
            const x = cx + r * Math.cos(lon);
            const y = cy + radius * Math.sin(lat) * 0.5;
            const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist < radius * 0.96) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Central polar axis glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.4);
        glow.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, 0.35)`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
