// Jǫrmungandr — the World Serpent coiling through the deep
(function () {
    const canvas = document.getElementById('jormungandr-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgb(c, a) {
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
    }

    const primary = hexToRgb(canvas.dataset.primary || '#0F3D3E');
    const secondary = hexToRgb(canvas.dataset.secondary || '#6EE7B7');

    let width, height, dpr;
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const COILS = 4.5;
    const SPRAY_COUNT = 90;
    const GLOW_COUNT = 36;
    const spray = [];
    const glows = [];

    for (let i = 0; i < SPRAY_COUNT; i++) {
        spray.push({
            angle: Math.random() * Math.PI * 2,
            dist: 40 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.45,
            size: Math.random() * 1.5 + 0.5,
            speed: (Math.random() * 0.001 + 0.0004) * (Math.random() < 0.5 ? 1 : -1),
            alpha: Math.random() * 0.35 + 0.1,
            drift: Math.random() * Math.PI * 2
        });
    }

    for (let i = 0; i < GLOW_COUNT; i++) {
        glows.push({
            t: (i / GLOW_COUNT) * COILS * Math.PI * 2,
            phase: Math.random() * Math.PI * 2,
            size: Math.random() * 2 + 1.5
        });
    }

    function serpentPoint(a, time) {
        const aspect = height / width || 1;
        const maxR = Math.min(width, height) * 0.44;
        const r = maxR * (0.55 + 0.45 * (1 - a / (COILS * Math.PI * 2)));
        const rotation = time * 0.06;
        const x = width * 0.5 + Math.cos(a + rotation) * r;
        const y = height * 0.5 + Math.sin(a + rotation) * r * aspect;
        const wave = Math.sin(a * 4 - time * 1.4) * r * 0.04;
        return { x: x + wave, y: y };
    }

    function drawSerpent(time) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Under-glow
        ctx.beginPath();
        for (let a = 0; a <= COILS * Math.PI * 2; a += 0.025) {
            const p = serpentPoint(a, time);
            if (a === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = rgb(primary, 0.22);
        ctx.lineWidth = 28;
        ctx.stroke();

        // Body
        ctx.beginPath();
        for (let a = 0; a <= COILS * Math.PI * 2; a += 0.02) {
            const p = serpentPoint(a, time);
            if (a === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = rgb(primary, 0.55);
        ctx.lineWidth = 10;
        ctx.stroke();

        // Scales / spine lights
        glows.forEach(g => {
            const p = serpentPoint(g.t, time);
            const pulse = 0.6 + 0.4 * Math.sin(time * 2 + g.phase);
            ctx.fillStyle = rgb(secondary, pulse * 0.7);
            ctx.beginPath();
            ctx.arc(p.x, p.y, g.size * pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        // Head
        const head = serpentPoint(COILS * Math.PI * 2, time);
        ctx.fillStyle = rgb(primary, 0.9);
        ctx.beginPath();
        ctx.ellipse(head.x, head.y, 14, 10, time * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgb(secondary, 0.85);
        ctx.beginPath();
        ctx.arc(head.x + 5, head.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        const t = time * 0.001;
        const aspect = height / width || 1;

        // Slow ocean currents
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 6; i++) {
            const a0 = t * 0.15 + i * 1.05;
            const r = 60 + i * 55;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.2) {
                const x = width * 0.5 + Math.cos(a + a0) * r;
                const y = height * 0.5 + Math.sin(a + a0) * r * aspect;
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = rgb(secondary, 0.04);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();

        drawSerpent(t);

        // Floating sea-spray
        spray.forEach(p => {
            const a = p.angle + p.speed * t * 60;
            const wobble = Math.sin(t + p.drift) * 6;
            const x = width * 0.5 + Math.cos(a) * p.dist + wobble;
            const y = height * 0.5 + Math.sin(a) * p.dist * aspect;
            ctx.fillStyle = rgb(secondary, p.alpha);
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReducedMotion) {
            requestAnimationFrame(draw);
        }
    }

    draw(0);
})();
