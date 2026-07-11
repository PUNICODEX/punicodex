// Tiāndì — Heaven and Earth, cosmic order
(function() {
    const canvas = document.getElementById('tiandi-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width, height, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function hexToRgb(hex) {
        const clean = hex.replace(/^#/, '');
        const n = parseInt(clean, 16);
        if (clean.length === 3) {
            return {
                r: ((n >> 8) & 15) * 17,
                g: ((n >> 4) & 15) * 17,
                b: (n & 15) * 17
            };
        }
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const value = canvas.getAttribute(attr);
        return value ? hexToRgb(value) : hexToRgb(fallback);
    }

    // Heaven: celestial azure; Earth: imperial gold
    const heaven = readColor('data-primary', '#3A6E9E');
    const earth = readColor('data-secondary', '#D4A843');

    const stars = [];
    const streams = [];

    function resetElements() {
        stars.length = 0;
        for (let i = 0; i < 64; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.5,
                size: Math.random() * 1.4 + 0.4,
                phase: Math.random() * Math.PI * 2
            });
        }

        streams.length = 0;
        const streamCount = Math.max(3, Math.floor(width / 220));
        for (let i = 0; i < streamCount; i++) {
            streams.push({
                x: width * ((i + 1) / (streamCount + 1)),
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.8 + 0.4
            });
        }
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        resetElements();
    }

    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    function drawHeaven() {
        const grad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        grad.addColorStop(0, `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, 0.35)`);
        grad.addColorStop(1, `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height * 0.6);

        const cx = width * 0.5;
        const cy = height * 0.28;
        const r = Math.min(width, height) * 0.18;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.08);
        ctx.strokeStyle = `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, 0.18)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        stars.forEach(s => {
            const alpha = Math.max(0.05, 0.25 + Math.sin(time * 2 + s.phase) * 0.2);
            ctx.fillStyle = `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, ${alpha})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });
    }

    function drawEarth() {
        const baseY = height * 0.78;
        ctx.fillStyle = `rgba(${earth.r}, ${earth.g}, ${earth.b}, 0.15)`;
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 40) {
            const n = Math.sin(x * 0.008 + time * 0.4) * 18 + Math.sin(x * 0.02 - time * 0.2) * 8;
            ctx.lineTo(x, baseY + n);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(${earth.r}, ${earth.g}, ${earth.b}, 0.35)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 40) {
            const n = Math.sin(x * 0.008 + time * 0.4) * 18 + Math.sin(x * 0.02 - time * 0.2) * 8;
            if (x === 0) ctx.moveTo(x, baseY + n);
            else ctx.lineTo(x, baseY + n);
        }
        ctx.stroke();
    }

    function drawQiStreams() {
        streams.forEach(s => {
            const x = s.x + Math.sin(time * 0.6 + s.phase) * width * 0.025;
            const grad = ctx.createLinearGradient(x, 0, x, height);
            grad.addColorStop(0, `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, 0)`);
            grad.addColorStop(0.45, `rgba(${heaven.r}, ${heaven.g}, ${heaven.b}, 0.18)`);
            grad.addColorStop(0.55, `rgba(${earth.r}, ${earth.g}, ${earth.b}, 0.18)`);
            grad.addColorStop(1, `rgba(${earth.r}, ${earth.g}, ${earth.b}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let y = 0; y <= height; y += 8) {
                const wave = Math.sin(y * 0.025 - time * s.speed * 3 + s.phase) * (6 + y / height * 10);
                if (y === 0) ctx.moveTo(x + wave, y);
                else ctx.lineTo(x + wave, y);
            }
            ctx.stroke();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawHeaven();
        drawQiStreams();
        drawEarth();
        if (!prefersReducedMotion) time += 0.01;
        requestAnimationFrame(draw);
    }

    draw();
})();
