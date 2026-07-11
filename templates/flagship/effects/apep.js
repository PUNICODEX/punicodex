// Apep — Egyptian serpent of chaos, darkness, and entropy
(function() {
    const canvas = document.getElementById('apep-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width, height, dpr = 1, frame = 0, running = true;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const hex = canvas.getAttribute(attr);
        return hex && hex.startsWith('#') ? hexToRgb(hex) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#1A0B2E');   // abyssal purple/obsidian
    const S = readColor('data-secondary', '#D4AF37'); // Egyptian gold

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

    const particles = [];
    const PARTICLE_COUNT = 90;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 1.8 + 0.4,
            alpha: Math.random() * 0.35 + 0.05,
            color: Math.random() > 0.75 ? S : P,
            pulse: Math.random() * Math.PI * 2
        });
    }

    function serpentPath(phase, segments) {
        const points = [];
        const yBase = height * 0.55;
        const amplitude = Math.min(height * 0.22, 180);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = t * (width + 120) - 60;
            const wave = Math.sin(t * Math.PI * 3 + phase) * Math.sin(t * Math.PI) * amplitude;
            const secondary = Math.cos(t * Math.PI * 7 - phase * 1.4) * amplitude * 0.35;
            points.push({ x, y: yBase + wave + secondary });
        }
        return points;
    }

    function drawSerpent(points, phase) {
        const bodyColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.75)`;
        const shadowColor = `rgba(${P.r}, ${P.g}, ${P.b}, 0.18)`;

        // Outer shadow coils
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = 34;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();

        // Mid body
        ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, 0.45)`;
        ctx.lineWidth = 18;
        ctx.beginPath();
        points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();

        // Core spine
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();

        // Scales along the body
        const head = points[points.length - 1];
        for (let i = 2; i < points.length - 3; i += 3) {
            const p = points[i];
            const glow = 0.35 + Math.sin(phase * 2 + i * 0.3) * 0.2;
            ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${glow * 0.25})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Head / golden eye
        const headGlow = 0.6 + Math.sin(phase * 3) * 0.3;
        ctx.fillStyle = `rgba(${S.r}, ${S.g}, ${S.b}, ${headGlow})`;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(10, 4, 18, 0.9)`;
        ctx.beginPath();
        ctx.arc(head.x + 2, head.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawParticles() {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;
            p.pulse += 0.04;
            const alpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawVignette() {
        const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.25, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
        grad.addColorStop(0, 'rgba(26, 11, 46, 0)');
        grad.addColorStop(1, 'rgba(10, 4, 18, 0.55)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawVignette();
        const phase = frame * 0.012;
        const points = serpentPath(phase, 160);
        drawSerpent(points, phase);
        drawParticles();
        frame++;
        if (running) requestAnimationFrame(draw);
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        drawVignette();
        const points = serpentPath(0, 160);
        drawSerpent(points, 0);
        drawParticles();
    }

    if (prefersReduced) {
        drawStatic();
    } else {
        draw();
    }
})();
