// Taishang — Celestial Elixir Spiral
// Supreme Unity: two opposing streams of qi coil around a golden core.
(function() {
    const canvas = document.getElementById('taishang-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = 1;
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(value, fallback) {
        if (value && typeof value === 'string' && value.startsWith('#')) {
            return hexToRgb(value);
        }
        return hexToRgb(fallback);
    }

    const P = readColor(canvas.dataset.primary, '#0B3D4C');   // deep daoist teal
    const S = readColor(canvas.dataset.secondary, '#D4AF37'); // immortal gold

    const particles = [];
    const PARTICLE_COUNT = 90;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const stream = i % 2; // 0 = outer primary, 1 = inner secondary
            particles.push({
                stream,
                angle: Math.random() * Math.PI * 2,
                radiusBase: stream === 0 ? 90 + Math.random() * 140 : 40 + Math.random() * 70,
                speed: (stream === 0 ? 0.003 : 0.005) * (Math.random() * 0.5 + 0.75),
                size: Math.random() * 2 + 0.8,
                alpha: Math.random() * 0.4 + 0.25,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.02 + 0.01,
                tail: []
            });
        }
    }

    function rgb(c, a) {
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
    }

    function drawCore(cx, cy, time) {
        const pulse = 1 + Math.sin(time * 1.5) * 0.08;
        const coreR = 18 * pulse;

        // outer halo
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
        halo.addColorStop(0, rgb(S, 0.22));
        halo.addColorStop(0.4, rgb(S, 0.06));
        halo.addColorStop(1, rgb(S, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR * 4, 0, Math.PI * 2);
        ctx.fill();

        // inner glow
        const core = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, 0, cx, cy, coreR);
        core.addColorStop(0, rgb(S, 0.95));
        core.addColorStop(0.6, rgb(S, 0.55));
        core.addColorStop(1, rgb(S, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSpiral(cx, cy, time, color, direction, revs, radiusMax) {
        ctx.strokeStyle = rgb(color, 0.12);
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 160;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const a = time * direction + t * Math.PI * revs;
            const r = 30 + t * radiusMax;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r * 0.55;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawParticle(p, cx, cy, time) {
        p.angle += p.speed * (p.stream === 0 ? 1 : -1);
        p.wobble += p.wobbleSpeed;

        const a = p.angle;
        const r = p.radiusBase + Math.sin(p.wobble) * 12;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.55;

        p.tail.push({ x, y });
        if (p.tail.length > 12) p.tail.shift();

        const color = p.stream === 0 ? P : S;

        // faint tail
        ctx.strokeStyle = rgb(color, p.alpha * 0.25);
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        for (let i = 0; i < p.tail.length - 1; i++) {
            const t = i / (p.tail.length - 1);
            ctx.globalAlpha = t * p.alpha * 0.4;
            if (i === 0) ctx.moveTo(p.tail[i].x, p.tail[i].y);
            else ctx.lineTo(p.tail[i].x, p.tail[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // particle
        ctx.fillStyle = rgb(color, p.alpha);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5;
        const cy = height * 0.48;
        const time = frame * 0.008;

        drawSpiral(cx, cy, time, P, 1, 4, Math.min(width, height) * 0.35);
        drawSpiral(cx, cy, time + Math.PI, S, -1, 3, Math.min(width, height) * 0.22);

        particles.forEach(p => drawParticle(p, cx, cy, time));
        drawCore(cx, cy, time);

        frame++;
        if (!reduced) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', () => {
        resize();
        initParticles();
    });
    initParticles();
    draw();
})();
