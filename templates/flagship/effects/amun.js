// Amun — Hidden sun, Theban wind, and drifting plumes of kingship
(function() {
    const canvas = document.getElementById('amun-hero-canvas');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width, height, cx, cy;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const value = canvas.getAttribute(attr);
        return value && value.startsWith('#') ? hexToRgb(value) : hexToRgb(fallback);
    }

    // Egyptian solar gold and deep lapis/Theban night
    const P = readColor('data-primary', '#D4AF37');
    const S = readColor('data-secondary', '#1E3A5F');

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = width * 0.5;
        cy = height * 0.42;
    }
    resize();
    window.addEventListener('resize', resize);

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Solar rays emanating from the hidden disk
    const rays = [];
    const RAY_COUNT = 26;
    for (let i = 0; i < RAY_COUNT; i++) rays.push({ angle: (Math.PI * 2 / RAY_COUNT) * i, speed: 0.0006 + Math.random() * 0.001, phase: Math.random() * Math.PI * 2, lengthVar: 0.65 + Math.random() * 0.55 });

    // Desert wind particles
    const sands = [];
    const SAND_COUNT = 140;
    for (let i = 0; i < SAND_COUNT; i++) sands.push({ x: Math.random() * width, y: Math.random() * height, vx: 0.25 + Math.random() * 0.9, vy: (Math.random() - 0.5) * 0.25, size: Math.random() * 1.4 + 0.4, alpha: Math.random() * 0.45 + 0.08 });

    // Amun's double-plumed crown feathers drifting on the wind
    const feathers = [];
    const FEATHER_COUNT = 10;
    for (let i = 0; i < FEATHER_COUNT; i++) feathers.push({ x: Math.random() * width, y: Math.random() * height, scale: 0.45 + Math.random() * 0.9, sway: Math.random() * Math.PI * 2, swaySpeed: 0.003 + Math.random() * 0.004, drift: 0.12 + Math.random() * 0.22, alpha: Math.random() * 0.28 + 0.1 });

    let t = 0;

    function drawFeather(x, y, scale, angle, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgb(${P.r}, ${P.g}, ${P.b})`;
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.1)`;
        ctx.lineWidth = 1.2 * scale;
        // right plume
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(7 * scale, -18 * scale, 1 * scale, -44 * scale);
        ctx.quadraticCurveTo(-5 * scale, -18 * scale, 0, 0);
        ctx.fill(); ctx.stroke();
        // left plume
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-7 * scale, -18 * scale, -1 * scale, -44 * scale);
        ctx.quadraticCurveTo(5 * scale, -18 * scale, 0, 0);
        ctx.fill(); ctx.stroke();
        // central quill and solar disk
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0, -16 * scale, 0, -40 * scale);
        ctx.stroke();
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.22)`;
        ctx.beginPath();
        ctx.arc(0, -4 * scale, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        t += 1;
        const breath = 0.52 + Math.sin(t * 0.012) * 0.08;
        // Rotating solar rays
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.00025);
        const rayReach = Math.min(width, height) * 0.58;
        for (let i = 0; i < RAY_COUNT; i++) {
            const r = rays[i];
            const len = rayReach * r.lengthVar * (1 + Math.sin(t * r.speed + r.phase) * 0.1);
            const x2 = Math.cos(r.angle) * len;
            const y2 = Math.sin(r.angle) * len;
            const grad = ctx.createLinearGradient(0, 0, x2, y2);
            grad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${0.2 * breath})`);
            grad.addColorStop(1, `rgba(${P.r}, ${P.g}, ${P.b}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
        // Hidden sun disk — the concealed source of the rays
        const diskR = Math.min(width, height) * 0.11 * (1 + Math.sin(t * 0.008) * 0.025);
        const diskGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, diskR * 2.2);
        diskGrad.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${0.4 * breath})`);
        diskGrad.addColorStop(0.45, `rgba(${S.r}, ${S.g}, ${S.b}, ${0.2 * breath})`);
        diskGrad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, diskR * 2.2, 0, Math.PI * 2);
        ctx.fill();
        // Drifting sand / wind
        ctx.fillStyle = `rgb(${P.r}, ${P.g}, ${P.b})`;
        for (let i = 0; i < SAND_COUNT; i++) {
            const s = sands[i];
            s.x += s.vx;
            s.y += s.vy;
            if (s.x > width + 5) s.x = -5;
            if (s.y > height + 5) s.y = -5;
            if (s.y < -5) s.y = height + 5;
            ctx.globalAlpha = s.alpha * breath;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Floating plumes
        for (let i = 0; i < FEATHER_COUNT; i++) {
            const f = feathers[i];
            f.sway += f.swaySpeed;
            const x = f.x + Math.sin(f.sway) * 35;
            let y = f.y - t * f.drift * 0.15;
            y = ((y % height) + height) % height;
            const angle = Math.cos(f.sway) * 0.18;
            drawFeather(x, y, f.scale, angle, f.alpha * breath);
        }
        if (!reduced) requestAnimationFrame(draw);
    }

    draw();
})();
