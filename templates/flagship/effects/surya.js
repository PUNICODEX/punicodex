// Sūrya — solar mandala: radiant sun-disc, rotating rays, and orbiting light-particles
(function() {
    const canvas = document.getElementById('surya-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = 1, frame = 0;
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        reducedMotion = e.matches;
    });

    function hexToRgb(hex) {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    const primary = hexToRgb(canvas.dataset.primary || '#FF9933');   // Saffron
    const secondary = hexToRgb(canvas.dataset.secondary || '#FFD700'); // Gold

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

    const RAY_COUNT = 28;
    const rays = [];
    for (let i = 0; i < RAY_COUNT; i++) {
        rays.push({
            angle: (i / RAY_COUNT) * Math.PI * 2,
            length: 90 + Math.random() * 110,
            speed: (i % 2 === 0 ? 1 : -1) * (0.0015 + Math.random() * 0.002),
            phase: Math.random() * Math.PI * 2
        });
    }

    const orbits = [];
    for (let i = 0; i < 3; i++) {
        orbits.push({
            radius: 130 + i * 85,
            speed: (i % 2 === 0 ? 1 : -1) * (0.0008 + i * 0.0004),
            offset: i * 1.2,
            particles: 5 + i * 3,
            tilt: i * 0.18
        });
    }

    function drawSun(cx, cy) {
        const corona = ctx.createRadialGradient(cx, cy, 20, cx, cy, 170);
        corona.addColorStop(0, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.45)`);
        corona.addColorStop(0.5, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.18)`);
        corona.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0)`);
        ctx.fillStyle = corona;
        ctx.beginPath(); ctx.arc(cx, cy, 170, 0, Math.PI * 2); ctx.fill();

        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 44);
        core.addColorStop(0, 'rgba(255, 255, 235, 0.95)');
        core.addColorStop(0.55, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.9)`);
        core.addColorStop(1, `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.55)`);
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
    }

    function drawRays(cx, cy, time) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        rays.forEach((ray, i) => {
            const angle = ray.angle + (reducedMotion ? 0 : time * ray.speed);
            const pulse = Math.sin(time * 0.003 + ray.phase) * 0.5 + 0.5;
            const len = ray.length + pulse * 25;
            const alpha = 0.12 + pulse * 0.14;
            ctx.strokeStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`;
            ctx.lineWidth = 1.5 + pulse * 1.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 48, Math.sin(angle) * 48);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        });
        ctx.restore();
    }

    function drawOrbits(cx, cy, time) {
        ctx.save();
        ctx.translate(cx, cy);
        orbits.forEach((orbit, i) => {
            const angle = orbit.offset + (reducedMotion ? 0 : time * orbit.speed);
            ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${0.1 - i * 0.025})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, orbit.radius, orbit.radius * 0.32, orbit.tilt + angle * 0.2, 0, Math.PI * 2);
            ctx.stroke();

            for (let j = 0; j < orbit.particles; j++) {
                const a = angle + (j / orbit.particles) * Math.PI * 2;
                const px = Math.cos(a) * orbit.radius;
                const py = Math.sin(a) * orbit.radius * 0.32;
                const twinkle = Math.sin(time * 0.005 + j + i) * 0.4 + 0.6;
                ctx.fillStyle = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${twinkle})`;
                ctx.beginPath();
                ctx.arc(px, py, 2 + i * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5;
        const cy = height * 0.42;
        drawSun(cx, cy);
        drawRays(cx, cy, frame);
        drawOrbits(cx, cy, frame);
        frame++;
        requestAnimationFrame(draw);
    }
    draw();
})();
