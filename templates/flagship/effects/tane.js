// Tāne — Polynesian forest canopy, sun shafts, drifting pollen, forest birds
(function() {
    const canvas = document.getElementById('tane-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width, height, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#1B4332');
    const S = readColor('data-secondary', '#E9C46A');

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

    const rays = [];
    const RAY_COUNT = 7;
    for (let i = 0; i < RAY_COUNT; i++) {
        rays.push({
            x: Math.random(),
            width: 60 + Math.random() * 120,
            angle: (Math.random() - 0.5) * 0.04,
            phase: Math.random() * Math.PI * 2,
            speed: 0.0003 + Math.random() * 0.0004
        });
    }

    const spores = [];
    const SPORE_COUNT = prefersReduced ? 0 : 50;
    for (let i = 0; i < SPORE_COUNT; i++) {
        spores.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -0.15 - Math.random() * 0.25,
            size: 0.8 + Math.random() * 1.8,
            alpha: 0.15 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2
        });
    }

    const birds = [];
    const BIRD_COUNT = prefersReduced ? 0 : 5;
    for (let i = 0; i < BIRD_COUNT; i++) {
        birds.push({
            x: -80 - Math.random() * 400,
            y: height * (0.15 + Math.random() * 0.55),
            speed: 0.6 + Math.random() * 0.8,
            wingSpan: 14 + Math.random() * 10,
            phase: Math.random() * Math.PI * 2
        });
    }

    const canopyLeaves = [];
    const CANOPY_COUNT = 24;
    for (let i = 0; i < CANOPY_COUNT; i++) {
        canopyLeaves.push({
            x: Math.random(),
            y: -10 - Math.random() * 60,
            size: 30 + Math.random() * 70,
            phase: Math.random() * Math.PI * 2
        });
    }

    let time = 0;

    function drawCanopy() {
        ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.85)`;
        canopyLeaves.forEach(leaf => {
            const x = leaf.x * width;
            const sway = Math.sin(time * 0.0008 + leaf.phase) * 8;
            ctx.beginPath();
            ctx.ellipse(x + sway, leaf.y + leaf.size * 0.4, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawRays() {
        const baseX = width * 0.55;
        const gradient = ctx.createRadialGradient(baseX, -height * 0.1, 0, baseX, height * 0.4, height * 1.2);
        gradient.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.18)`);
        gradient.addColorStop(0.6, `rgba(${S.r}, ${S.g}, ${S.b}, 0.05)`);
        gradient.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        rays.forEach(ray => {
            const x = ray.x * width;
            const sway = Math.sin(time * ray.speed + ray.phase) * width * 0.04;
            const topX = x + sway;
            const bottomX = topX + Math.sin(ray.angle) * height * 1.2;

            const rayGrad = ctx.createLinearGradient(topX, 0, bottomX, height);
            rayGrad.addColorStop(0, `rgba(${S.r}, ${S.g}, ${S.b}, 0.22)`);
            rayGrad.addColorStop(0.5, `rgba(${S.r}, ${S.g}, ${S.b}, 0.08)`);
            rayGrad.addColorStop(1, `rgba(${S.r}, ${S.g}, ${S.b}, 0)`);

            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(topX - ray.width * 0.5, 0);
            ctx.lineTo(topX + ray.width * 0.5, 0);
            ctx.lineTo(bottomX + ray.width * 1.2, height);
            ctx.lineTo(bottomX - ray.width * 1.2, height);
            ctx.closePath();
            ctx.fill();
        });
    }

    function drawSpores() {
        spores.forEach(s => {
            if (!prefersReduced) {
                s.x += s.vx + Math.sin(time * 0.001 + s.phase) * 0.15;
                s.y += s.vy;
                if (s.y < -10) s.y = height + 10;
                if (s.x < -10) s.x = width + 10;
                if (s.x > width + 10) s.x = -10;
            }
            const twinkle = 0.7 + Math.sin(time * 0.003 + s.phase) * 0.3;
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${s.alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawBirds() {
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.7)`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        birds.forEach(b => {
            if (!prefersReduced) {
                b.x += b.speed;
                if (b.x > width + 80) {
                    b.x = -80 - Math.random() * 200;
                    b.y = height * (0.15 + Math.random() * 0.55);
                }
            }
            const flap = Math.sin(time * 0.008 + b.phase) * b.wingSpan * 0.35;
            ctx.beginPath();
            ctx.moveTo(b.x - b.wingSpan, b.y + flap);
            ctx.quadraticCurveTo(b.x, b.y - b.wingSpan * 0.4, b.x + b.wingSpan, b.y + flap);
            ctx.stroke();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawRays();
        drawSpores();
        drawBirds();
        drawCanopy();
        time += 1;
        requestAnimationFrame(draw);
    }

    draw();
})();
