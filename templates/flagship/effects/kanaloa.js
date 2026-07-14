// Kānāloa — deep ocean caustics, bioluminescent particles, tentacle-like currents, abyssal blue
(function() {
    const canvas = document.getElementById('kanaloa-hero-canvas');
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

    const P = readColor('data-primary', '#1E90FF');   // abyssal blue
    const S = readColor('data-secondary', '#FF7F50'); // coral bioluminescence

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

    const currents = [];
    const CURRENT_COUNT = width < 768 ? 5 : 9;
    for (let i = 0; i < CURRENT_COUNT; i++) {
        currents.push({
            x: Math.random() * width,
            y: Math.random() * height,
            amplitude: 30 + Math.random() * 50,
            frequency: 0.004 + Math.random() * 0.006,
            speed: 0.008 + Math.random() * 0.012,
            phase: Math.random() * Math.PI * 2,
            length: Math.min(width * 0.6, 400 + Math.random() * 300),
            alpha: 0.08 + Math.random() * 0.12
        });
    }

    const particles = [];
    const PARTICLE_COUNT = width < 600 ? 40 : 80;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: 0.8 + Math.random() * 2.2,
            alpha: 0.2 + Math.random() * 0.35,
            color: Math.random() > 0.6 ? S : P,
            phase: Math.random() * Math.PI * 2
        });
    }

    const caustics = [];
    const CAUSTIC_COUNT = width < 768 ? 4 : 7;
    for (let i = 0; i < CAUSTIC_COUNT; i++) {
        caustics.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            r: 40 + Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.05 + Math.random() * 0.08
        });
    }

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, width, height);
        frame++;
        const time = frame;

        // Abyssal gradient
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, `rgba(${P.r * 0.1}, ${P.g * 0.2}, ${P.b * 0.35}, 0.9)`);
        bg.addColorStop(0.5, `rgba(2, 8, 22, 0.95)`);
        bg.addColorStop(1, `rgba(1, 4, 12, 0.98)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Caustic light pools
        caustics.forEach(c => {
            const pulse = 0.7 + 0.3 * Math.sin(time * 0.01 + c.phase);
            const gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            gr.addColorStop(0, `rgba(${P.r}, ${P.g}, ${P.b}, ${c.alpha * pulse})`);
            gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // Tentacle-like currents
        currents.forEach(c => {
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${c.alpha})`;
            ctx.lineWidth = 18;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i <= 40; i++) {
                const t = i / 40;
                const x = c.x + (t - 0.5) * c.length;
                const y = c.y + Math.sin(x * c.frequency + time * c.speed + c.phase) * c.amplitude;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Bioluminescent particles
        particles.forEach(p => {
            if (!prefersReduced) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10;
                if (p.y > height + 10) p.y = -10;
            }
            const pulse = 0.6 + 0.4 * Math.sin(time * 0.03 + p.phase);
            ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * pulse})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.4)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        if (!prefersReduced) requestAnimationFrame(draw);
    }

    draw();
})();
