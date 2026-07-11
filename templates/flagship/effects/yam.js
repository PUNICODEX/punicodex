// Yam — Canaanite primordial sea: deep waters, coiling serpent, storm foam
(function() {
    const canvas = document.getElementById('yam-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width, height, dpr, frame = 0;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const val = canvas.getAttribute(attr);
        return val && val.startsWith('#') ? hexToRgb(val) : hexToRgb(fallback);
    }

    // Deep sea palette as default (Canaanite primordial waters)
    const P = readColor('data-primary', '#0A2540');
    const S = readColor('data-secondary', '#3EB489');

    const waves = [
        { y: 0.35, amp: 28, freq: 0.004, speed: 0.008, alpha: 0.18, color: P },
        { y: 0.48, amp: 36, freq: 0.003, speed: -0.006, alpha: 0.14, color: S },
        { y: 0.62, amp: 44, freq: 0.0025, speed: 0.005, alpha: 0.10, color: P },
        { y: 0.78, amp: 52, freq: 0.002, speed: -0.004, alpha: 0.08, color: S }
    ];

    const foam = [];
    const FOAM_COUNT = 90;
    for (let i = 0; i < FOAM_COUNT; i++) {
        foam.push({
            x: Math.random(),
            y: Math.random(),
            r: Math.random() * 1.8 + 0.3,
            speed: Math.random() * 0.0004 + 0.0001,
            drift: (Math.random() - 0.5) * 0.0006,
            phase: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.35 + 0.05
        });
    }

    let serpentPhase = 0;
    let flash = 0;

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

    function rgb(c) { return `${c.r}, ${c.g}, ${c.b}`; }

    function drawWaves() {
        waves.forEach(w => {
            ctx.fillStyle = `rgba(${rgb(w.color)}, ${w.alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x <= width; x += 12) {
                const y = height * w.y + Math.sin(x * w.freq + frame * w.speed + w.y * 10) * w.amp;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        });
    }

    function drawSerpent() {
        serpentPhase += prefersReducedMotion ? 0 : 0.004;
        ctx.strokeStyle = `rgba(${rgb(P)}, 0.10)`;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const centerY = height * 0.55;
        const coils = 5;
        for (let t = 0; t <= coils * Math.PI * 2; t += 0.08) {
            const progress = t / (coils * Math.PI * 2);
            const radius = 60 + progress * Math.min(width, height) * 0.32;
            const x = width * 0.5 + Math.cos(t + serpentPhase) * radius;
            const y = centerY + Math.sin(t * 1.2 + serpentPhase) * radius * 0.28;
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // faint spines along the back
        ctx.strokeStyle = `rgba(${rgb(S)}, 0.12)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let t = 0; t <= coils * Math.PI * 2; t += 0.5) {
            const progress = t / (coils * Math.PI * 2);
            const radius = 60 + progress * Math.min(width, height) * 0.32;
            const x = width * 0.5 + Math.cos(t + serpentPhase) * radius;
            const y = centerY + Math.sin(t * 1.2 + serpentPhase) * radius * 0.28;
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(t + serpentPhase + Math.PI / 2) * 18, y - 14);
        }
        ctx.stroke();
    }

    function drawFoam() {
        foam.forEach(f => {
            f.y -= prefersReducedMotion ? 0 : f.speed * height;
            f.x += f.drift;
            f.phase += 0.02;
            if (f.y < 0) {
                f.y = 1;
                f.x = Math.random();
            }
            const fx = f.x * width;
            const fy = f.y * height;
            const pulse = 0.5 + 0.5 * Math.sin(f.phase);
            ctx.fillStyle = `rgba(230, 245, 255, ${f.alpha * pulse})`;
            ctx.beginPath();
            ctx.arc(fx, fy, f.r * (0.8 + pulse * 0.4), 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawLightning() {
        if (prefersReducedMotion) return;
        if (flash <= 0 && Math.random() < 0.003) {
            flash = 1;
        }
        if (flash > 0) {
            ctx.fillStyle = `rgba(220, 240, 255, ${flash * 0.08})`;
            ctx.fillRect(0, 0, width, height);
            flash *= 0.92;
            if (flash < 0.01) flash = 0;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // abyss gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgb(${Math.max(P.r - 20, 0)}, ${Math.max(P.g - 10, 0)}, ${Math.max(P.b + 10, 0)})`);
        grad.addColorStop(1, `rgb(${P.r}, ${P.g}, ${P.b})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        drawSerpent();
        drawWaves();
        drawFoam();
        drawLightning();

        frame++;
        requestAnimationFrame(draw);
    }

    draw();
})();
