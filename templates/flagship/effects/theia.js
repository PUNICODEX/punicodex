// Theía — Titaness of Sight: a luminous aether-eye of drifting radiance
(function() {
    const canvas = document.getElementById('theia-hero-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;

    let width, height, dpr = 1;
    let reducedMotion = false;

    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function readColor(attr, fallback) {
        const v = canvas.getAttribute(attr);
        return v && v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
    }

    const P = readColor('data-primary', '#D4AF37');   // aether gold
    const S = readColor('data-secondary', '#87CEEB'); // sky light

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

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

    const motes = [];
    const MOTE_COUNT = 90;
    for (let i = 0; i < MOTE_COUNT; i++) {
        motes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            r: Math.random() * 1.8 + 0.4,
            alpha: Math.random() * 0.5 + 0.15,
            pulse: Math.random() * Math.PI * 2
        });
    }

    const rayCount = 18;
    let time = 0;

    function rgb(c) {
        return `${c.r}, ${c.g}, ${c.b}`;
    }

    function drawRings(cx, cy) {
        const maxR = Math.max(width, height) * 0.55;
        const ringCount = 5;
        for (let i = 0; i < ringCount; i++) {
            const t = (time * 0.15 + i / ringCount) % 1;
            const r = t * maxR;
            const a = 0.18 * (1 - t);
            ctx.strokeStyle = `rgba(${rgb(P)}, ${a})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawIris(cx, cy) {
        const baseR = Math.min(width, height) * 0.12;
        const gradient = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR);
        gradient.addColorStop(0, `rgba(${rgb(S)}, 0.35)`);
        gradient.addColorStop(0.5, `rgba(${rgb(P)}, 0.18)`);
        gradient.addColorStop(1, `rgba(${rgb(P)}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy, baseR, baseR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${rgb(S)}, 0.22)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, baseR * 0.65, baseR * 0.26, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawRays(cx, cy) {
        const maxLen = Math.max(width, height) * 0.65;
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + time * 0.03;
            const len = maxLen * (0.7 + 0.3 * Math.sin(time * 0.5 + i));
            const a = 0.06 + 0.04 * Math.sin(time * 0.7 + i * 0.8);
            const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
            grad.addColorStop(0, `rgba(${rgb(P)}, ${a})`);
            grad.addColorStop(1, `rgba(${rgb(P)}, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawMotes() {
        motes.forEach(m => {
            m.pulse += reducedMotion ? 0.02 : 0.05;
            if (!reducedMotion) {
                m.x += m.vx;
                m.y += m.vy;
                if (m.x < -10) m.x = width + 10;
                if (m.x > width + 10) m.x = -10;
                if (m.y < -10) m.y = height + 10;
                if (m.y > height + 10) m.y = -10;
            }
            const alpha = m.alpha * (0.6 + 0.4 * Math.sin(m.pulse));
            ctx.fillStyle = `rgba(${rgb(P)}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.5;
        const cy = height * 0.45;

        drawRays(cx, cy);
        drawRings(cx, cy);
        drawIris(cx, cy);
        drawMotes();

        if (!reducedMotion) time += 1;
        requestAnimationFrame(draw);
    }

    draw();
})();
