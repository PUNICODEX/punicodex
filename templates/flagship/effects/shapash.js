// Shapash — Phoenician sun disk, rotating rays, and solar wind
(function () {
    const canvas = document.getElementById('shapash-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr;
    let frame = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute('data-' + attr);
        if (val && /^#[0-9A-Fa-f]{6}$/.test(val)) return hexToRgb(val);
        return hexToRgb(fallback);
    }

    const P = readColor('primary', '#E6A817');
    const S = readColor('secondary', '#C2410C');

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

    const PARTICLE_COUNT = 90;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            a: Math.random() * Math.PI * 2,
            r: 70 + Math.random() * Math.min(width, height) * 0.42,
            speed: 0.0002 + Math.random() * 0.0005,
            size: Math.random() * 1.8 + 0.4,
            alpha: Math.random() * 0.55 + 0.2,
            color: Math.random() > 0.35 ? P : S
        });
    }

    const rayCount = 18;

    function draw() {
        ctx.clearRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.42;
        const time = frame * 0.008;
        const baseRadius = Math.min(width, height) * 0.13;
        const pulse = Math.sin(time * 0.7) * baseRadius * 0.04;

        // Horizon glow
        const horizon = ctx.createRadialGradient(cx, height, 0, cx, height, width * 0.8);
        horizon.addColorStop(0, `rgba(${S.r},${S.g},${S.b},0.16)`);
        horizon.addColorStop(1, `rgba(${S.r},${S.g},${S.b},0)`);
        ctx.fillStyle = horizon;
        ctx.fillRect(0, 0, width, height);

        // Rotating rays
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.12);
        ctx.strokeStyle = `rgba(${P.r},${P.g},${P.b},0.10)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const len = baseRadius * 1.7 + Math.sin(time + i) * 18;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * baseRadius * 0.85, Math.sin(angle) * baseRadius * 0.85);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();

        // Outer corona rings
        for (let i = 3; i > 0; i--) {
            const g = ctx.createRadialGradient(cx, cy, baseRadius * 0.6, cx, cy, baseRadius * (1.2 + i * 0.25) + pulse);
            g.addColorStop(0, `rgba(${P.r},${P.g},${P.b},0)`);
            g.addColorStop(0.5, `rgba(${P.r},${P.g},${P.b},${0.05 / i})`);
            g.addColorStop(1, `rgba(${P.r},${P.g},${P.b},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius * (1.4 + i * 0.3) + pulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sun disk
        const diskGrad = ctx.createRadialGradient(
            cx - baseRadius * 0.25,
            cy - baseRadius * 0.25,
            baseRadius * 0.1,
            cx,
            cy,
            baseRadius + pulse
        );
        diskGrad.addColorStop(0, 'rgb(255,244,210)');
        diskGrad.addColorStop(0.45, `rgb(${P.r},${P.g},${P.b})`);
        diskGrad.addColorStop(1, `rgb(${S.r},${S.g},${S.b})`);
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Surface flares
        ctx.strokeStyle = 'rgba(255,244,210,0.32)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const f = time * 0.5 + i * 1.3;
            const fx = cx + Math.cos(f) * baseRadius * 0.55;
            const fy = cy + Math.sin(f * 1.3) * baseRadius * 0.55;
            ctx.beginPath();
            ctx.arc(fx, fy, baseRadius * (0.14 + Math.sin(f * 2) * 0.04), 0, Math.PI * 2);
            ctx.stroke();
        }

        // Solar wind particles
        particles.forEach(p => {
            if (!prefersReducedMotion) p.a += p.speed;
            const px = cx + Math.cos(p.a) * p.r;
            const py = cy + Math.sin(p.a) * p.r * 0.35;
            ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
